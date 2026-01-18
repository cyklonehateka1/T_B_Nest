-- Migration: Add bank account fields to users table
-- Date: 2026-01-18
-- Description: Adds account_number, account_name, bank_code, and bank_name columns to users table for escrow functionality

-- Add account_number column (unique, nullable)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50) UNIQUE;

-- Add account_name column (nullable)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255);

-- Add bank_code column (nullable)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bank_code VARCHAR(50);

-- Add bank_name column (nullable)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);

-- Create index on account_number for faster lookups (unique constraint already creates an index, but being explicit)
CREATE INDEX IF NOT EXISTS idx_users_account_number ON users(account_number);

-- Add comment to columns for documentation
COMMENT ON COLUMN users.account_number IS 'Bank account number for receiving refunds when tips fail (escrow)';
COMMENT ON COLUMN users.account_name IS 'Bank account holder name';
COMMENT ON COLUMN users.bank_code IS 'Bank code identifier';
COMMENT ON COLUMN users.bank_name IS 'Bank name';
