# Deploy SMARTREP-portalen på Vercel (subdomain kundeportal.smartrep.nu)

Portalen skal køre på **kundeportal.smartrep.nu**, så ordrebekræftelser (link i SMS/email) virker. I har allerede Vercel og www.smartrep.nu.

**Det vi anbefaler = det Vercel anbefaler:** Et **eget Vercel-projekt** til portalen (Import Git → vælg `Spotdk/smartrep-portal`), og subdomænet **kundeportal.smartrep.nu** tilknyttet det projekt. Så har I:
- Portalen opdateres uafhængigt af hovedsiden (smartrep.nu)
- Samme branding via smartrep.nu-domænet (kundeportal.smartrep.nu)
- Adgang til portal-repo uden at røre hovedsiden

“Nyt projekt” betyder altså: ét nyt **Vercel-projekt** (portalen), ikke et nyt Vercel-account. Hovedsiden (www.smartrep.nu) forbliver sit eget projekt.

---

## Hvad Cursor har sat op

- **vercel.json** – Vercel genkender Next.js og build-kommando
- **VERCEL-ENV.md** – liste over alle miljøvariabler til Vercel
- **npm run deploy** – bygger og deployer (efter `npx vercel login`)
- **Build er testet** – klar til deploy

---

## Trin 1: Opret et nyt repo på GitHub

1. Gå til **https://github.com/new** (log ind hos den konto/organisation I vil bruge).
2. **Repository name:** fx `smartrep-portal` (tydeligt navn til portalen).
3. Vælg **Private** eller **Public** efter behag.
4. **Lad være med** at tilføje README, .gitignore eller license (vi har dem allerede i denne mappe).
5. Klik **Create repository**.

GitHub viser derefter en URL til det nye repo, fx  
`https://github.com/JERES-BRUGERNAVN/smartrep-portal.git`  
– den bruger I i næste trin.

---

## Trin 2: Push denne mappe til det nye repo

Åbn terminal i **denne projektmappe** (hvor `package.json` og `vercel.json` ligger) og kør:

```bash
# Hvis I allerede har git (fx fra Emergent-repo), fjern det gamle remote
git remote remove origin 2>/dev/null || true

# Knyt til jeres NYE repo (erstatt med jeres faktiske URL)
git remote add origin https://github.com/JERES-BRUGERNAVN/smartrep-portal.git

# Push til det nye repo (main)
git push -u origin main
```

Hvis I får fejl fordi I ikke har en `main`-branch endnu:

```bash
git branch -M main
git push -u origin main
```

Nu ligger al kode **kun** i det nye repo – I re-deployer ikke længere til Emergent-repoet.

---

## Trin 3: Opret portalen som nyt projekt i Vercel

1. Gå til **https://vercel.com** og log ind (samme konto som www.smartrep.nu).
2. Klik **Add New…** → **Project**.
3. Under **Import Git Repository** vælg det **nye** repo (fx **smartrep-portal**).
4. Klik **Import**.
5. **Project Name:** fx `smartrep-portal` (så I kan kende det fra www.smartrep.nu).
6. **Framework Preset:** Next.js (skal stå automatisk).
7. Klik **Deploy** (lad env variabler være tomme – de tilføjes i næste trin).

Vercel bygger og giver et link fx **https://smartrep-portal-xxx.vercel.app**.

---

## Trin 4: Tilføj miljøvariabler i Vercel

1. I Vercel: vælg projektet **smartrep-portal**.
2. Gå til **Settings** → **Environment Variables**.
3. Tilføj **hver** variabel fra **VERCEL-ENV.md** – kopier værdier fra jeres **.env.local**.

**Vigtige:**

- **PORTAL_PUBLIC_URL** og **NEXT_PUBLIC_BASE_URL:**  
  Brug det URL Vercel lige gav (fx `https://smartrep-portal-xxx.vercel.app`).  
  Når I har tilføjet domænet kundeportal.smartrep.nu (Trin 5), kan I skifte begge til `https://kundeportal.smartrep.nu`.
- **MONGO_URL:** Samme database som I bruger (fx fra .env.local).

4. **Save** for hver variabel.
5. **Deployments** → **…** på seneste deployment → **Redeploy**.

---

## Trin 5: Knyt kundeportal.smartrep.nu (anbefalet)

1. I Vercel: **smartrep-portal** → **Settings** → **Domains**.
2. **Add** → skriv **kundeportal.smartrep.nu**.
3. Følg Vercels anvisninger (CNAME hos domæne-udbyder).
4. Når domænet virker: opdater **PORTAL_PUBLIC_URL** og **NEXT_PUBLIC_BASE_URL** til **https://kundeportal.smartrep.nu**.
5. **Redeploy** igen.

Så kan kunden åbne linket i ordrebekræftelsen på **https://kundeportal.smartrep.nu/confirm/...**.

---

## Trin 6: Link fra hovedsiden (smartrep.nu)

Tilføj evt. et **«Kundeportal»**-link i headeren på www.smartrep.nu der peger på `https://kundeportal.smartrep.nu`. Det gøres i **hovedsidens** repo/kode (smartrep.nu), ikke i dette portal-repo. Så har I delt branding og tydelig adgang til portalen fra hovedsiden.

---

## Fremover: deploy ved push

Når I pusher til det **nye** repo (`git push origin main`), deployer Vercel automatisk til **smartrep-portal**-projektet. I behøver ikke længere at re-deploye til Emergent-repoet.

**Manuelt deploy fra terminal:**  
Første gang: `npx vercel login`. Derefter: `npm run deploy`.

---

## Kort oversigt

| Trin | Handling |
|------|----------|
| 1 | Opret **nyt** repo på GitHub (fx `smartrep-portal`) |
| 2 | I denne mappe: `git remote add origin <NY-REPO-URL>` og `git push -u origin main` |
| 3 | I Vercel: **Add New → Project** → vælg det **nye** repo → Deploy |
| 4 | Tilføj env fra **VERCEL-ENV.md** → Redeploy |
| 5 | (Valgfrit) Tilføj domænet **kundeportal.smartrep.nu** under Domains |

Efter det har I ét tydeligt repo og ét Vercel-projekt til portalen – uden at blande med det gamle Emergent-setup.
