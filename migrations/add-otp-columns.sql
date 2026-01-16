-- Migration script to add OTP-related columns to users table
-- These columns are required for signup/email verification functionality

-- Step 1: Add otp column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'otp'
    ) THEN
        ALTER TABLE users ADD COLUMN otp VARCHAR(255) NULL;
        RAISE NOTICE 'Added otp column to users table';
    ELSE
        RAISE NOTICE 'otp column already exists in users table';
    END IF;
END $$;

-- Step 2: Add otp_expiry column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'otp_expiry'
    ) THEN
        ALTER TABLE users ADD COLUMN otp_expiry TIMESTAMP NULL;
        RAISE NOTICE 'Added otp_expiry column to users table';
    ELSE
        RAISE NOTICE 'otp_expiry column already exists in users table';
    END IF;
END $$;

-- Step 3: Add pending_new_email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'pending_new_email'
    ) THEN
        ALTER TABLE users ADD COLUMN pending_new_email VARCHAR(255) NULL;
        RAISE NOTICE 'Added pending_new_email column to users table';
    ELSE
        RAISE NOTICE 'pending_new_email column already exists in users table';
    END IF;
END $$;

-- Step 4: Add notification_preferences column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'notification_preferences'
    ) THEN
        ALTER TABLE users ADD COLUMN notification_preferences JSONB NULL;
        RAISE NOTICE 'Added notification_preferences column to users table';
    ELSE
        RAISE NOTICE 'notification_preferences column already exists in users table';
    END IF;
END $$;

-- Step 5: Add two_factor_enabled column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'two_factor_enabled'
    ) THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added two_factor_enabled column to users table';
    ELSE
        RAISE NOTICE 'two_factor_enabled column already exists in users table';
    END IF;
END $$;

-- Step 6: Add two_factor_secret column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'two_factor_secret'
    ) THEN
        ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255) NULL;
        RAISE NOTICE 'Added two_factor_secret column to users table';
    ELSE
        RAISE NOTICE 'two_factor_secret column already exists in users table';
    END IF;
END $$;

-- Step 7: Add two_factor_enabled_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'two_factor_enabled_at'
    ) THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled_at TIMESTAMP NULL;
        RAISE NOTICE 'Added two_factor_enabled_at column to users table';
    ELSE
        RAISE NOTICE 'two_factor_enabled_at column already exists in users table';
    END IF;
END $$;

-- Step 8: Add two_factor_backup_codes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'two_factor_backup_codes'
    ) THEN
        ALTER TABLE users ADD COLUMN two_factor_backup_codes JSONB NULL;
        RAISE NOTICE 'Added two_factor_backup_codes column to users table';
    ELSE
        RAISE NOTICE 'two_factor_backup_codes column already exists in users table';
    END IF;
END $$;
