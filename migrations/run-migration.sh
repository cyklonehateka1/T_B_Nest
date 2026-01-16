#!/bin/bash

# Script to run the migration
# Usage: ./run-migration.sh [DATABASE_URL]

set -e

# Get DATABASE_URL from argument or environment variable
DATABASE_URL=${1:-$DATABASE_URL}

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is required"
    echo "Usage: ./run-migration.sh [DATABASE_URL]"
    echo "Or set DATABASE_URL environment variable"
    exit 1
fi

echo "Running migration: migrate-user-roles.sql"
echo "Database: $DATABASE_URL"

# Run the migration script
psql "$DATABASE_URL" -f migrations/migrate-user-roles.sql

echo "Migration completed successfully!"
