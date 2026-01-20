-- Migration: Add polymorphic relationships and fields to payments table
-- Date: 2026-01-19
-- Description: Adds payment_type enum, is_payout boolean, escrowId, and recipientUserId fields to support
--              multiple payment types (TIP_PURCHASE, ESCROW_REFUND, TIPSTER_PAYOUT, etc.)

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

-- Step 2: Add payment_type column (with default for existing rows)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS type payment_type NOT NULL DEFAULT 'TIP_PURCHASE';

-- Step 3: Add is_payout boolean column
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS is_payout BOOLEAN NOT NULL DEFAULT false;

-- Step 4: Add escrowId column (nullable)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS "escrowId" UUID;

-- Step 5: Add recipientUserId column (nullable)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS "recipientUserId" UUID;

-- Step 6: Add foreign key constraint for escrow
ALTER TABLE payments
ADD CONSTRAINT fk_payments_escrow
FOREIGN KEY ("escrowId")
REFERENCES escrow(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 7: Add foreign key constraint for recipient user
ALTER TABLE payments
ADD CONSTRAINT fk_payments_recipient
FOREIGN KEY ("recipientUserId")
REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 8: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
CREATE INDEX IF NOT EXISTS idx_payments_is_payout ON payments(is_payout);
CREATE INDEX IF NOT EXISTS idx_payments_escrow_id ON payments("escrowId");
CREATE INDEX IF NOT EXISTS idx_payments_recipient_user_id ON payments("recipientUserId");

-- Step 9: Add comments for documentation
COMMENT ON COLUMN payments.type IS 'Type of payment: TIP_PURCHASE, ESCROW_REFUND, TIPSTER_PAYOUT, PLATFORM_REVENUE, or OTHER';
COMMENT ON COLUMN payments.is_payout IS 'true = payout (money going out), false = payin (money coming in)';
COMMENT ON COLUMN payments."escrowId" IS 'Foreign key to escrow table for ESCROW_REFUND payment types';
COMMENT ON COLUMN payments."recipientUserId" IS 'Foreign key to users table for TIPSTER_PAYOUT payment types (the recipient of the payout)';

-- Step 10: Update existing payments to have correct is_payout value based on type
-- Note: This assumes existing payments are all TIP_PURCHASE (payin)
UPDATE payments
SET is_payout = false
WHERE is_payout IS NULL OR is_payout = false;
