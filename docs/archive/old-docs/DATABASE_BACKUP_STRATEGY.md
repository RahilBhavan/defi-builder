# Database Backup Strategy

**Last Updated:** 2025-01-03  
**Status:** Production-Ready

---

## Overview

This document outlines the database backup strategy for the DeFi Builder application. Regular backups are critical for data protection and disaster recovery.

---

## Backup Strategy

### Backup Frequency
- **Daily Backups:** Automated daily backups at 2:00 AM UTC
- **Before Deployments:** Automatic backup before any database migration
- **Manual Backups:** On-demand backups before major changes

### Retention Policy
- **Daily Backups:** Retained for 30 days
- **Weekly Backups:** Retained for 12 weeks
- **Monthly Backups:** Retained for 12 months
- **Pre-Deployment Backups:** Retained for 7 days

### Backup Storage
- **Primary:** Local server storage (`./backups/`)
- **Secondary:** Cloud storage (S3, Google Cloud Storage, etc.)
- **Offsite:** Remote backup location

---

## Backup Scripts

### 1. Automated Backup (`backend/scripts/backup-database.sh`)

**Usage:**
```bash
cd backend
./scripts/backup-database.sh
```

**Features:**
- Creates compressed SQL dump
- Automatic cleanup of old backups
- Configurable retention period
- Error handling and logging

**Configuration:**
```bash
export BACKUP_DIR="./backups"
export RETENTION_DAYS=30
export DATABASE_URL="postgresql://user:password@host:5432/database"
```

### 2. Restore Database (`backend/scripts/restore-database.sh`)

**Usage:**
```bash
cd backend
./scripts/restore-database.sh backups/backup_20250103_120000.sql.gz
```

**Features:**
- Safety confirmation prompt
- Supports gzipped backups
- Error handling
- Database connection validation

### 3. List Backups (`backend/scripts/list-backups.sh`)

**Usage:**
```bash
cd backend
./scripts/list-backups.sh
```

**Features:**
- Lists all available backups
- Shows backup sizes
- Displays formatted timestamps
- Total backup statistics

---

## Automated Backup Setup

### Cron Job (Linux/macOS)

Add to crontab for daily backups:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2:00 AM UTC
0 2 * * * cd /path/to/defi-builder/backend && ./scripts/backup-database.sh >> /var/log/db-backup.log 2>&1
```

### Systemd Timer (Linux)

Create `/etc/systemd/system/db-backup.service`:
```ini
[Unit]
Description=Database Backup Service
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/defi-builder/backend
Environment="DATABASE_URL=postgresql://..."
ExecStart=/path/to/defi-builder/backend/scripts/backup-database.sh
```

Create `/etc/systemd/system/db-backup.timer`:
```ini
[Unit]
Description=Daily Database Backup Timer
Requires=db-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable db-backup.timer
sudo systemctl start db-backup.timer
```

### GitHub Actions

Add to `.github/workflows/backup.yml`:
```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup PostgreSQL
        uses: actions/setup-postgresql@v1
      - name: Run backup
        run: |
          cd backend
          ./scripts/backup-database.sh
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - name: Upload backup
        uses: actions/upload-artifact@v4
        with:
          name: database-backup
          path: backend/backups/
          retention-days: 30
```

---

## Cloud Storage Integration

### AWS S3

Upload backups to S3:
```bash
# After backup
aws s3 cp "$BACKUP_FILE" "s3://your-bucket/backups/$(basename $BACKUP_FILE)"
```

### Google Cloud Storage

Upload backups to GCS:
```bash
# After backup
gsutil cp "$BACKUP_FILE" "gs://your-bucket/backups/$(basename $BACKUP_FILE)"
```

### Automated Cloud Upload

Modify `backup-database.sh` to include cloud upload:
```bash
# After successful backup
if [ -n "$S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/"
fi
```

---

## Backup Verification

### Verify Backup Integrity

```bash
# Check if backup file is valid
gunzip -t backups/backup_20250103_120000.sql.gz

# Test restore to temporary database
createdb test_restore
gunzip -c backups/backup_20250103_120000.sql.gz | psql test_restore
dropdb test_restore
```

### Automated Verification

Add to backup script:
```bash
# Verify backup after creation
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "✓ Backup file is valid"
else
    echo "✗ Backup file is corrupted"
    exit 1
fi
```

---

## Restore Procedures

### Full Database Restore

1. **Stop Application**
   ```bash
   # Stop application services
   ```

2. **Create Pre-Restore Backup**
   ```bash
   ./scripts/backup-database.sh
   ```

3. **Restore Database**
   ```bash
   ./scripts/restore-database.sh backups/backup_20250103_120000.sql.gz
   ```

4. **Verify Restore**
   ```bash
   # Check database connectivity
   # Verify data integrity
   # Run smoke tests
   ```

5. **Restart Application**
   ```bash
   # Start application services
   ```

### Partial Restore (Single Table)

```bash
# Extract specific table from backup
gunzip -c backups/backup_20250103_120000.sql.gz | \
    grep -A 10000 "CREATE TABLE users" | \
    psql "$DATABASE_URL"
```

---

## Monitoring and Alerts

### Backup Monitoring

Monitor backup success/failure:
```bash
# Check last backup time
ls -lt backups/ | head -2

# Check backup size
du -sh backups/

# Verify backups are being created
find backups/ -name "backup_*.sql.gz" -mtime -1
```

### Alert Setup

Configure alerts for:
- Backup failures
- Backup size anomalies
- Missing backups
- Storage space issues

Example alert script:
```bash
#!/bin/bash
# Check if backup exists from last 25 hours
if [ -z "$(find backups/ -name 'backup_*.sql.gz' -mtime -1)" ]; then
    echo "ALERT: No backup found in last 25 hours"
    # Send alert (email, Slack, etc.)
fi
```

---

## Disaster Recovery

### Recovery Time Objectives (RTO)
- **Target RTO:** 4 hours
- **Maximum RTO:** 24 hours

### Recovery Point Objectives (RPO)
- **Target RPO:** 24 hours (daily backups)
- **Maximum RPO:** 7 days

### Recovery Procedures

1. **Assess Damage**
   - Identify data loss scope
   - Determine backup to restore

2. **Prepare Recovery Environment**
   - Set up temporary database if needed
   - Verify backup integrity

3. **Execute Restore**
   - Restore from most recent backup
   - Verify data integrity

4. **Resume Operations**
   - Start application services
   - Monitor for issues
   - Notify stakeholders

---

## Best Practices

1. **Test Backups Regularly**
   - Monthly restore tests
   - Verify backup integrity
   - Document restore procedures

2. **Multiple Backup Locations**
   - Local storage
   - Cloud storage
   - Offsite backup

3. **Monitor Backup Health**
   - Automated monitoring
   - Alert on failures
   - Regular audits

4. **Document Everything**
   - Backup procedures
   - Restore procedures
   - Recovery contacts

5. **Regular Reviews**
   - Review backup strategy quarterly
   - Update retention policies
   - Test disaster recovery

---

## Security Considerations

1. **Encrypt Backups**
   ```bash
   # Encrypt backup before storage
   gpg --encrypt --recipient backup@example.com "$BACKUP_FILE"
   ```

2. **Secure Storage**
   - Use encrypted storage
   - Limit access to backups
   - Rotate encryption keys

3. **Access Control**
   - Restrict backup access
   - Audit backup access
   - Use secure transfer methods

---

## Troubleshooting

### Backup Fails

**Issue:** Backup script fails
- Check DATABASE_URL is set
- Verify database connectivity
- Check disk space
- Review error logs

### Restore Fails

**Issue:** Restore script fails
- Verify backup file integrity
- Check database permissions
- Ensure sufficient disk space
- Review error messages

### Missing Backups

**Issue:** Backups not being created
- Check cron/systemd timer
- Verify script permissions
- Check backup directory exists
- Review system logs

---

## Support

For backup/restore issues:
1. Check backup logs
2. Verify database connectivity
3. Review error messages
4. Contact database administrator

---

**Last Updated:** 2025-01-03

