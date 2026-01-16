# Database Migration Scripts

This directory contains SQL migration scripts to migrate from the old Java backend database structure to the new NestJS backend structure.

## Migration Steps

### 1. Check Current Database State

Before running the migration, check the current state of your database:

```bash
# Using DATABASE_URL environment variable
psql "$DATABASE_URL" -f migrations/check-db-state.sql

# Or using direct connection string
psql "postgresql://username:password@host:port/database" -f migrations/check-db-state.sql
```

### 2. Run the Migration

Run the migration script to migrate user roles from the `users.role` column to the `user_roles` table:

```bash
# Using DATABASE_URL environment variable
./migrations/run-migration.sh

# Or pass DATABASE_URL as argument
./migrations/run-migration.sh "postgresql://username:password@host:port/database"

# Or use psql directly
psql "$DATABASE_URL" -f migrations/migrate-user-roles.sql
```

### 3. Verify Migration

After running the migration, verify the results:

```sql
-- Check user_roles table
SELECT COUNT(*) FROM user_roles;

-- Check users and their roles
SELECT u.id, u.email, u.status, ARRAY_AGG(ur.role) as roles 
FROM users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id 
GROUP BY u.id, u.email, u.status
LIMIT 10;
```

## What the Migration Does

1. **Creates `user_roles` table** - If it doesn't exist, creates the table with proper constraints and indexes
2. **Migrates existing roles** - Copies role data from `users.role` column to `user_roles` table
3. **Drops `users.role` column** - Removes the old role column from users table
4. **Adds `status` column** - Adds the new `status` enum column to users table if it doesn't exist
5. **Creates `user_status` enum** - Creates the enum type if it doesn't exist

## Important Notes

- **Backup your database** before running migrations in production
- The migration is **idempotent** - it's safe to run multiple times
- The `user_role_type` enum is **NOT dropped** - it's still used by the `user_roles` table
- The migration preserves all existing role data

## Troubleshooting

If you encounter errors:

1. **"cannot drop type user_role_type"** - This is expected. The enum is still in use by `user_roles` table. The migration script doesn't drop it.

2. **"column users.role does not exist"** - This is fine if you're migrating from scratch. The script handles this.

3. **"duplicate key value"** - The script uses `ON CONFLICT DO NOTHING` to handle duplicates safely.

## After Migration

After running the migration successfully:

1. **Turn off synchronize** in `app.module.ts` (change `synchronize: true` to `synchronize: false`) for production
2. **Restart your NestJS application**
3. **Verify** that users can log in and roles are correctly loaded
