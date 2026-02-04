// Email Templates for SMARTREP
// Simple, spam-safe HTML templates with brand colors

const BRAND_BLUE = '#0133FF'
const BRAND_DARK = '#1a1a1a'
const BRAND_GRAY = '#666666'
const BRAND_LIGHT = '#f5f5f5'

// Base template wrapper
const baseTemplate = (content, previewText = '') => `
<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SMARTREP</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; background-color: ${BRAND_LIGHT};">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ''}
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_LIGHT};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 30px 40px 20px 40px; border-bottom: 3px solid ${BRAND_BLUE};">
              <img src="https://smartrep.nu/logo.png" alt="SMARTREP" width="150" style="display: block; max-width: 150px;" />
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: ${BRAND_LIGHT}; border-top: 1px solid #e0e0e0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="color: ${BRAND_GRAY}; font-size: 12px; line-height: 18px;">
                    <p style="margin: 0 0 8px 0; font-weight: bold; color: ${BRAND_DARK};">SMARTREP ApS</p>
                    <p style="margin: 0 0 4px 0;">www.smartrep.nu | Tlf. 8282 2572</p>
                    <p style="margin: 0;">info@smartrep.nu</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

// Button component
const button = (text, url, color = BRAND_BLUE) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 25px 0;">
  <tr>
    <td style="border-radius: 6px; background-color: ${color};">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 30px; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 6px;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`

// Divider
const divider = `<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;" />`

// ============================================
// EMAIL TEMPLATES
// ============================================

// 1. Invitation til kundeportal
export const portalInvitationTemplate = ({ recipientName, companyName, loginUrl, tempPassword }) => {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 24px; color: ${BRAND_DARK};">
      Velkommen til SMARTREP Kundeportal
    </h1>
    
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Hej ${recipientName},
    </p>
    
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Du er blevet oprettet som bruger i SMARTREP kundeportalen for <strong>${companyName}</strong>.
    </p>
    
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      I portalen kan du:
    </p>
    
    <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      <li>Oprette og følge dine serviceopgaver</li>
      <li>Se status på igangværende arbejde</li>
      <li>Kommunikere direkte med vores team</li>
      <li>Downloade fotorapporter</li>
    </ul>
    
    ${divider}
    
    <p style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_GRAY};">
      <strong>Dine login-oplysninger:</strong>
    </p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_LIGHT}; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 15px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_GRAY};">
            <strong>Email:</strong> ${recipientName}
          </p>
          <p style="margin: 0; font-size: 14px; color: ${BRAND_GRAY};">
            <strong>Midlertidig adgangskode:</strong> ${tempPassword}
          </p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 20px 0; font-size: 14px; color: ${BRAND_GRAY};">
      Vi anbefaler at du ændrer din adgangskode efter første login.
    </p>
    
    ${button('Log ind på portalen', loginUrl)}
    
    <p style="margin: 20px 0 0 0; font-size: 14px; color: ${BRAND_GRAY};">
      Har du spørgsmål? Kontakt os på <a href="mailto:info@smartrep.nu" style="color: ${BRAND_BLUE};">info@smartrep.nu</a>
    </p>
  `
  
  return baseTemplate(content, `Velkommen til SMARTREP Kundeportal - Log ind og kom i gang`)
}

// 2. Fotorapport modtaget
export const photoReportTemplate = ({ recipientName, taskNumber, address, reportUrl, damageCount }) => {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 24px; color: ${BRAND_DARK};">
      Ny fotorapport klar
    </h1>
    
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Hej ${recipientName},
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Din fotorapport for opgave <strong>#${taskNumber}</strong> er nu klar til gennemsyn.
    </p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_LIGHT}; border-radius: 6px; width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_GRAY};">
            <strong>Opgave:</strong> #${taskNumber}
          </p>
          <p style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_GRAY};">
            <strong>Adresse:</strong> ${address}
          </p>
          <p style="margin: 0; font-size: 14px; color: ${BRAND_GRAY};">
            <strong>Antal registreringer:</strong> ${damageCount} stk.
          </p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Klik på knappen herunder for at se den fulde rapport med billeder.
    </p>
    
    ${button('Se fotorapport', reportUrl)}
    
    <p style="margin: 20px 0 0 0; font-size: 14px; color: ${BRAND_GRAY};">
      Rapporten er også tilgængelig i din kundeportal under "Opgaver".
    </p>
  `
  
  return baseTemplate(content, `Fotorapport klar for opgave #${taskNumber} - ${address}`)
}

// 3. Ny besked fra SMARTREP
export const newMessageTemplate = ({ recipientName, senderName, messagePreview, portalUrl, taskNumber }) => {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 24px; color: ${BRAND_DARK};">
      Ny besked fra SMARTREP
    </h1>
    
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Hej ${recipientName},
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Du har modtaget en ny besked fra <strong>${senderName}</strong>${taskNumber ? ` vedrørende opgave <strong>#${taskNumber}</strong>` : ''}.
    </p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_LIGHT}; border-radius: 6px; width: 100%; margin-bottom: 20px; border-left: 4px solid ${BRAND_BLUE};">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0; font-size: 15px; line-height: 22px; color: ${BRAND_DARK}; font-style: italic;">
            "${messagePreview.length > 200 ? messagePreview.substring(0, 200) + '...' : messagePreview}"
          </p>
        </td>
      </tr>
    </table>
    
    ${button('Læs besked og svar', portalUrl)}
    
    <p style="margin: 20px 0 0 0; font-size: 14px; color: ${BRAND_GRAY};">
      Du kan svare direkte i kundeportalen.
    </p>
  `
  
  return baseTemplate(content, `Ny besked fra ${senderName} - SMARTREP`)
}

// 4. Opgave status ændret
export const taskStatusTemplate = ({ recipientName, taskNumber, address, oldStatus, newStatus, statusMessage, portalUrl }) => {
  // Status colors
  const statusColors = {
    'awaiting_confirmation': '#f59e0b',
    'under_planning': '#3b82f6', 
    'planned': '#22c55e',
    'completed': '#10b981',
    'standby': '#6b7280',
    'cancelled': '#ef4444'
  }
  
  const statusLabels = {
    'awaiting_confirmation': 'Afventer bekræftelse',
    'under_planning': 'Under planlægning',
    'planned': 'Planlagt',
    'completed': 'Udført',
    'standby': 'Standby',
    'cancelled': 'Annulleret'
  }
  
  const statusColor = statusColors[newStatus] || BRAND_BLUE
  const statusLabel = statusLabels[newStatus] || newStatus
  
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 24px; color: ${BRAND_DARK};">
      Opgave status opdateret
    </h1>
    
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Hej ${recipientName},
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Status på din opgave <strong>#${taskNumber}</strong> er blevet opdateret.
    </p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND_LIGHT}; border-radius: 6px; width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: ${BRAND_GRAY};">
            <strong>Opgave:</strong> #${taskNumber}
          </p>
          <p style="margin: 0 0 12px 0; font-size: 14px; color: ${BRAND_GRAY};">
            <strong>Adresse:</strong> ${address}
          </p>
          <p style="margin: 0; font-size: 14px; color: ${BRAND_GRAY};">
            <strong>Ny status:</strong> 
            <span style="display: inline-block; padding: 4px 12px; background-color: ${statusColor}; color: #ffffff; border-radius: 4px; font-size: 13px; font-weight: bold;">
              ${statusLabel}
            </span>
          </p>
        </td>
      </tr>
    </table>
    
    ${statusMessage ? `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      ${statusMessage}
    </p>
    ` : ''}
    
    ${button('Se opgave i portalen', portalUrl)}
    
    <p style="margin: 20px 0 0 0; font-size: 14px; color: ${BRAND_GRAY};">
      Har du spørgsmål? Skriv til os i portalen eller kontakt os på <a href="mailto:info@smartrep.nu" style="color: ${BRAND_BLUE};">info@smartrep.nu</a>
    </p>
  `
  
  return baseTemplate(content, `Opgave #${taskNumber} er nu: ${statusLabel}`)
}

// 5. Bygherre besøgsbekræftelse (bonus)
export const bygherreConfirmationTemplate = ({ bygherreName, address, confirmedDate, timeSlot }) => {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 24px; color: ${BRAND_DARK};">
      Aftale bekræftet
    </h1>
    
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Hej ${bygherreName},
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Tak for din bekræftelse! Vi har registreret din aftale.
    </p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: #dcfce7; border-radius: 6px; width: 100%; margin-bottom: 20px; border-left: 4px solid #22c55e;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 16px; color: #166534; font-weight: bold;">
            ✓ Bekræftet besøg
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_DARK};">
            <strong>Dato:</strong> ${confirmedDate}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_DARK};">
            <strong>Tidspunkt:</strong> ${timeSlot}
          </p>
          <p style="margin: 0; font-size: 14px; color: ${BRAND_DARK};">
            <strong>Adresse:</strong> ${address}
          </p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: ${BRAND_GRAY};">
      Vores tekniker vil ankomme inden for det angivne tidsrum. Hvis du ikke er hjemme, så sørg venligst for at vi har adgang.
    </p>
    
    <p style="margin: 20px 0 0 0; font-size: 14px; color: ${BRAND_GRAY};">
      Ved spørgsmål eller ændringer, kontakt os på <a href="tel:82822572" style="color: ${BRAND_BLUE};">8282 2572</a>
    </p>
  `
  
  return baseTemplate(content, `Bekræftet besøg: ${confirmedDate} kl. ${timeSlot}`)
}

// Export all templates
export default {
  portalInvitation: portalInvitationTemplate,
  photoReport: photoReportTemplate,
  newMessage: newMessageTemplate,
  taskStatus: taskStatusTemplate,
  bygherreConfirmation: bygherreConfirmationTemplate
}
