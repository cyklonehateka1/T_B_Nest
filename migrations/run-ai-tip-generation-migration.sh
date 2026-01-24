#!/bin/bash

# Script to run the AI tip generation migration
# Usage: ./run-ai-tip-generation-migration.sh [DATABASE_URL]

set -e

# Get DATABASE_URL from argument or environment variable
DATABASE_URL=${1:-$DATABASE_URL}

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is required"
    echo "Usage: ./run-ai-tip-generation-migration.sh [DATABASE_URL]"
    echo "Or set DATABASE_URL environment variable"
    exit 1
fi

echo "Running migration: create-ai-tip-generation-tables.sql"
echo "Database: ${DATABASE_URL%%\?*}"

# Run the migration script
psql "$DATABASE_URL" -f migrations/create-ai-tip-generation-tables.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Created tables:"
    echo "  - team_statistics"
    echo "  - team_head_to_head"
    echo "  - data_maturity_scores"
    echo "  - team_importance_ratings"
    echo "  - match_predictability_scores"
    echo "  - competition_configurations"
    echo "  - ai_tip_generation_queue"
    echo ""
    echo "Updated tables:"
    echo "  - leagues (added competition_type, is_top_5_european, league_tier)"
    echo "  - tips (added AI-specific fields)"
    echo ""
    echo "Created enums:"
    echo "  - competition_type"
    echo "  - data_maturity_confidence"
    echo "  - generation_queue_status"
else
    echo "❌ Migration failed!"
    exit 1
fi
