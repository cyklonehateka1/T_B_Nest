-- Migration: Add rating and top_tipster fields to users table
-- Date: 2026-01-18
-- Description: Adds rating (decimal) and top_tipster (boolean) columns to users table for top tipster functionality

-- Add rating column (nullable, default 0, precision 3 scale 2 for values like 4.50, 5.00)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0;

-- Add top_tipster column (not null, default false)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS top_tipster BOOLEAN NOT NULL DEFAULT false;

-- Create index on rating for faster sorting and queries
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating);

-- Create index on top_tipster for filtering top tipsters
CREATE INDEX IF NOT EXISTS idx_users_top_tipster ON users(top_tipster);

-- Add comment to columns for documentation
COMMENT ON COLUMN users.rating IS 'User rating used for ranking top tipsters (0-100 scale)';
COMMENT ON COLUMN users.top_tipster IS 'Flag indicating if user is a top tipster';
