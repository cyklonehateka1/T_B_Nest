-- Migration: Create payments table with polymorphic relationships
-- Date: 2026-01-19
-- Description: Creates the payments table with all fields including payment_type enum,
--              is_payout boolean, and polymorphic relationships (purchase, escrow, recipient)

-- Step 1: Create payment_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE payment_type AS ENUM (
        'TIP_PURCHASE',
        'ESCROW_REFUND',
        'TIPSTER_PAYOUT',
        'PLATFORM_REVENUE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create payment_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending',
        'completed',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Payment type and direction
    type payment_type NOT NULL DEFAULT 'TIP_PURCHASE',
    is_payout BOOLEAN NOT NULL DEFAULT false,
    
    -- Polymorphic relationships
    "purchaseId" UUID,
    "escrowId" UUID,
    "recipientUserId" UUID,
    
    -- Payment details
    "orderNumber" VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    "globalPaymentMethodId" UUID NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    "paymentReference" VARCHAR(255),
    "providerReference" VARCHAR(255),
    "providerStatus" VARCHAR(255),
    "paymentGatewayId" UUID,
    "providerTransactionId" VARCHAR(255),
    "providerPaymentId" VARCHAR(255),
    "checkoutUrl" VARCHAR(255),
    network VARCHAR(255),
    "accountName" VARCHAR(255),
    "accountNumber" VARCHAR(255),
    
    -- JSONB fields
    "callbackData" JSONB,
    "responseData" JSONB,
    
    -- Additional fields
    "errorMessage" TEXT,
    "providerProcessedAt" TIMESTAMP WITH TIME ZONE,
    currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
    reason TEXT,
    "retryCount" INTEGER,
    "lastRetryAt" TIMESTAMP WITH TIME ZONE,
    
    -- Notification tracking
    "emailNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "webhookNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "lastNotificationSentAt" TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_payments_purchase FOREIGN KEY ("purchaseId")
        REFERENCES purchases(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_payments_escrow FOREIGN KEY ("escrowId")
        REFERENCES escrow(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_payments_recipient FOREIGN KEY ("recipientUserId")
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_payments_global_payment_method FOREIGN KEY ("globalPaymentMethodId")
        REFERENCES global_payment_methods(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payments_payment_gateway FOREIGN KEY ("paymentGatewayId")
        REFERENCES payment_gateways(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_purchase_id ON payments("purchaseId");
CREATE INDEX IF NOT EXISTS idx_payments_escrow_id ON payments("escrowId");
CREATE INDEX IF NOT EXISTS idx_payments_recipient_user_id ON payments("recipientUserId");
CREATE INDEX IF NOT EXISTS idx_payments_is_payout ON payments(is_payout);
CREATE INDEX IF NOT EXISTS idx_payments_order_number ON payments("orderNumber");
CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON payments("paymentReference");
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction_id ON payments("providerTransactionId");
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments("createdAt");

-- Step 5: Add comments for documentation
COMMENT ON TABLE payments IS 'Tracks all payment gateway interactions including tip purchases, escrow refunds, and tipster payouts';
COMMENT ON COLUMN payments.type IS 'Type of payment: TIP_PURCHASE, ESCROW_REFUND, TIPSTER_PAYOUT, PLATFORM_REVENUE, or OTHER';
COMMENT ON COLUMN payments.is_payout IS 'true = payout (money going out), false = payin (money coming in)';
COMMENT ON COLUMN payments."purchaseId" IS 'Foreign key to purchases table for TIP_PURCHASE and ESCROW_REFUND payment types';
COMMENT ON COLUMN payments."escrowId" IS 'Foreign key to escrow table for ESCROW_REFUND payment types';
COMMENT ON COLUMN payments."recipientUserId" IS 'Foreign key to users table for TIPSTER_PAYOUT payment types (the recipient of the payout)';

-- Step 6: Create trigger to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();
