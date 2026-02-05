# Migrér lokal database til Atlas

Din **komplette database** (27 opgaver, 6 firmaer, 31 brugere inkl. ordre #85) ligger i **lokal MongoDB**:
- **MONGO_URL**: `mongodb://localhost:27017`
- **DB_NAME**: `smartrep_portal`

**Eksport er allerede udført** → mappen `mongo-backup/smartrep_portal/` findes.

## Trin 1: Importér til Atlas

Åbn Terminal og kør (erstat `DIT_PASSWORD` med dit Atlas password):

```bash
cd /Users/janchristensen/SMARTREP-2026-Emergent-6.5-backup
ATLAS_URI="mongodb+srv://tools_db_user:DIT_PASSWORD@smartrep.f46rxay.mongodb.net/?authSource=admin" ./scripts/migrate-to-atlas.sh
```

Eller kør scriptet manuelt:
```bash
mongorestore --uri="mongodb+srv://tools_db_user:DIT_PASSWORD@smartrep.f46rxay.mongodb.net/?authSource=admin" --db=smartrep_portal --drop ./mongo-backup/smartrep_portal
```

## Trin 2: Opdater Vercel

Vercel → Projekt → Settings → Environment Variables:

| Name | Value |
|------|-------|
| **MONGO_URL** | `mongodb+srv://tools_db_user:DIT_PASSWORD@smartrep.f46rxay.mongodb.net/smartrep_portal?authSource=admin` |
| **DB_NAME** | `smartrep_portal` |

Redeploy.

## Opsummering

| | Lokal | Atlas (Vercel) |
|---|---|---|
| **Før** | smartrep_portal = 27 opgaver, 6 firmaer | smartrep = gammel data |
| **Efter** | uændret | smartrep_portal = komplet data |
