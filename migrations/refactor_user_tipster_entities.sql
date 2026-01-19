-- Migration: Refactor User and Tipster entities to remove duplication and add qualification tracking
-- Date: 2026-01-18
-- Description: 
--   1. Move rating and top_tipster from users to tipsters (tipster-specific data)
--   2. Add qualification tracking fields to users (for pre-tipster predictions)
--   3. Migrate existing data from users to tipsters

-- Step 1: Update rating precision in tipsters table to DECIMAL(5,2) if needed
-- Note: rating already exists in tipsters table with DECIMAL(5,2) - no change needed if same
-- This ensures rating can hold values 0-999.99 (allows for 0-100 scale with decimals)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipsters' 
        AND column_name = 'rating'
        AND (numeric_precision != 5 OR numeric_scale != 2)
    ) THEN
        ALTER TABLE tipsters 
        ALTER COLUMN rating TYPE DECIMAL(5, 2);
    END IF;
END $$;

-- Step 2: Add top_tipster column to tipsters table if it doesn't exist
ALTER TABLE tipsters 
ADD COLUMN IF NOT EXISTS top_tipster BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Migrate data from users to tipsters
-- Copy rating from users to tipsters for existing tipster records
UPDATE tipsters t
SET rating = COALESCE(u.rating, 0)
FROM users u
WHERE t.user_id = u.id AND u.rating IS NOT NULL;

-- Copy top_tipster from users to tipsters for existing tipster records
UPDATE tipsters t
SET top_tipster = COALESCE(u.top_tipster, false)
FROM users u
WHERE t.user_id = u.id;

-- Step 4: Add qualification tracking fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS qualification_total_predictions INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS qualification_correct_predictions INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS qualification_score DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS qualification_meets_threshold BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS qualification_last_updated TIMESTAMPTZ;

-- Step 5: Create indexes on new tipster columns
CREATE INDEX IF NOT EXISTS idx_tipsters_top_tipster ON tipsters(top_tipster);

-- Step 6: Create indexes on qualification fields
CREATE INDEX IF NOT EXISTS idx_users_qualification_score ON users(qualification_score);
CREATE INDEX IF NOT EXISTS idx_users_qualification_threshold ON users(qualification_meets_threshold);

-- Step 7: Add comments for documentation
COMMENT ON COLUMN tipsters.rating IS 'Tipster rating used for ranking top tipsters (0-100 scale)';
COMMENT ON COLUMN tipsters.top_tipster IS 'Flag indicating if tipster is a top tipster';

COMMENT ON COLUMN users.qualification_total_predictions IS 'Total number of personal predictions made before becoming a tipster';
COMMENT ON COLUMN users.qualification_correct_predictions IS 'Number of correct personal predictions';
COMMENT ON COLUMN users.qualification_score IS 'Percentage score based on predictions (qualification_correct_predictions / qualification_total_predictions * 100)';
COMMENT ON COLUMN users.qualification_meets_threshold IS 'True if user meets qualification threshold (e.g., 10 correct out of last 15 predictions)';
COMMENT ON COLUMN users.qualification_last_updated IS 'Timestamp when qualification metrics were last calculated';

-- Step 8: Remove rating and top_tipster from users table (commented out for safety)
-- Note: We keep them temporarily to ensure data migration is successful
-- They will be removed in a subsequent migration after verification
-- ALTER TABLE users DROP COLUMN IF EXISTS rating;
-- ALTER TABLE users DROP COLUMN IF EXISTS top_tipster;
-- DROP INDEX IF EXISTS idx_users_rating;
-- DROP INDEX IF EXISTS idx_users_top_tipster;
