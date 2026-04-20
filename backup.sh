#!/bin/bash

DB_PATH="/home/haze/economy-v3/database/economy.db"
BACKUP_DIR="/home/haze/backups"

mkdir -p $BACKUP_DIR

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

cp $DB_PATH $BACKUP_DIR/economy_$TIMESTAMP.db

# keep only last 50 backups
ls -t $BACKUP_DIR/*.db | tail -n +51 | xargs rm -f
