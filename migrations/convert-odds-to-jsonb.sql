-- Migration: Convert odds column from text (JSON string) to jsonb in match_data table
-- This migration converts existing string JSON data to proper JSONB type
-- 
-- Steps:
-- 1. Add a temporary column with jsonb type
-- 2. Convert existing string JSON data to jsonb in the temporary column
-- 3. Drop the old text column
-- 4. Rename the temporary column to odds
--
-- Note: This migration is idempotent and can be run multiple times safely

DO $$
BEGIN
    -- Check if odds column exists and is of type text
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'match_data' 
        AND column_name = 'odds' 
        AND data_type = 'text'
    ) THEN
        -- Step 1: Add temporary jsonb column
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'match_data' 
            AND column_name = 'odds_jsonb'
        ) THEN
            ALTER TABLE match_data 
            ADD COLUMN odds_jsonb jsonb;
            
            RAISE NOTICE 'Added temporary odds_jsonb column';
        END IF;

        -- Step 2: Convert existing string JSON to jsonb
        -- Only convert rows where odds is not null and is valid JSON
        UPDATE match_data
        SET odds_jsonb = (
            CASE 
                WHEN odds IS NULL OR odds = '' THEN NULL
                WHEN odds::text ~ '^[\s]*[\[\{]' THEN odds::jsonb  -- Looks like JSON
                ELSE NULL  -- Invalid JSON, set to NULL
            END
        )
        WHERE odds IS NOT NULL 
        AND odds != '';

        RAISE NOTICE 'Converted existing JSON string data to jsonb';

        -- Step 3: Drop the old text column
        ALTER TABLE match_data 
        DROP COLUMN IF EXISTS odds;

        RAISE NOTICE 'Dropped old odds text column';

        -- Step 4: Rename temporary column to odds
        ALTER TABLE match_data 
        RENAME COLUMN odds_jsonb TO odds;

        RAISE NOTICE 'Renamed odds_jsonb to odds';

        -- Step 5: Add comment to document the column
        COMMENT ON COLUMN match_data.odds IS 'Odds data stored as JSONB. Contains bookmaker odds for various markets (match_result, over_under, btts, double_chance, handicap)';

        RAISE NOTICE 'Migration completed successfully: odds column is now jsonb type';
    ELSE
        -- Column might already be jsonb or doesn't exist
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'match_data' 
            AND column_name = 'odds' 
            AND udt_name = 'jsonb'
        ) THEN
            RAISE NOTICE 'odds column is already jsonb type, skipping migration';
        ELSE
            RAISE NOTICE 'odds column does not exist or is not text type, skipping migration';
        END IF;
    END IF;
END $$;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'match_data' 
AND column_name = 'odds';
