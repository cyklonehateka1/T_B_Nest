-- Migration: Add about_me field to users table
-- Date: 2026-01-18
-- Description: Adds about_me column to users table for user profile bio/about section

-- Add about_me column (nullable text field)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS about_me TEXT;

-- Add comment to column for documentation
COMMENT ON COLUMN users.about_me IS 'User bio/about me section for profile page';
