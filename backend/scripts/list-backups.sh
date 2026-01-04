#!/bin/bash

# List Database Backups Script
# Lists all available database backups

BACKUP_DIR="${BACKUP_DIR:-./backups}"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "No backup directory found: $BACKUP_DIR"
    exit 0
fi

echo "Available database backups:"
echo "============================"
echo ""

# List backups with details
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -exec ls -lh {} \; | \
    awk '{print $9, "(" $5 ")"}' | \
    sed 's|.*/backup_||' | \
    sed 's|\.sql\.gz| |' | \
    sort -r | \
    while read -r timestamp size; do
        # Parse timestamp
        date_str=$(echo "$timestamp" | cut -d'_' -f1)
        time_str=$(echo "$timestamp" | cut -d'_' -f2)
        
        # Format date
        if [ -n "$date_str" ] && [ -n "$time_str" ]; then
            formatted_date=$(date -j -f "%Y%m%d_%H%M%S" "${date_str}_${time_str}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$timestamp")
            echo "  $formatted_date - $size"
        else
            echo "  $timestamp - $size"
        fi
    done

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f | wc -l | tr -d ' ')
TOTAL_SIZE=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -exec du -ch {} + | tail -1 | cut -f1)

echo ""
echo "Total: $BACKUP_COUNT backups ($TOTAL_SIZE)"

