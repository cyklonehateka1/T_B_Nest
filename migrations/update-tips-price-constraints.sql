-- Migration: Update tips price constraints to allow free tips (0) and minimum paid price of 1.00 USD
-- Date: 2026-01-17
-- Description: Updates the tips table constraints to match the new pricing rules:
--              - Free tips: price = 0
--              - Paid tips: price >= 1.00 USD and price <= 100.00 USD

DO $$
BEGIN
    -- Drop the old constraints if they exist
    ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_price_positive;
    ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_price_minimum;

    -- Add new constraints
    -- Allow price >= 0 (free tips or paid tips)
    ALTER TABLE tips ADD CONSTRAINT tips_price_non_negative 
        CHECK (price >= 0);

    -- Allow free tips (price = 0) OR paid tips (price >= 1.00 and price <= 100.00)
    ALTER TABLE tips ADD CONSTRAINT tips_price_valid_range 
        CHECK (price = 0 OR (price >= 1.00 AND price <= 100.00));

    RAISE NOTICE 'Successfully updated tips price constraints.';
END
$$;
