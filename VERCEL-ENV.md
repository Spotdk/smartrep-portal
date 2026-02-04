# Miljøvariabler til Vercel (kundeportal.smartrep.nu / ordrebekræftelse)

Tilføj disse i **Vercel → jeres portal-projekt → Settings → Environment Variables**.  
Brug **samme værdier** som I har i `.env.local` (kopier fra den fil).

| Name (nøgle) | Eksempel / beskrivelse |
|--------------|-------------------------|
| `MONGO_URL` | jeres MongoDB connection string (fx fra MongoDB Atlas) |
| `DB_NAME` | `smartrep_portal` |
| `JWT_SECRET` | samme som i .env.local |
| `NEXT_PUBLIC_BASE_URL` | **https://kundeportal.smartrep.nu** (eller jeres Vercel-URL indtil domæne er sat) |
| `PORTAL_PUBLIC_URL` | **https://kundeportal.smartrep.nu** (eller jeres Vercel-URL) – bruges i link i SMS/email |
| `CORS_ORIGINS` | `*` |
| `TWILIO_ACCOUNT_SID` | jeres Twilio SID |
| `TWILIO_AUTH_TOKEN` | jeres Twilio token |
| `TWILIO_PHONE_NUMBER` | jeres Twilio-nummer |
| `SENDGRID_API_KEY` | jeres SendGrid API-nøgle |
| `SENDGRID_FROM_EMAIL` | `info@smartrep.nu` (skal være verifieret i SendGrid) |
| `DMI_API_KEY` | jeres DMI-nøgle |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | jeres Google Maps-nøgle |
| `GOOGLE_MAPS_API_KEY` | samme som ovenfor |
| `NEXT_PUBLIC_SYNCFUSION_LICENSE` | jeres Syncfusion-licens |

**Vigtigt:** Efter I har tilføjet variabler: **Redeploy** (Deployments → … → Redeploy).

**Domæne:** Under **Settings → Domains** kan I tilføje `kundeportal.smartrep.nu` og pege det på dette projekt (Vercel guider dig).
