# Migration er færdig – data ligger i Atlas smartrep_portal

**Sidste skridt (2 min):** Opdater Vercel så portalen bruger den nye database.

1. Gå til **https://vercel.com** → dit projekt **smartrep-portal** → **Settings** → **Environment Variables**

2. Ret eller tilføj:
   - **MONGO_URL**: `mongodb+srv://tools_db_user:smartrep123@smartrep.f46rxay.mongodb.net/smartrep_portal?authSource=admin`
   - **DB_NAME**: `smartrep_portal`

3. **Redeploy** (Deployments → … på seneste → Redeploy)

Derefter viser portalen alle 27 opgaver, 6 firmaer og 31 brugere.
