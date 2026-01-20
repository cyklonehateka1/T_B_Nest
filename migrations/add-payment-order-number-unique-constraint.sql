-- Migration: Add unique constraint on payments.orderNumber for idempotency
-- Date: 2026-01-19
-- Description: Adds unique constraint on orderNumber to ensure idempotency at database level

-- Check if unique constraint already exists
DO $$ 
BEGIN
    -- Add unique constraint on orderNumber if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'uk_payments_order_number'
    ) THEN
        ALTER TABLE payments
        ADD CONSTRAINT uk_payments_order_number UNIQUE ("orderNumber");
        
        RAISE NOTICE 'Added unique constraint uk_payments_order_number on payments.orderNumber';
    ELSE
        RAISE NOTICE 'Unique constraint uk_payments_order_number already exists';
    END IF;
END $$;

-- Add comment
COMMENT ON CONSTRAINT uk_payments_order_number ON payments IS 'Ensures orderNumber uniqueness for payment idempotency';
