-- Migration script to create invalidated_tokens table
-- This table stores invalidated JWT tokens (e.g., after logout)

-- Create invalidated_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS invalidated_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invalidated_tokens_token_hash ON invalidated_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_invalidated_tokens_expires_at ON invalidated_tokens(expires_at);

-- Add unique constraint on token_hash if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invalidated_tokens_token_hash_key'
    ) THEN
        ALTER TABLE invalidated_tokens 
        ADD CONSTRAINT invalidated_tokens_token_hash_key UNIQUE (token_hash);
    END IF;
END $$;
