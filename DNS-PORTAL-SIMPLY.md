# Én DNS-post – så virker kundeportal.smartrep.nu

Portalen kører på Vercel. **kundeportal.smartrep.nu** virker ikke, fordi der ikke er nogen DNS-post hos Simply.com. I skal kun tilføje **én** post.

---

## Gør dette (i Simply.com)

1. Log ind på **Simply.com** → find **smartrep.nu** → åbn **DNS** / **DNS-records** (der hvor I kan se www, app, osv.).

2. Klik **Tilføj post** / **Add record**.

3. Udfyld:
   - **Type:** CNAME  
   - **Navn / Host / Subdomain:** `kundeportal` (ikke kundeportal.smartrep.nu – kun **kundeportal**)  
   - **Værdi / Points to / Target:** `cname.vercel-dns.com`  
   - **TTL:** 300 eller 3600 (eller standard)

4. Gem.

5. Vent 5–15 minutter. Åbn derefter **https://kundeportal.smartrep.nu** i browseren.

---

## Hvis Vercel viste en anden værdi

Da I tilføjede **kundeportal.smartrep.nu** i Vercel (projekt smartrep-portal → Settings → Domains), viste Vercel muligvis en **konkret** CNAME-værdi (fx `cname.vercel-dns.com` eller noget med `vercel-dns`). Brug **præcis den værdi** i stedet for `cname.vercel-dns.com`, hvis I har den.

---

Kort: **Én CNAME-post:** navn = **kundeportal**, værdi = **cname.vercel-dns.com** (eller det Vercel angav). Så peger kundeportal.smartrep.nu på jeres Vercel-portal.
