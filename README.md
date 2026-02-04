# SMARTREP Kundeportal & Ordrestyring

En komplet kundeportal og ordrestyringsløsning til SMARTREP - specialiseret i reparation af vinduer og døre for byggefirmaer.

## 🚀 Live Demo
**URL:** https://custorbit-1.preview.emergentagent.com

## 👤 Login-oplysninger

| Rolle | Email | Password |
|-------|-------|----------|
| **Admin** | admin1@smartrep.nu | Admin123 |
| **Admin** | admin2@smartrep.nu | Admin123 |
| **Kunde** | kunde@huscompagniet.dk | admin123 |
| **Tekniker** | tekniker@smartrep.dk | admin123 |

## ✅ Implementerede Features

### Brugerroller
- **Admin:** Fuld adgang til alt
- **Kunde:** Egne opgaver, oprette nye
- **Tekniker:** Tildelte opgaver, fotorapporter

### Dashboard
- Aktive opgaver
- Udførte i dag
- Kundetæller
- Afventende rapporter
- Seneste opgaver

### Opgavestyring
- 7 statusfaner (Nye, Aktive, Planlagt, Aflyst, Standby, Afsluttede, Arkiv)
- ID-dage farvekoder (sort/orange/rød)
- Komplet opgaveoprettelse med skader
- Hurtig statusændring
- Deadline tracking

### Kunder & Kontakter
- Firmaoversigt
- Kontaktpersoner
- Opret nye kunder/kontakter

### Planlægning
- Drag & drop kalender
- Ugevisning
- Job pool med aktive opgaver

### Kortvisning
- Opgaver grupperet pr. by
- Farvekodede markører
- Filtrer efter status

### Vejrudsigt
- 7-dages prognose
- 10 danske byer

### Kommunikation
- Send SMS (Twilio)
- Send Email (SendGrid)
- Ordrebekræftelse template
- Kommunikationslog

### Fotorapporter
- Opret for planlagt opgave
- FØR/EFTER billeder pr. skade
- Godkendelsesflow

## 🛠 Teknologi

- **Frontend/Backend:** Next.js 14
- **Database:** MongoDB
- **UI:** Tailwind CSS + shadcn/ui
- **Auth:** JWT

## 📦 Integrationer

| Service | Status |
|---------|--------|
| DMI Vejr | ✅ |
| Twilio SMS | ✅ |
| SendGrid Email | ✅ |

## 🗃 Database

| Collection | Dokumenter |
|------------|------------|
| users | 30 |
| companies | 6 |
| tasks | 26 |
| communications | 2 |
| photo_reports | 3 |

## 🏃 Kør lokalt

```bash
# Install dependencies
yarn install

# Start development server
yarn dev
```

## 📝 License

Proprietær - SMARTREP ApS
