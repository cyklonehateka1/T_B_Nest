-- Check current database state before migration
-- Run this to see what needs to be migrated

-- Check if users.role column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'role'
        ) THEN 'EXISTS' 
        ELSE 'DOES NOT EXIST' 
    END as users_role_column_status;

-- Check if user_roles table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'user_roles'
        ) THEN 'EXISTS' 
        ELSE 'DOES NOT EXIST' 
    END as user_roles_table_status;

-- Check if user_role_type enum exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_type 
            WHERE typname = 'user_role_type'
        ) THEN 'EXISTS' 
        ELSE 'DOES NOT EXIST' 
    END as user_role_type_enum_status;

-- Count users with roles in users.role column (if column exists)
DO $$
DECLARE
    users_with_roles_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        SELECT COUNT(*) INTO users_with_roles_count
        FROM users 
        WHERE role IS NOT NULL;
        
        RAISE NOTICE 'Users with role in users.role column: %', users_with_roles_count;
    ELSE
        RAISE NOTICE 'users.role column does not exist';
    END IF;
END $$;

-- Count roles in user_roles table (if table exists)
DO $$
DECLARE
    user_roles_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'user_roles'
    ) THEN
        SELECT COUNT(*) INTO user_roles_count
        FROM user_roles;
        
        RAISE NOTICE 'Roles in user_roles table: %', user_roles_count;
    ELSE
        RAISE NOTICE 'user_roles table does not exist';
    END IF;
END $$;
