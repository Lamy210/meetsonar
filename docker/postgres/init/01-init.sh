#!/bin/bash
# PostgreSQL initialization script for MeetSonar

set -e

# Create extensions if needed
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable extensions if needed
    -- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Create any initial tables if migration doesn't exist
    -- This is just a placeholder - Drizzle will handle migrations
    SELECT 'Database initialized for MeetSonar';
EOSQL

echo "PostgreSQL initialization completed for MeetSonar"
