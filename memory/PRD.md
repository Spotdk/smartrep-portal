# SMARTREP Kundeportal & Ordrestyring - PRD

## ✅ STATUS: Komplet implementering - Klar til test!

---

## ✅ IMPLEMENTERET:

### Kernefunktioner
| Feature | Status |
|---------|--------|
| Login med 3 roller (Admin/Kunde/Tekniker) | ✅ |
| Dashboard med statistik | ✅ |
| Opgavestyring med 7 statusfaner | ✅ |
| ID-dage farvekoder (sort/orange/rød) | ✅ |
| Opgaveoprettelse med skader | ✅ |
| Bygningsdele, farver, placeringer | ✅ |
| Kundeoversigt | ✅ |
| Kontaktpersoner | ✅ |
| Google Maps kortvisning | ✅ |
| Google Places adresse autocomplete | ✅ |
| Vejrudsigt (DMI integration) | ✅ |
| SMS afsendelse (Twilio) | ✅ |
| Email afsendelse (SendGrid) | ✅ |
| Brand farve #0133ff | ✅ |
| SMARTREP logo (blåt) | ✅ |

### NYE FUNKTIONER (Just implementeret)
| Feature | Status |
|---------|--------|
| **Syncfusion Drag & Drop Kalender** | ✅ |
| **Tekniker mobil-view** (optimeret til telefon) | ✅ |
| **"Naviger til" knap** (Google Maps navigation) | ✅ |
| **Fotorapport for NYE skader** (korrekt logik!) | ✅ |
| **Arbejdskort PDF** (1:1 med design) | ✅ |
| **Fotorapport PDF** (1:1 med design) | ✅ |
| **Kommunikationsskabeloner** med merge-felter | ✅ |
| **Automatiske notifikationer** (ved planlagt/udført) | ✅ |
| **Datoforslag API** (backend klar) | ✅ |

---

## 📱 BRUGERTYPER OG VIEWS

### 1. Admin Portal (Desktop)
- Fuld adgang til alle funktioner
- Syncfusion kalender med drag & drop
- Kunde- og kontaktstyring
- Kommunikation med skabeloner
- Godkendelse af fotorapporter

### 2. Kunde Portal (Desktop)
- Se egne opgaver
- Godkend/afvis fotorapporter
- Se dashboard statistik

### 3. Tekniker Portal (MOBIL-OPTIMERET)
- Store touch-venlige knapper
- "Naviger til" funktion
- "Marker udført" knap
- Opret fotorapporter for NYE skader
- Print arbejdskort PDF

---

## 🔧 API ENDPOINTS

### Autentificering
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Hent nuværende bruger

### Opgaver
- `GET /api/tasks` - Hent opgaver
- `POST /api/tasks` - Opret opgave
- `GET /api/tasks/:id` - Hent enkelt opgave
- `PUT /api/tasks/:id` - Opdater opgave
- `PATCH /api/tasks/:id/status` - Ændre status (+ automatisk notifikation)
- `POST /api/tasks/:id/date-proposal` - Send datoforslag
- `GET /api/tasks/:id/date-proposals` - Hent datoforslag

### Fotorapporter
- `GET /api/photoreports` - Hent rapporter
- `POST /api/photoreports` - Opret rapport for NYE skader
- `GET /api/photoreports/:id` - Hent rapport
- `PUT /api/photoreports/:id` - Opdater rapport
- `POST /api/photoreports/:id/approve` - Godkend rapport

### Kommunikation
- `POST /api/sms/send` - Send SMS
- `POST /api/email/send` - Send email
- `GET /api/communications` - Hent historik

### Datoforslag
- `POST /api/tasks/:id/date-proposal` - Send datoforslag
- `POST /api/date-proposals/:id/select` - Vælg dato

---

## 📋 PDF GENERERING

### Arbejdskort PDF (jsPDF)
Matcher design fra: `Design A4 Arbejdskort – Figma Make.pdf`
- Header med SMARTREP logo og jobnummer
- Kunde og kontakt information
- Bygherre 1 & 2 med mobilnumre
- Skadetabel med checkbokse
- Side 2: Bemærkninger og underskrift

### Fotorapport PDF (jsPDF)
Matcher design fra: `A4 Photo Report Design – Figma Make.pdf`
- Report nummer og dato
- Kunde og udført af
- Skade-sektioner med Accepteret/Afvist badges
- Billede-placeholders
- Kundens underskrift

---

## 📁 API NØGLER (alle i /app/.env):

```
MONGO_URL=<din-mongodb-url>
DB_NAME=smartrep_portal
NEXT_PUBLIC_BASE_URL=https://kundeportal.smartrep.nu
PORTAL_PUBLIC_URL=https://kundeportal.smartrep.nu

# DMI, Google Maps, Twilio, SendGrid, Syncfusion, JWT – sæt i .env.local og i Vercel env.
# Se VERCEL-ENV.md for fuld liste.
```

---

## 👤 TEST LOGIN:

| Rolle | Email | Password |
|-------|-------|----------|
| Admin | admin@smartrep.dk | admin123 |
| Kunde | kunde@huscompagniet.dk | admin123 |
| Tekniker | tekniker@smartrep.dk | admin123 |

---

## 📁 VIGTIGE FILER:

- **Frontend:** `/app/app/page.js`
- **Backend API:** `/app/app/api/[[...path]]/route.js`
- **Styles:** `/app/app/globals.css` (inkl. Syncfusion CSS)
- **Config:** `/app/.env`

---

## LIVE URL:
https://custorbit-1.preview.emergentagent.com
