-- Migration: Update payments.checkoutUrl from VARCHAR(255) to TEXT
-- Reason: Palmpay checkout URLs can exceed 255 characters
-- Date: 2026-01-21

-- Change checkoutUrl column type from VARCHAR(255) to TEXT
-- Note: PostgreSQL requires quotes for camelCase column names
ALTER TABLE payments
ALTER COLUMN "checkoutUrl" TYPE TEXT;

-- Verify the change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'checkoutUrl' 
    AND data_type = 'text'
  ) THEN
    RAISE NOTICE 'Successfully updated payments.checkoutUrl to TEXT type';
  ELSE
    RAISE EXCEPTION 'Failed to update payments.checkoutUrl to TEXT type';
  END IF;
END $$;
