#!/bin/bash
set -e

# Akshar PostgreSQL S3 Backup Script
# Requires AWS CLI installed and EC2 IAM role with S3 write permissions.

DB_USER="education"
DB_NAME="education"
S3_BUCKET=${S3_BACKUP_BUCKET:-"akshar-db-backups"} # Replace with actual bucket name or set env var
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="akshar_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="education-postgres-1" # Or however your production container is named

echo "Starting database backup at $TIMESTAMP..."

# Dump database directly to a compressed file
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > /tmp/$FILENAME

echo "Backup created at /tmp/$FILENAME"
echo "Uploading to S3 bucket: s3://$S3_BUCKET/db-backups/$FILENAME"

# Use AWS CLI to upload. (Assumes IAM role is attached to EC2 instance)
aws s3 cp /tmp/$FILENAME s3://$S3_BUCKET/db-backups/$FILENAME

# Clean up local file
rm /tmp/$FILENAME

echo "Backup and upload completed successfully."
