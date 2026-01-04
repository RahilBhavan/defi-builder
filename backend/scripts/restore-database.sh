#!/bin/bash

# Database Restore Script
# Restores PostgreSQL database from backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Backup file not specified${NC}"
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 backups/backup_20250103_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Confirm restoration
echo -e "${YELLOW}WARNING: This will overwrite the current database!${NC}"
echo "Backup file: $BACKUP_FILE"
echo "Database: $DATABASE_URL"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

echo -e "${GREEN}Starting database restore...${NC}"

# Restore database
if command -v psql &> /dev/null; then
    # Check if file is gzipped
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
    else
        psql "$DATABASE_URL" < "$BACKUP_FILE"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database restored successfully${NC}"
    else
        echo -e "${RED}✗ Restore failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: psql not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

echo -e "${GREEN}Restore process completed${NC}"

