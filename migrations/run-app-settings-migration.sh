#!/bin/bash

# Script to run the app_settings migration
# Reads DATABASE_URL from .env file in the parent directory

cd "$(dirname "$0")/.." || exit 1

# Read DATABASE_URL from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in .env file"
    exit 1
fi

echo "Running app_settings migration..."
echo "Database: ${DATABASE_URL%%\?*}"

# Run the migration
psql "$DATABASE_URL" -f migrations/create-app-settings.sql

if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
else
    echo "Migration failed!"
    exit 1
fi
