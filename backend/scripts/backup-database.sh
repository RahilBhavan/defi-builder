#!/bin/bash

# Database Backup Script
# Creates automated backups of PostgreSQL database

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Starting database backup...${NC}"
echo "Backup file: $BACKUP_FILE"

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL="$DATABASE_URL"

# Perform backup using pg_dump
if command -v pg_dump &> /dev/null; then
    # Extract connection details for pg_dump
    # This is a simplified version - you may need to parse DATABASE_URL more carefully
    pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Backup completed successfully${NC}"
        echo "  Size: $BACKUP_SIZE"
        echo "  File: $BACKUP_FILE"
    else
        echo -e "${RED}✗ Backup failed${NC}"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    echo -e "${RED}Error: pg_dump not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Clean up old backups
echo -e "${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f | wc -l)
echo -e "${GREEN}Total backups retained: $BACKUP_COUNT${NC}"

echo -e "${GREEN}Backup process completed${NC}"

