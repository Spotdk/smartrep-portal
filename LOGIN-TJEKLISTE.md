# Én prioritet: Få adgang til kundeportalen

Brug kun **én** adresse (fx **kundeportal.smartrep.nu** eller **portal.smartrep.nu**). Følg kun disse trin.

---

## Trin 1: MongoDB Atlas – tillad adgang

1. Gå til **https://cloud.mongodb.com** → log ind.
2. Vælg projektet med clusteret **smartrep**.
3. Venstremenu: **Network Access** (under Security).
4. Klik **ADD IP ADDRESS**.
5. Vælg **ALLOW ACCESS FROM ANYWHERE** (sætter 0.0.0.0/0).
6. Klik **Confirm**.

---

## Trin 2: Vercel – tre variabler

1. Gå til **https://vercel.com** → vælg projektet **smartrep-portal**.
2. **Settings** → **Environment Variables**.
3. Sørg for at disse **findes og er korrekte** (Ret/Save hvis du ændrer):

| Name | Value |
|------|--------|
| **MONGO_URL** | `mongodb+srv://tools_db_user:Tools134@smartrep.f46rxay.mongodb.net/smartrep_portal?appName=smartrep` (brug dit eget password hvis du har skiftet det) |
| **DB_NAME** | `smartrep_portal` |
| **JWT_SECRET** | En lang hemmelig streng (fx 32+ tilfældige tegn). Samme som i .env.local er fint. |

4. Klik **Save** for hver.

---

## Trin 3: Redeploy

1. I Vercel: **Deployments**.
2. Klik på **…** (tre prikker) på den **seneste** deployment.
3. Klik **Redeploy** → bekræft.

Vent 1–2 minutter til build er færdig (grøn check).

---

## Trin 4: Test login

1. Åbn **https://kundeportal.smartrep.nu** (eller portal.smartrep.nu hvis det er den I bruger).
2. Log ind med **admin@smartrep.dk** / **admin123**.

- **Virker det?** → Færdig.
- **"MONGO_URL er ikke sat"** → Trin 2: MONGO_URL er ikke gemt eller gælder ikke for Production. Tilføj igen og Redeploy.
- **"Kunne ikke forbinde til database"** → Trin 1: Atlas Network Access (Allow from anywhere). Vent 1–2 min og prøv igen.
- **"Internal server error"** → I Vercel: **Deployments** → seneste → **Logs** eller **Functions**. Kig efter den røde fejltekst og tjek om det er MongoDB/adgang.

---

## Kun disse fire trin

Ingen ekstra domæner, ingen DNS-ændringer i dette skridt. Én adresse, tre env-variabler, Redeploy, test.
