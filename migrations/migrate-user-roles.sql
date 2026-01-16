-- Migration script to migrate from users.role column to user_roles table
-- This script handles the transition from the old Java backend to the new NestJS backend

-- Step 1: Ensure the user_roles table exists
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role user_role_type NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID,
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_user_roles_user_role UNIQUE (user_id, role)
);

-- Step 2: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Step 3: Migrate existing role data from users.role to user_roles table
-- Only migrate if users.role column exists and there's data to migrate
DO $$
BEGIN
    -- Check if users.role column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        -- Migrate existing roles to user_roles table
        -- Insert roles for users that don't already have them in user_roles
        INSERT INTO user_roles (user_id, role, granted_at)
        SELECT 
            u.id,
            u.role::user_role_type,
            COALESCE(u.created_at, NOW())
        FROM users u
        WHERE u.role IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 
            FROM user_roles ur 
            WHERE ur.user_id = u.id AND ur.role = u.role::user_role_type
        )
        ON CONFLICT (user_id, role) DO NOTHING;

        RAISE NOTICE 'Migrated roles from users.role column to user_roles table';
    ELSE
        RAISE NOTICE 'users.role column does not exist, skipping migration';
    END IF;
END $$;

-- Step 4: Drop the users.role column if it exists
-- Note: We can't drop the enum type yet because it might still be used elsewhere
-- But we can drop the column from users table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE users DROP COLUMN IF EXISTS role;
        RAISE NOTICE 'Dropped users.role column';
    ELSE
        RAISE NOTICE 'users.role column does not exist';
    END IF;
END $$;

-- Step 5: Ensure user_status enum exists if it doesn't already
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION');
        RAISE NOTICE 'Created user_status enum type';
    ELSE
        RAISE NOTICE 'user_status enum type already exists';
    END IF;
END $$;

-- Step 6: Add status column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status user_status DEFAULT 'ACTIVE';
        RAISE NOTICE 'Added status column to users table';
    ELSE
        RAISE NOTICE 'users.status column already exists';
    END IF;
END $$;

-- Verification queries (run these manually to verify)
-- SELECT COUNT(*) FROM user_roles;
-- SELECT COUNT(*) FROM users;
-- SELECT u.id, u.email, u.status, ARRAY_AGG(ur.role) as roles 
-- FROM users u 
-- LEFT JOIN user_roles ur ON u.id = ur.user_id 
-- GROUP BY u.id, u.email, u.status;
