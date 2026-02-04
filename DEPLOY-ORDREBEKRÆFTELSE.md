# Ordrebekræftelser og udgivelse af portalen

## Kan vi sende ordrebekræftelser før portalen er deployed?

**Ja – I kan sende nu.** Kunden får både email og SMS som normalt.

**Men:** Linket i email/SMS peger på et URL (fx `https://portal.smartrep.nu`). Det link kan kunden **kun** åbne, hvis portalen faktisk kører på den adresse. Så:

- **Før deploy:** I kan sende; kunden modtager beskeden, men når de klikker på linket, får de "Siden kan ikke findes".
- **Efter deploy:** I sender som nu, og linket virker – kunden kan åbne og besvare ordrebekræftelsen.

For at hele flowet virker (inkl. at kunden kan åbne linket), skal portalen altså udgives én gang. Nedenfor er en simpel, trin-for-trin guide til at gøre det på Vercel (gratis at starte med).

---

# Sådan udgiver I portalen på Vercel (trin for trin)

Vercel er en tjeneste der "holder" jeres Next.js-app live på internettet, så andre (og kunden) kan åbne linket. I behøver ikke kode – bare følge trinnene.

---

## Trin 1: Opret konto på Vercel

1. Gå til **https://vercel.com**
2. Klik **Sign Up** og opret konto (fx med GitHub eller email)
3. Log ind

---

## Trin 2: Få projektet på GitHub (hvis I ikke har det)

1. Opret en konto på **https://github.com** hvis I ikke har en
2. Opret et nyt repository (fx `smartrep-portal`)
3. På din computer, i projektmappen (hvor `package.json` ligger), åbn terminal og kør:

   ```bash
   git init
   git add .
   git commit -m "Første commit"
   git branch -M main
   git remote add origin https://github.com/DIT-BRUGERNAVN/smartrep-portal.git
   git push -u origin main
   ```

   Erstat `DIT-BRUGERNAVN` og `smartrep-portal` med jeres GitHub-brugernavn og repo-navn.

Hvis projektet allerede er på GitHub, skal I bare være sikre på at den seneste kode er pushet (`git push`).

---

## Trin 3: Importér projektet til Vercel

1. På **https://vercel.com** – klik **Add New…** → **Project**
2. Vælg **Import Git Repository** og vælg jeres GitHub-repo (fx `smartrep-portal`)
3. Klik **Import**
4. Under **Configure Project**:
   - **Framework Preset:** Next.js (skal stå automatisk)
   - **Root Directory:** lad stå tom
   - **Build Command:** `npm run build` eller `yarn build` (Vercel foreslår ofte det rigtige)
   - Klik **Deploy**

Vercel bygger og udgiver nu. Det tager 1–2 minutter. Når det er færdigt, får I et link fx **https://smartrep-portal-xxx.vercel.app** – det er jeres live portal.

---

## Trin 4: Sæt miljøvariabler på Vercel

Uden disse kører appen, men ordrebekræftelser (email, SMS, link) virker ikke korrekt.

1. I Vercel: vælg jeres **projekt** (projektnavnet)
2. Gå til **Settings** (øverst) → **Environment Variables**
3. Tilføj **hver** variabel med **Key** og **Value** (kopier værdierne fra jeres `.env.local`):

| Name (Key) | Value (indsæt jeres værdi) |
|------------|----------------------------|
| `MONGO_URL` | jeres MongoDB connection string (fx fra MongoDB Atlas) |
| `DB_NAME` | `smartrep_portal` |
| `JWT_SECRET` | samme som i .env.local |
| `PORTAL_PUBLIC_URL` | **https://smartrep-portal-xxx.vercel.app** (erstatt med det URL Vercel gav jer under Trin 3 – uden sidste /) |
| `NEXT_PUBLIC_BASE_URL` | samme som PORTAL_PUBLIC_URL |
| `SENDGRID_API_KEY` | jeres SendGrid API-nøgle |
| `SENDGRID_FROM_EMAIL` | fx `info@smartrep.nu` |
| `TWILIO_ACCOUNT_SID` | jeres Twilio SID |
| `TWILIO_AUTH_TOKEN` | jeres Twilio token |
| `TWILIO_PHONE_NUMBER` | jeres Twilio-nummer |

4. Klik **Save** for hver variabel
5. **Vigtigt:** Gå til **Deployments** → klik de tre prikker (**…**) på den seneste deployment → **Redeploy**. Så læses de nye variabler.

---

## Trin 5: Tjek at linket virker og at hun får mail

1. Åbn det URL I satte i `PORTAL_PUBLIC_URL` (fx `https://smartrep-portal-xxx.vercel.app`) i browseren – I skal se jeres login-side.
2. I appen: Åbn opgave #85 → **Genfremsend ordrebekræftelse**.
3. Udfyld **Email:** lg@smartrep.nu (eller hendes email).
4. Udfyld **URL i linket:** jeres Vercel-URL (fx `https://smartrep-portal-xxx.vercel.app`) – så bruges det i linket, og hun kan åbne det.
5. Klik **Test afsendelse**. Tjek resultatet:
   - **Email: ✓ Sendt** → hun bør modtage mail. Kommer den ikke: tjek spam; verificer afsender i SendGrid (Trin 3 i afsnit "SendGrid").
   - **Email: ✗** med rød fejl → læs fejlen og ret SendGrid (verificer afsender, tjek API-nøgle).
6. Åbn linket fra resultatet – det skal åbne jeres Vercel-portal. Virker det: Klik **Genfremsend**, så får hun mail/SMS med et link der virker.

Hvis I senere vil bruge eget domæne (fx `portal.smartrep.nu`): I Vercel under **Settings → Domains** kan I tilføje domænet og følge instruktionerne. Derefter sæt `PORTAL_PUBLIC_URL` og `NEXT_PUBLIC_BASE_URL` til `https://portal.smartrep.nu` og redeploy.

---

## Kort opsummering

- **Ordrebekræftelser kan I sende med det samme** – kunden får email og SMS.
- **Linket i beskeden virker først**, når portalen er udgivet (fx på Vercel).
- Første gang: følg Trin 1–5 ovenfor. Efter det: når I pusher ny kode til GitHub, kan Vercel automatisk lave en ny deploy (hvis I har slået det til under project settings).

Hvis noget i et trin ikke matcher skærmen, skriv hvad I ser (fx "Vercel viser X"), så kan vi tilpasse trinnene.
