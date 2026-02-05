#!/bin/bash
# Migrér lokal smartrep_portal til Atlas
# Brug: ATLAS_URI="mongodb+srv://user:PASSWORD@smartrep.xxx.mongodb.net/?authSource=admin" ./scripts/migrate-to-atlas.sh
# Eller sæt ATLAS_URI i .env.local og source den først

set -e

if [ -z "$ATLAS_URI" ]; then
  echo "Fejl: Sæt ATLAS_URI med din Atlas connection string"
  echo "Eksempel: ATLAS_URI=\"mongodb+srv://tools_db_user:DIT_PASSWORD@smartrep.f46rxay.mongodb.net/?authSource=admin\" ./scripts/migrate-to-atlas.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/mongo-backup"

echo "1. Eksporterer fra lokal MongoDB..."
mongodump --uri="mongodb://localhost:27017" --db=smartrep_portal --out="$BACKUP_DIR"

echo "2. Importerer til Atlas (smartrep_portal)..."
mongorestore --uri="$ATLAS_URI" --db=smartrep_portal --drop "$BACKUP_DIR/smartrep_portal"

echo "3. Færdig! Opdater nu Vercel:"
echo "   - MONGO_URL: Din Atlas URI med /smartrep_portal før ? (fx ...mongodb.net/smartrep_portal?authSource=admin)"
echo "   - DB_NAME: smartrep_portal"
echo "   - Redeploy"
