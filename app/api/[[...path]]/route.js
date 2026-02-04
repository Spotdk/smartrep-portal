import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import twilio from 'twilio'

// MongoDB connection – brug connectPromise for at undgå race conditions og undefined db
let client
let db
let connectPromise = null

// Twilio client
let twilioClient
function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  }
  return twilioClient
}

// Send SMS via Twilio with SMARTREP as sender ID
async function sendSMS(to, message) {
  const client = getTwilioClient()
  if (!client) {
    console.error('Twilio not configured')
    return { success: false, error: 'Twilio not configured' }
  }
  
  try {
    // Ensure phone number has country code
    let phoneNumber = to.replace(/\s/g, '')
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+45' + phoneNumber.replace(/^0+/, '')
    }
    
    // Use alphanumeric sender ID "SMARTREP" instead of phone number
    // Note: Alphanumeric sender IDs are supported in Denmark
    const result = await client.messages.create({
      body: message,
      from: 'SMARTREP',
      to: phoneNumber
    })
    
    console.log('SMS sent successfully:', result.sid)
    return { success: true, sid: result.sid }
  } catch (err) {
    console.error('SMS send error:', err.message)
    return { success: false, error: err.message }
  }
}

// Format time slot for SMS
function formatTimeSlotForSMS(slot) {
  switch(slot) {
    case '08-10': return '08:00-10:00'
    case '10-12': return '10:00-12:00'
    case '12-14': return '12:00-14:00'
    case '08-14': return '08:00-14:00'
    default: return slot || ''
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'smartrep_secret'
const BRAND_BLUE = '#0133FF'

// Email template helper functions
function getEmailBaseTemplate(content, previewText = '') {
  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SMARTREP</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td align="center" style="padding: 30px 40px 20px 40px; border-bottom: 3px solid ${BRAND_BLUE};">
              <h1 style="margin: 0; color: ${BRAND_BLUE}; font-size: 28px; font-weight: bold;">SMARTREP</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f5f5f5; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; text-align: center; color: #666; font-size: 12px;">
                <strong style="color: #1a1a1a;">SMARTREP ApS</strong><br/>
                www.smartrep.nu | Tlf. 8282 2572 | info@smartrep.nu
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getEmailButton(text, url) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 25px 0;">
    <tr>
      <td style="border-radius: 6px; background-color: ${BRAND_BLUE};">
        <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 30px; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 6px;">${text}</a>
      </td>
    </tr>
  </table>`
}

// Send email via SendGrid – bruger SENDGRID_FROM_EMAIL (skal være verifieret i SendGrid)
const SENDGRID_FROM = process.env.SENDGRID_FROM_EMAIL || 'info@smartrep.nu'

async function sendEmailWithTemplate(to, subject, htmlContent) {
  if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'your_sendgrid_key_here') {
    console.log('SendGrid not configured, skipping email')
    return { success: false, error: 'SendGrid ikke konfigureret. Sæt SENDGRID_API_KEY i .env.local (og på Vercel ved deploy).' }
  }
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: SENDGRID_FROM, name: 'SMARTREP' },
        subject: subject,
        content: [{ type: 'text/html', value: htmlContent }]
      })
    })
    
    const errorText = await response.text()
    if (response.ok || response.status === 202) {
      console.log('Email sent successfully to', to)
      return { success: true }
    }
    console.error('SendGrid error:', response.status, errorText)
    return { success: false, error: `SendGrid ${response.status}: ${errorText || response.statusText}` }
  } catch (err) {
    console.error('Email send error:', err.message)
    return { success: false, error: err.message }
  }
}

// Email Templates
const EmailTemplates = {
  // Portal invitation
  portalInvitation: ({ recipientName, companyName, email, tempPassword, loginUrl }) => {
    const content = `
      <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #1a1a1a;">Velkommen til SMARTREP Kundeportal</h2>
      <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #666;">Hej ${recipientName},</p>
      <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #666;">Du er blevet oprettet som bruger i SMARTREP kundeportalen for <strong>${companyName}</strong>.</p>
      <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #666;">I portalen kan du:</p>
      <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 16px; line-height: 24px; color: #666;">
        <li>Oprette og følge dine serviceopgaver</li>
        <li>Se status på igangværende arbejde</li>
        <li>Kommunikere direkte med vores team</li>
        <li>Downloade fotorapporter</li>
      </ul>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;" />
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong>Dine login-oplysninger:</strong></p>
      <table style="background-color: #f5f5f5; border-radius: 6px; margin-bottom: 20px; width: 100%;">
        <tr><td style="padding: 15px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0; font-size: 14px; color: #666;"><strong>Midlertidig adgangskode:</strong> ${tempPassword}</p>
        </td></tr>
      </table>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">Vi anbefaler at du ændrer din adgangskode efter første login.</p>
      ${getEmailButton('Log ind på portalen', loginUrl)}
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">Har du spørgsmål? Kontakt os på <a href="mailto:info@smartrep.nu" style="color: ${BRAND_BLUE};">info@smartrep.nu</a></p>
    `
    return getEmailBaseTemplate(content, 'Velkommen til SMARTREP Kundeportal')
  },
  
  // Photo report
  photoReport: ({ recipientName, taskNumber, address, reportUrl, damageCount }) => {
    const content = `
      <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #1a1a1a;">Ny fotorapport klar</h2>
      <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #666;">Hej ${recipientName},</p>
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #666;">Din fotorapport for opgave <strong>#${taskNumber}</strong> er nu klar til gennemsyn.</p>
      <table style="background-color: #f5f5f5; border-radius: 6px; width: 100%; margin-bottom: 20px;">
        <tr><td style="padding: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong>Opgave:</strong> #${taskNumber}</p>
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong>Adresse:</strong> ${address}</p>
          <p style="margin: 0; font-size: 14px; color: #666;"><strong>Antal registreringer:</strong> ${damageCount} stk.</p>
        </td></tr>
      </table>
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #666;">Klik på knappen herunder for at se den fulde rapport med billeder.</p>
      ${getEmailButton('Se fotorapport', reportUrl)}
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">Rapporten er også tilgængelig i din kundeportal under "Opgaver".</p>
    `
    return getEmailBaseTemplate(content, `Fotorapport klar for opgave #${taskNumber}`)
  },
  
  // New message
  newMessage: ({ recipientName, senderName, messagePreview, portalUrl, taskNumber }) => {
    const content = `
      <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #1a1a1a;">Ny besked fra SMARTREP</h2>
      <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #666;">Hej ${recipientName},</p>
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #666;">Du har modtaget en ny besked fra <strong>${senderName}</strong>${taskNumber ? ` vedrørende opgave <strong>#${taskNumber}</strong>` : ''}.</p>
      <table style="background-color: #f5f5f5; border-radius: 6px; width: 100%; margin-bottom: 20px; border-left: 4px solid ${BRAND_BLUE};">
        <tr><td style="padding: 20px;">
          <p style="margin: 0; font-size: 15px; line-height: 22px; color: #1a1a1a; font-style: italic;">"${messagePreview.length > 200 ? messagePreview.substring(0, 200) + '...' : messagePreview}"</p>
        </td></tr>
      </table>
      ${getEmailButton('Læs besked og svar', portalUrl)}
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">Du kan svare direkte i kundeportalen.</p>
    `
    return getEmailBaseTemplate(content, `Ny besked fra ${senderName}`)
  },
  
  // Task status changed
  taskStatus: ({ recipientName, taskNumber, address, newStatus, statusMessage, portalUrl }) => {
    const statusLabels = {
      'awaiting_confirmation': 'Afventer bekræftelse',
      'under_planning': 'Under planlægning',
      'planned': 'Planlagt',
      'completed': 'Udført',
      'standby': 'Standby',
      'cancelled': 'Annulleret'
    }
    const statusColors = {
      'awaiting_confirmation': '#f59e0b',
      'under_planning': '#3b82f6',
      'planned': '#22c55e',
      'completed': '#10b981',
      'standby': '#6b7280',
      'cancelled': '#ef4444'
    }
    const statusLabel = statusLabels[newStatus] || newStatus
    const statusColor = statusColors[newStatus] || BRAND_BLUE
    
    const content = `
      <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #1a1a1a;">Opgave status opdateret</h2>
      <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #666;">Hej ${recipientName},</p>
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #666;">Status på din opgave <strong>#${taskNumber}</strong> er blevet opdateret.</p>
      <table style="background-color: #f5f5f5; border-radius: 6px; width: 100%; margin-bottom: 20px;">
        <tr><td style="padding: 20px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;"><strong>Opgave:</strong> #${taskNumber}</p>
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;"><strong>Adresse:</strong> ${address}</p>
          <p style="margin: 0; font-size: 14px; color: #666;"><strong>Ny status:</strong> <span style="display: inline-block; padding: 4px 12px; background-color: ${statusColor}; color: #ffffff; border-radius: 4px; font-size: 13px; font-weight: bold;">${statusLabel}</span></p>
        </td></tr>
      </table>
      ${statusMessage ? `<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #666;">${statusMessage}</p>` : ''}
      ${getEmailButton('Se opgave i portalen', portalUrl)}
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">Har du spørgsmål? Skriv til os i portalen.</p>
    `
    return getEmailBaseTemplate(content, `Opgave #${taskNumber} er nu: ${statusLabel}`)
  }
}

async function connectToMongo() {
  // Return cached db hvis vi allerede har en gyldig forbindelse
  if (db) return db

  // Serialiser forbindelsesforsøg – undgå race hvor client sættes men db aldrig bliver sat
  if (!connectPromise) {
    connectPromise = (async () => {
      const uri = process.env.MONGO_URL
      const options = {
        serverSelectionTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: false
      }
      const c = new MongoClient(uri, options)
      await c.connect()
      const database = c.db(process.env.DB_NAME || 'smartrep_portal')
      client = c
      db = database
      return database
    })()
  }

  try {
    const result = await connectPromise
    if (!result) throw new Error('Database connection returned undefined')
    return result
  } catch (err) {
    connectPromise = null
    client = null
    db = null
    throw err
  }
}

// Initialize default data
async function initializeData(db) {
  const usersCollection = db.collection('users')
  const adminExists = await usersCollection.findOne({ email: 'admin@smartrep.dk' })
  
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    // Create admin user
    await usersCollection.insertOne({
      id: uuidv4(),
      email: 'admin@smartrep.dk',
      password: hashedPassword,
      name: 'SMARTREP Admin',
      role: 'admin',
      phone: '+45 8282 2572',
      createdAt: new Date()
    })

    // Create demo technician
    await usersCollection.insertOne({
      id: uuidv4(),
      email: 'tekniker@smartrep.dk',
      password: hashedPassword,
      name: 'Thomas Tekniker',
      role: 'technician',
      phone: '+45 2233 4455',
      createdAt: new Date()
    })

    // Create demo company
    const companyId = uuidv4()
    await db.collection('companies').insertOne({
      id: companyId,
      name: 'HusCompagniet Aarhus',
      address: 'Industrivej 45',
      postalCode: '8000',
      city: 'Aarhus C',
      invoiceEmail: 'faktura@huscompagniet.dk',
      phone: '+45 7020 3040',
      createdAt: new Date()
    })

    // Create demo customer user
    await usersCollection.insertOne({
      id: uuidv4(),
      email: 'kunde@huscompagniet.dk',
      password: hashedPassword,
      name: 'Peter Madsen',
      role: 'customer',
      companyId: companyId,
      phone: '+45 2021 3077',
      position: 'Byggeleder',
      createdAt: new Date()
    })

    // Create demo task
    await db.collection('tasks').insertOne({
      id: uuidv4(),
      taskNumber: 1,
      companyId: companyId,
      companyName: 'HusCompagniet Aarhus',
      contactName: 'Peter Madsen',
      contactPhone: '+45 2021 3077',
      contactEmail: 'kunde@huscompagniet.dk',
      address: 'Havnegade 33',
      postalCode: '5000',
      city: 'Odense C',
      caseNumber: 'HC-2025-001',
      isHouseEmpty: false,
      owner1Name: 'Peter Madsen',
      owner1Phone: '+45 2021 3077',
      owner2Name: 'Anne Madsen',
      owner2Phone: '+45 3045 6789',
      status: 'under_planning',
      category: 'service',
      weatherType: 'sun',
      estimatedTime: 3,
      deadline: new Date('2025-07-15'),
      deadlineLocked: false,
      createdAt: new Date(),
      idDays: 0,
      damages: [
        { id: uuidv4(), part: 'aluprofil', quantity: 2, color: 'granit_70', location: 'sovevaerelse', notes: '' },
        { id: uuidv4(), part: 'glas', quantity: 1, color: 'not_specified', location: 'stue', notes: 'Termorude mod have' }
      ],
      types: ['ALU', 'GLA'],
      notes: 'Demo opgave'
    })
  }
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// Get user from token
function getUserFromToken(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Status labels
const STATUS_LABELS = {
  'awaiting_confirmation': 'Afventer bekræftelse',
  'under_planning': 'Under planlægning',
  'planned': 'Planlagt',
  'cancelled': 'Aflyst',
  'standby': 'Standby',
  'completed': 'Udført',
  'archived': 'Arkiveret'
}

// Building parts
const BUILDING_PARTS = [
  { value: 'pladedoer', label: 'Pladedør' },
  { value: 'aluprofil', label: 'Aluprofil' },
  { value: 'bundstykke', label: 'Bundstykke' },
  { value: 'traekarm', label: 'Trækarm' },
  { value: 'hjoerneprofil', label: 'Hjørneprofil' },
  { value: 'glas', label: 'Glas' },
  { value: 'komposit_bundstykke', label: 'Komposit bundstykke' },
  { value: 'indv_karm', label: 'Indv. karm' },
  { value: 'andet', label: 'Andet' }
]

// Colors
const COLORS = [
  { value: 'granit_80', label: 'Granit 80 (sort)' },
  { value: 'granit_60', label: 'Granit 60 (mørkegrå)' },
  { value: 'granit_70', label: 'Granit 70 (blågrøn)' },
  { value: 'granit_30', label: 'Granit 30 (grå)' },
  { value: 'sort', label: 'Sort' },
  { value: 'hvid', label: 'Hvid' },
  { value: 'soelv', label: 'Sølv' },
  { value: 'ral_7016', label: 'RAL 7016' },
  { value: 'not_specified', label: 'Ikke angivet' }
]

// Locations
const LOCATIONS = [
  { value: 'koekken', label: 'Køkken' },
  { value: 'indgang', label: 'Indgang' },
  { value: 'entre', label: 'Entré' },
  { value: 'alrum', label: 'Alrum' },
  { value: 'stue', label: 'Stue' },
  { value: 'boernevaerelse', label: 'Børneværelse' },
  { value: 'sovevaerelse', label: 'Soveværelse' },
  { value: 'lille_bad', label: 'Lille bad' },
  { value: 'stort_bad', label: 'Stort bad' },
  { value: 'kontor', label: 'Kontor' },
  { value: 'garage', label: 'Garage' },
  { value: 'oevrigt', label: 'Øvrigt' }
]

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    if (!process.env.MONGO_URL?.trim()) {
      return handleCORS(NextResponse.json(
        { error: 'MONGO_URL er ikke sat i Vercel. Gå til Projekt → Settings → Environment Variables og tilføj MONGO_URL med din MongoDB Atlas connection string.' },
        { status: 503 }
      ))
    }
    const db = await connectToMongo()
    await initializeData(db)

    // ============ AUTH ROUTES ============
    
    // Login - POST /api/auth/login
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const { email, password } = body

      if (!email || !password) {
        return handleCORS(NextResponse.json(
          { error: 'Email og password er påkrævet' },
          { status: 400 }
        ))
      }

      // Check both users (customers) and staff_users collections
      let user = await db.collection('users').findOne({ email: email.toLowerCase() })
      let isStaffUser = false
      
      if (!user) {
        user = await db.collection('staff_users').findOne({ email: email.toLowerCase() })
        isStaffUser = true
      }
      
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: 'Ugyldige loginoplysninger' },
          { status: 401 }
        ))
      }

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return handleCORS(NextResponse.json(
          { error: 'Ugyldige loginoplysninger' },
          { status: 401 }
        ))
      }

      // For staff users, use primary role or first role as main role
      const primaryRole = isStaffUser 
        ? (user.roles?.includes('admin') ? 'admin' : user.roles?.[0] || 'technician')
        : user.role

      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: primaryRole,
          roles: user.roles || [user.role], // Include all roles for staff users
          companyId: user.companyId, 
          name: user.name,
          isStaffUser
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      const { password: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json({ token, user: userWithoutPassword }))
    }

    // Get current user - GET /api/auth/me
    if (route === '/auth/me' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      // Personale (Luise, Jan osv.) ligger i staff_users, kunder i users
      let fullUser = await db.collection('users').findOne({ id: user.id })
      if (!fullUser && user.isStaffUser) {
        fullUser = await db.collection('staff_users').findOne({ id: user.id })
      }
      if (!fullUser) {
        return handleCORS(NextResponse.json({ error: 'Bruger ikke fundet' }, { status: 404 }))
      }

      const { password: _, ...userWithoutPassword } = fullUser
      return handleCORS(NextResponse.json(userWithoutPassword))
    }

    // Resend password - POST /api/auth/resend-password
    if (route === '/auth/resend-password' && method === 'POST') {
      const adminUser = getUserFromToken(request)
      if (!adminUser || adminUser.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      const { email } = body

      const user = await db.collection('users').findOne({ email })
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Bruger ikke fundet' }, { status: 404 }))
      }

      // Generate new random password
      const newPassword = Math.random().toString(36).slice(-8) + 'A1!'
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update user with new password
      await db.collection('users').updateOne(
        { id: user.id },
        { $set: { password: hashedPassword, passwordResetAt: new Date() } }
      )

      // Send email with new password via SendGrid
      if (process.env.SENDGRID_API_KEY) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0133ff; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">SMARTREP</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #111827;">Hej ${user.name},</h2>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Dit password til SMARTREP kundeportalen er blevet nulstillet.
              </p>
              <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #6b7280;">Dit nye password:</p>
                <p style="margin: 0; font-size: 24px; font-family: monospace; color: #111827; font-weight: bold;">${newPassword}</p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Log ind på: <a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="color: #0133ff;">${process.env.NEXT_PUBLIC_BASE_URL}</a>
              </p>
              <p style="color: #ef4444; font-size: 14px;">
                Vi anbefaler at du ændrer dit password efter første login.
              </p>
            </div>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              <p>Denne email er sendt automatisk fra SMARTREP kundeportal.</p>
            </div>
          </div>
        `

        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: user.email, name: user.name }] }],
            from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@smartrep.dk', name: 'SMARTREP' },
            subject: 'SMARTREP: Dit nye password',
            content: [{ type: 'text/html', value: emailHtml }]
          })
        })
      }

      // Log communication
      await db.collection('communications').insertOne({
        id: uuidv4(),
        type: 'email',
        template: 'password_reset',
        to: user.email,
        toName: user.name,
        subject: 'Dit nye password',
        status: 'sent',
        sentAt: new Date(),
        sentBy: adminUser.id,
        createdAt: new Date()
      })

      return handleCORS(NextResponse.json({ success: true, message: 'Password sendt til ' + email }))
    }

    // ============ COMPANIES ROUTES ============
    
    // Get all companies - GET /api/companies
    if (route === '/companies' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }
      
      // Admin and technicians can see all companies, customers only see their own
      let query = {}
      if (user.role === 'customer') {
        query.id = user.companyId
      }

      const companies = await db.collection('companies').find(query).sort({ name: 1 }).toArray()
      const cleaned = companies.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Create company - POST /api/companies
    if (route === '/companies' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      const company = {
        id: uuidv4(),
        name: body.name,
        address: body.address || '',
        postalCode: body.postalCode || '',
        city: body.city || '',
        invoiceEmail: body.invoiceEmail || '',
        phone: body.phone || '',
        createdAt: new Date()
      }

      await db.collection('companies').insertOne(company)
      return handleCORS(NextResponse.json(company))
    }

    // Get single company - GET /api/companies/:id
    if (route.startsWith('/companies/') && method === 'GET' && path.length === 2) {
      const companyId = path[1]
      const company = await db.collection('companies').findOne({ id: companyId })
      if (!company) {
        return handleCORS(NextResponse.json({ error: 'Firma ikke fundet' }, { status: 404 }))
      }
      const { _id, ...rest } = company
      return handleCORS(NextResponse.json(rest))
    }

    // Update company - PUT /api/companies/:id
    if (route.startsWith('/companies/') && method === 'PUT' && path.length === 2) {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const companyId = path[1]
      const body = await request.json()
      
      await db.collection('companies').updateOne(
        { id: companyId },
        { $set: { ...body, updatedAt: new Date() } }
      )

      const updated = await db.collection('companies').findOne({ id: companyId })
      const { _id, ...rest } = updated
      return handleCORS(NextResponse.json(rest))
    }

    // Delete company - DELETE /api/companies/:id
    if (route.startsWith('/companies/') && method === 'DELETE' && path.length === 2) {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const companyId = path[1]
      await db.collection('companies').deleteOne({ id: companyId })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ CONTACTS (USERS) ROUTES ============
    
    // Get all users - GET /api/users (contacts/customers only)
    if (route === '/users' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      let query = { role: 'customer' }
      if (user.role === 'customer') {
        query.companyId = user.companyId
      }

      const users = await db.collection('users').find(query).sort({ name: 1 }).toArray()
      const cleaned = users.map(({ _id, password, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }
    
    // Get all contacts - GET /api/contacts
    if (route === '/contacts' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      let query = { role: 'customer' }
      if (user.role === 'customer') {
        query.companyId = user.companyId
      }

      const contacts = await db.collection('users').find(query).sort({ name: 1 }).toArray()
      const cleaned = contacts.map(({ _id, password, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Create contact - POST /api/contacts
    if (route === '/contacts' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      const hashedPassword = await bcrypt.hash(body.password || 'welcome123', 12)
      
      const contact = {
        id: uuidv4(),
        email: body.email.toLowerCase(),
        password: hashedPassword,
        name: body.name,
        role: 'customer',
        companyId: body.companyId,
        phone: body.phone || '',
        position: body.position || '',
        createdAt: new Date()
      }

      await db.collection('users').insertOne(contact)
      const { password: _, ...contactWithoutPassword } = contact
      return handleCORS(NextResponse.json(contactWithoutPassword))
    }

    // Update contact - PUT /api/contacts/:id
    if (route.match(/^\/contacts\/[^/]+$/) && method === 'PUT') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const contactId = path[1]
      const body = await request.json()
      
      const updateData = {
        name: body.name,
        email: body.email?.toLowerCase(),
        phone: body.phone || '',
        position: body.position || '',
        companyId: body.companyId,
        updatedAt: new Date()
      }

      // Handle admin flag
      if (body.isAdmin !== undefined) {
        updateData.isCompanyAdmin = body.isAdmin
      }

      // Handle portal access
      if (body.hasPortalAccess !== undefined) {
        updateData.hasPortalAccess = body.hasPortalAccess
      }

      // Update password only if provided
      if (body.password) {
        updateData.password = await bcrypt.hash(body.password, 12)
      }

      const result = await db.collection('users').findOneAndUpdate(
        { id: contactId },
        { $set: updateData },
        { returnDocument: 'after' }
      )

      if (!result) {
        return handleCORS(NextResponse.json({ error: 'Kontakt ikke fundet' }, { status: 404 }))
      }

      // IMPORTANT: Update all tasks that reference this contact with new info
      const tasksUpdated = await db.collection('tasks').updateMany(
        { contactId: contactId },
        { 
          $set: { 
            contactName: body.name,
            contactEmail: body.email?.toLowerCase() || '',
            contactPhone: body.phone || ''
          } 
        }
      )
      console.log(`Updated ${tasksUpdated.modifiedCount} tasks with new contact info for ${body.name}`)

      const { password: _, _id, ...contactWithoutPassword } = result
      return handleCORS(NextResponse.json({
        ...contactWithoutPassword,
        tasksUpdated: tasksUpdated.modifiedCount
      }))
    }

    // Delete contact - DELETE /api/contacts/:id
    if (route.match(/^\/contacts\/[^/]+$/) && method === 'DELETE') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const contactId = path[1]
      await db.collection('users').deleteOne({ id: contactId })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ TECHNICIANS ROUTES ============
    
    // Get all technicians - GET /api/technicians
    if (route === '/technicians' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const technicians = await db.collection('users').find({ role: 'technician' }).sort({ name: 1 }).toArray()
      const cleaned = technicians.map(({ _id, password, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // ============ STAFF USERS ROUTES ============
    
    // Get all staff users - GET /api/staff-users
    if (route === '/staff-users' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const staffUsers = await db.collection('staff_users').find({}).sort({ name: 1 }).toArray()
      const cleaned = staffUsers.map(({ _id, password, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Create staff user - POST /api/staff-users
    if (route === '/staff-users' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      
      // Check if email already exists
      const existingUser = await db.collection('staff_users').findOne({ email: body.email.toLowerCase() })
      if (existingUser) {
        return handleCORS(NextResponse.json({ error: 'En bruger med denne email eksisterer allerede' }, { status: 400 }))
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(body.password, 10)
      
      const staffUser = {
        id: uuidv4(),
        name: body.name,
        address: body.address,
        email: body.email.toLowerCase(),
        phone: body.phone || '',
        roles: body.roles || [],
        password: hashedPassword,
        createdAt: new Date(),
        isActive: true
      }

      await db.collection('staff_users').insertOne(staffUser)
      
      // Return without password
      const { password: _, _id, ...userWithoutPassword } = staffUser
      return handleCORS(NextResponse.json(userWithoutPassword))
    }

    // Update staff user - PUT /api/staff-users/:id
    if (route.startsWith('/staff-users/') && method === 'PUT' && path.length === 2) {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const userId = path[1]
      const body = await request.json()
      
      const updateData = {
        name: body.name,
        address: body.address,
        email: body.email.toLowerCase(),
        phone: body.phone || '',
        roles: body.roles || [],
        updatedAt: new Date()
      }

      // Only update password if provided
      if (body.password) {
        updateData.password = await bcrypt.hash(body.password, 10)
      }

      await db.collection('staff_users').updateOne(
        { id: userId },
        { $set: updateData }
      )

      const updated = await db.collection('staff_users').findOne({ id: userId })
      const { _id, password: _, ...rest } = updated
      return handleCORS(NextResponse.json(rest))
    }

    // Delete staff user - DELETE /api/staff-users/:id
    if (route.startsWith('/staff-users/') && method === 'DELETE' && path.length === 2) {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const userId = path[1]
      await db.collection('staff_users').deleteOne({ id: userId })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ CALENDAR SETTINGS ROUTES ============
    
    // Get calendar settings - GET /api/calendar-settings
    if (route === '/calendar-settings' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const settings = await db.collection('calendar_settings').findOne({ userId: user.id })
      const defaultSettings = {
        activeTechnicians: [],
        viewType: 'work_week'
      }
      
      return handleCORS(NextResponse.json(settings || defaultSettings))
    }

    // Save calendar settings - POST /api/calendar-settings
    if (route === '/calendar-settings' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      
      await db.collection('calendar_settings').updateOne(
        { userId: user.id },
        { 
          $set: {
            ...body,
            userId: user.id,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ TASKS ROUTES ============
    
    // Get all tasks - GET /api/tasks
    if (route === '/tasks' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      let query = {}
      
      // Customers only see their own tasks
      if (user.role === 'customer') {
        query.companyId = user.companyId
      }
      
      // Technicians see all planned/under_planning tasks (not filtered by technicianId for now)
      if (user.role === 'technician') {
        query.status = { $in: ['planned', 'under_planning'] }
      }

      // Filter by status if provided
      const url = new URL(request.url)
      const status = url.searchParams.get('status')
      const tab = url.searchParams.get('tab')
      const all = url.searchParams.get('all')

      // If all=true, return all tasks (for search across tabs)
      if (all === 'true') {
        // For customers, still filter by companyId but show all statuses
        // For admin, show all
        // Already filtered by companyId for customers above
      } else if (status) {
        query.status = status
      } else if (tab) {
        switch (tab) {
          case 'new':
            query.status = 'awaiting_confirmation'
            break
          case 'active':
            query.status = 'under_planning'
            break
          case 'all_active':
            // For customers - show all active statuses
            query.status = { $in: ['awaiting_confirmation', 'under_planning', 'planned'] }
            break
          case 'planned':
            query.status = 'planned'
            break
          case 'cancelled':
            query.status = 'cancelled'
            break
          case 'standby':
            query.status = 'standby'
            break
          case 'completed':
            query.status = 'completed'
            break
          case 'archived':
            query.status = 'archived'
            break
        }
      }

      const tasks = await db.collection('tasks').find(query).sort({ createdAt: -1 }).toArray()
      
      // Calculate ID days for each task
      const now = new Date()
      const tasksWithIdDays = tasks.map(({ _id, ...task }) => {
        const created = new Date(task.createdAt)
        const diffTime = Math.abs(now - created)
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        return { ...task, idDays: diffDays }
      })

      return handleCORS(NextResponse.json(tasksWithIdDays))
    }

    // Create task - POST /api/tasks
    if (route === '/tasks' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      
      // Get next task number (starting at 85 if no tasks exist)
      const lastTask = await db.collection('tasks').find({}).sort({ taskNumber: -1 }).limit(1).toArray()
      const nextTaskNumber = lastTask.length > 0 ? Math.max(lastTask[0].taskNumber + 1, 85) : 85

      const task = {
        id: uuidv4(),
        taskNumber: nextTaskNumber,
        companyId: body.companyId || user.companyId,
        companyName: body.companyName || '',
        contactId: body.contactId || null,  // Store contact reference
        contactName: body.contactName || user.name,
        contactPhone: body.contactPhone || '',
        contactEmail: body.contactEmail || user.email,
        address: body.address || '',
        postalCode: body.postalCode || '',
        city: body.city || '',
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        caseNumber: body.caseNumber || '',
        isHouseEmpty: body.isHouseEmpty || false,
        preDeliveryDate: body.preDeliveryDate || null,
        deliveryDate: body.deliveryDate || null,
        owner1Name: body.owner1Name || '',
        owner1Phone: body.owner1Phone || '',
        owner2Name: body.owner2Name || '',
        owner2Phone: body.owner2Phone || '',
        status: user.role === 'customer' ? 'awaiting_confirmation' : (body.status || 'awaiting_confirmation'),
        category: body.category || 'service',
        weatherType: body.weatherType || 'sun',
        estimatedTime: body.estimatedTime || 2,
        deadline: body.deadline || null,
        deadlineLocked: body.deadlineLocked || false,
        taskType: (Array.isArray(body.types) && body.types.length) ? body.types[0] : (body.taskType || 'ALU'),
        damages: body.damages || [],
        types: Array.isArray(body.types) ? body.types : (body.taskType ? [body.taskType] : []),
        taskSummary: body.taskSummary || '',
        notes: body.notes || '',
        files: body.files || [],
        technicianId: body.technicianId || null,
        plannedDate: body.plannedDate || null,
        createdAt: new Date(),
        createdBy: user.id,
        idDays: 0
      }

      await db.collection('tasks').insertOne(task)
      
      // Log task creation
      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        entityType: 'task',
        entityId: task.id,
        taskId: task.id,
        action: 'created',
        description: `Opgave #${task.taskNumber} oprettet: ${task.address}, ${task.city}`,
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      })
      
      return handleCORS(NextResponse.json(task))
    }

    // ============ TASK COUNTS ============
    // Get task counts - GET /api/tasks/counts (MUST be before /tasks/:id routes)
    if (route === '/tasks/counts' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      let baseQuery = {}
      if (user.role === 'customer') {
        baseQuery.companyId = user.companyId
      }

      const counts = {
        new: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'awaiting_confirmation' }),
        active: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'under_planning' }),
        planned: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'planned' }),
        cancelled: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'cancelled' }),
        standby: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'standby' }),
        completed: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'completed' }),
        archived: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'archived' }),
        total: await db.collection('tasks').countDocuments(baseQuery),
        awaitingOrderResponse: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'awaiting_confirmation', orderConfirmationStatus: 'sent' }),
        orderResponseReceived: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'awaiting_confirmation', orderConfirmationStatus: 'response_received' })
      }

      return handleCORS(NextResponse.json(counts))
    }

    // Get single task - GET /api/tasks/:id
    if (route.startsWith('/tasks/') && method === 'GET' && path.length === 2) {
      const taskId = path[1]
      const task = await db.collection('tasks').findOne({ id: taskId })
      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Opgave ikke fundet' }, { status: 404 }))
      }
      const { _id, ...rest } = task
      return handleCORS(NextResponse.json(rest))
    }

    // Update task - PUT /api/tasks/:id
    if (route.startsWith('/tasks/') && method === 'PUT' && path.length === 2) {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const taskId = path[1]
      const body = await request.json()
      
      // Remove _id if present
      delete body._id
      
      // If contactId is being updated, fetch the new contact info
      if (body.contactId) {
        const contact = await db.collection('users').findOne({ id: body.contactId })
        if (contact) {
          body.contactName = contact.name
          body.contactEmail = contact.email
          body.contactPhone = contact.phone || ''
        }
      }

      // Type: flere tags – body.types (array) har prioritet; ellers taskType → types
      if (Array.isArray(body.types)) {
        body.taskType = body.types[0] || null
      } else if (body.taskType !== undefined) {
        body.types = body.taskType ? [body.taskType] : []
      }
      
      await db.collection('tasks').updateOne(
        { id: taskId },
        { $set: { ...body, updatedAt: new Date() } }
      )

      const updated = await db.collection('tasks').findOne({ id: taskId })
      const { _id, ...rest } = updated
      return handleCORS(NextResponse.json(rest))
    }

    // Update task status - PATCH /api/tasks/:id/status
    if (route.match(/^\/tasks\/[^/]+\/status$/) && method === 'PATCH') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const taskId = path[1]
      const body = await request.json()
      
      const statusNames = {
        'awaiting_confirmation': 'Afventer bekræftelse',
        'under_planning': 'Under planlægning', 
        'planned': 'Planlagt',
        'completed': 'Afsluttet',
        'cancelled': 'Aflyst',
        'standby': 'Standby',
        'archived': 'Arkiveret'
      }
      
      await db.collection('tasks').updateOne(
        { id: taskId },
        { $set: { status: body.status, updatedAt: new Date() } }
      )

      // Log status change to both collections
      const logEntry = {
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        taskId: taskId,
        action: 'status_changed',
        fromStatus: body.fromStatus,
        toStatus: body.status,
        description: `Status ændret: ${statusNames[body.fromStatus] || body.fromStatus} → ${statusNames[body.status] || body.status}`,
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      }
      
      await db.collection('activity_logs').insertOne(logEntry)
      await db.collection('task_logs').insertOne(logEntry)

      // Automatic notifications for 'planned' and 'completed' status
      const task = await db.collection('tasks').findOne({ id: taskId })
      if (task && (body.status === 'planned' || body.status === 'completed')) {
        const statusText = body.status === 'planned' ? 'planlagt' : 'udført'
        const notificationMessage = `Hej! Opgave #${task.taskNumber} på ${task.address} er nu ${statusText}. Mvh SMARTREP`
        
        // Log automatic notification
        await db.collection('communications').insertOne({
          id: uuidv4(),
          type: 'auto_notification',
          taskId: taskId,
          to: task.contactEmail || task.contactPhone,
          message: notificationMessage,
          status: 'queued',
          triggerStatus: body.status,
          createdAt: new Date()
        })
      }

      const updated = await db.collection('tasks').findOne({ id: taskId })
      const { _id, ...rest } = updated
      return handleCORS(NextResponse.json(rest))
    }

    // Delete task - DELETE /api/tasks/:id
    if (route.startsWith('/tasks/') && method === 'DELETE' && path.length === 2) {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const taskId = path[1]
      
      // Move to archived instead of deleting
      await db.collection('tasks').updateOne(
        { id: taskId },
        { $set: { status: 'archived', deletedAt: new Date() } }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ PHOTO REPORTS (NY IMPLEMENTATION) ============
    
    // List photo reports - GET /api/photoreports
    // Query params: status (draft/sent/reviewed/all)
    if (route === '/photoreports' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const statusFilter = url.searchParams.get('status')
      
      let query = {}
      if (user.role === 'customer') {
        query.companyId = user.companyId
      }
      if (statusFilter && statusFilter !== 'all') {
        query.status = statusFilter
      }

      const reports = await db.collection('photo_reports').find(query).sort({ createdAt: -1 }).toArray()
      
      // Enrich with task info
      const enrichedReports = await Promise.all(reports.map(async (report) => {
        const task = await db.collection('tasks').findOne({ id: report.taskId })
        const { _id, ...rest } = report
        return {
          ...rest,
          taskNumber: task?.taskNumber,
          taskAddress: task?.address,
          taskCity: task?.city,
          companyName: task?.companyName
        }
      }))
      
      return handleCORS(NextResponse.json(enrichedReports))
    }

    // Create photo report - POST /api/photoreports
    // Opretter som DRAFT - sender IKKE automatisk
    if (route === '/photoreports' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      
      // Get task info
      const task = await db.collection('tasks').findOne({ id: body.taskId })
      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Opgave ikke fundet' }, { status: 404 }))
      }
      
      // Generate unique review token (bruges når rapporten sendes)
      const reviewToken = uuidv4()
      
      const report = {
        id: uuidv4(),
        taskId: body.taskId,
        companyId: body.companyId || task.companyId,
        // Contact info
        contactName: body.contactName || task.contactName || task.owner1Name || '',
        contactEmail: body.contactEmail || task.contactEmail || '',
        contactPhone: body.contactPhone || task.contactPhone || task.owner1Phone || '',
        // Address
        address: body.address || task.address || '',
        postalCode: body.postalCode || task.postalCode || '',
        city: body.city || task.city || '',
        // Damages
        damages: (body.damages || []).map(d => ({
          id: d.id || uuidv4(),
          item: d.item || '',
          type: d.type || '',
          location: d.location || '',
          notes: d.notes || '',
          closeupPhoto: d.closeupPhoto || null,
          locationPhoto: d.locationPhoto || null,
          status: 'pending' // pending, approved, rejected
        })),
        // Status: draft → sent → reviewed
        status: 'draft',
        notes: body.notes || '',
        // Review fields
        reviewToken: reviewToken,
        reviewUrl: null, // Set when sent
        sentAt: null,
        smsSent: false,
        emailSent: false,
        // Approval fields
        reviewedAt: null,
        reviewerName: null,
        reviewerSignature: null,
        // Meta
        createdBy: user.id,
        createdByName: user.name,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.collection('photo_reports').insertOne(report)
      
      const { _id, ...cleanReport } = report
      return handleCORS(NextResponse.json(cleanReport, { status: 201 }))
    }

    // Get single photo report - GET /api/photoreports/:id
    if (route.match(/^\/photoreports\/[^/]+$/) && method === 'GET' && path.length === 2 && path[1] !== 'public') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const reportId = path[1]
      const report = await db.collection('photo_reports').findOne({ id: reportId })
      
      if (!report) {
        return handleCORS(NextResponse.json({ error: 'Rapport ikke fundet' }, { status: 404 }))
      }

      // Get task info
      const task = await db.collection('tasks').findOne({ id: report.taskId })
      
      const { _id, ...rest } = report
      return handleCORS(NextResponse.json({
        ...rest,
        taskNumber: task?.taskNumber,
        taskAddress: task?.address,
        taskCity: task?.city,
        companyName: task?.companyName
      }))
    }

    // Update photo report - PUT /api/photoreports/:id
    if (route.match(/^\/photoreports\/[^/]+$/) && method === 'PUT' && path.length === 2) {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const reportId = path[1]
      const body = await request.json()
      
      const report = await db.collection('photo_reports').findOne({ id: reportId })
      if (!report) {
        return handleCORS(NextResponse.json({ error: 'Rapport ikke fundet' }, { status: 404 }))
      }

      // Only allow updates if draft
      if (report.status !== 'draft') {
        return handleCORS(NextResponse.json({ error: 'Kun kladder kan redigeres' }, { status: 400 }))
      }

      await db.collection('photo_reports').updateOne(
        { id: reportId },
        { $set: { ...body, updatedAt: new Date() } }
      )

      const updated = await db.collection('photo_reports').findOne({ id: reportId })
      const { _id, ...rest } = updated
      return handleCORS(NextResponse.json(rest))
    }

    // Delete photo report - DELETE /api/photoreports/:id
    if (route.match(/^\/photoreports\/[^/]+$/) && method === 'DELETE' && path.length === 2) {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const reportId = path[1]
      const report = await db.collection('photo_reports').findOne({ id: reportId })
      
      if (!report) {
        return handleCORS(NextResponse.json({ error: 'Rapport ikke fundet' }, { status: 404 }))
      }

      await db.collection('photo_reports').deleteOne({ id: reportId })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // Send photo report to customer - POST /api/photoreports/:id/send
    // Sender SMS og Email med review link
    if (route.match(/^\/photoreports\/[^/]+\/send$/) && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const reportId = path[1]
      const report = await db.collection('photo_reports').findOne({ id: reportId })
      
      if (!report) {
        return handleCORS(NextResponse.json({ error: 'Rapport ikke fundet' }, { status: 404 }))
      }

      if (report.status !== 'draft') {
        return handleCORS(NextResponse.json({ error: 'Rapporten er allerede sendt' }, { status: 400 }))
      }

      const reviewUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/fotorapport/${report.reviewToken}`
      let smsSent = false
      let emailSent = false
      
      // Send SMS via Twilio
      if (report.contactPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const smsMessage = `Hej ${report.contactName}! SMARTREP har fundet ekstra skader på ${report.address}. Se og godkend rapporten her: ${reviewUrl}`
        
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
          const twilioAuth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
          
          const twilioResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${twilioAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              To: report.contactPhone,
              From: 'SMARTREP',
              Body: smsMessage
            })
          })

          if (twilioResponse.ok) {
            smsSent = true
            console.log('SMS sent successfully to', report.contactPhone)
          } else {
            const errorData = await twilioResponse.json()
            console.error('Twilio SMS error:', errorData)
          }

          await db.collection('communications').insertOne({
            id: uuidv4(),
            type: 'sms',
            reportId: report.id,
            taskId: report.taskId,
            to: report.contactPhone,
            message: smsMessage,
            status: smsSent ? 'sent' : 'failed',
            sentAt: smsSent ? new Date() : null,
            createdAt: new Date()
          })
        } catch (smsError) {
          console.error('SMS send error:', smsError)
        }
      }

      // Send Email via SendGrid
      if (report.contactEmail && process.env.SENDGRID_API_KEY) {
        const emailHtml = EmailTemplates.photoReport({
          recipientName: report.contactName,
          taskNumber: report.taskNumber || '-',
          address: report.address,
          reportUrl: reviewUrl,
          damageCount: report.damages?.length || 0
        })

        try {
          const result = await sendEmailWithTemplate(
            report.contactEmail,
            `SMARTREP: Fotorapport til godkendelse - ${report.address}`,
            emailHtml
          )
          emailSent = result.success
          if (emailSent) {
            console.log('Email sent successfully to', report.contactEmail)
          }

          await db.collection('communications').insertOne({
            id: uuidv4(),
            type: 'email',
            reportId: report.id,
            taskId: report.taskId,
            to: report.contactEmail,
            subject: `SMARTREP: Fotorapport til godkendelse - ${report.address}`,
            status: emailSent ? 'sent' : 'failed',
            sentAt: emailSent ? new Date() : null,
            createdAt: new Date()
          })
        } catch (emailError) {
          console.error('Email send error:', emailError)
        }
      }

      // Update report status to sent
      await db.collection('photo_reports').updateOne(
        { id: reportId },
        { 
          $set: { 
            status: 'sent',
            reviewUrl: reviewUrl,
            sentAt: new Date(),
            smsSent,
            emailSent,
            updatedAt: new Date()
          } 
        }
      )

      return handleCORS(NextResponse.json({
        success: true,
        reviewUrl,
        smsSent,
        emailSent,
        notifications: {
          sms: smsSent ? `Sendt til ${report.contactPhone}` : (report.contactPhone ? 'Fejl' : 'Intet nummer'),
          email: emailSent ? `Sendt til ${report.contactEmail}` : (report.contactEmail ? 'Fejl' : 'Ingen email')
        }
      }))
    }

    // Reset photo report - POST /api/photoreports/:id/reset
    // Nulstiller til draft så den kan sendes igen
    if (route.match(/^\/photoreports\/[^/]+\/reset$/) && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const reportId = path[1]
      const report = await db.collection('photo_reports').findOne({ id: reportId })
      
      if (!report) {
        return handleCORS(NextResponse.json({ error: 'Rapport ikke fundet' }, { status: 404 }))
      }

      // Generate new review token
      const newReviewToken = uuidv4()

      // Reset all damages to pending
      const resetDamages = report.damages.map(d => ({ ...d, status: 'pending' }))

      await db.collection('photo_reports').updateOne(
        { id: reportId },
        { 
          $set: { 
            status: 'draft',
            reviewToken: newReviewToken,
            reviewUrl: null,
            sentAt: null,
            smsSent: false,
            emailSent: false,
            reviewedAt: null,
            reviewerName: null,
            reviewerSignature: null,
            damages: resetDamages,
            updatedAt: new Date()
          } 
        }
      )

      return handleCORS(NextResponse.json({ success: true, message: 'Rapport nulstillet' }))
    }

    // Public: Get report by review token - GET /api/photoreports/public/:token
    if (route.match(/^\/photoreports\/public\/[^/]+$/) && method === 'GET') {
      const token = path[2]
      
      const report = await db.collection('photo_reports').findOne({ reviewToken: token })
      if (!report) {
        return handleCORS(NextResponse.json({ error: 'Rapport ikke fundet' }, { status: 404 }))
      }

      // Get task info
      const task = await db.collection('tasks').findOne({ id: report.taskId })

      const { _id, ...reportData } = report
      return handleCORS(NextResponse.json({
        ...reportData,
        task: task ? {
          taskNumber: task.taskNumber,
          address: task.address,
          city: task.city,
          postalCode: task.postalCode,
          companyName: task.companyName
        } : null
      }))
    }

    // Public: Submit review - POST /api/photoreports/public/:token/submit
    if (route.match(/^\/photoreports\/public\/[^/]+\/submit$/) && method === 'POST') {
      const token = path[2]
      const body = await request.json()
      
      const report = await db.collection('photo_reports').findOne({ reviewToken: token })
      if (!report) {
        return handleCORS(NextResponse.json({ error: 'Rapport ikke fundet' }, { status: 404 }))
      }

      if (report.status === 'reviewed') {
        return handleCORS(NextResponse.json({ error: 'Rapporten er allerede gennemgået' }, { status: 400 }))
      }

      const { damages, signature, reviewerName } = body

      // Calculate result
      const approvedCount = damages.filter(d => d.status === 'approved').length
      const totalCount = damages.length

      await db.collection('photo_reports').updateOne(
        { reviewToken: token },
        { 
          $set: { 
            damages: damages,
            status: 'reviewed',
            reviewedAt: new Date(),
            reviewerName: reviewerName || 'Kunde',
            reviewerSignature: signature,
            updatedAt: new Date()
          } 
        }
      )

      // Log the review
      await db.collection('communications').insertOne({
        id: uuidv4(),
        type: 'report_review',
        reportId: report.id,
        taskId: report.taskId,
        message: `Rapport gennemgået: ${approvedCount}/${totalCount} skader godkendt`,
        reviewerName: reviewerName,
        createdAt: new Date()
      })

      return handleCORS(NextResponse.json({ 
        success: true, 
        approvedCount,
        totalCount,
        reviewedAt: new Date()
      }))
    }

    // ============ MESSAGES / CHAT ============
    
    // Get messages for customer - GET /api/messages
    if (route === '/messages' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      let query = {}
      if (user.role === 'customer') {
        // Customer sees their own messages
        query.$or = [
          { fromUserId: user.id },
          { toUserId: user.id },
          { companyId: user.companyId }
        ]
      }
      // Admin sees all messages

      const messages = await db.collection('messages').find(query).sort({ createdAt: -1 }).limit(100).toArray()
      const cleaned = messages.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Send message - POST /api/messages
    if (route === '/messages' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      
      // For admin replies, use the target company ID from the request
      // For customers, use their own company ID
      const messageCompanyId = user.role === 'admin' && body.toCompanyId 
        ? body.toCompanyId 
        : user.companyId
      
      const message = {
        id: uuidv4(),
        companyId: messageCompanyId,
        fromUserId: user.id,
        fromUserName: user.name,
        fromUserRole: user.role,
        toUserId: body.toUserId || null, // null = to admin/office
        content: body.content || '',
        imageUrl: body.imageUrl || null,
        taskId: body.taskId || null, // Optional - link to task
        read: false,
        createdAt: new Date()
      }

      await db.collection('messages').insertOne(message)

      // If admin is replying, send email notification to customer contacts
      if (user.role === 'admin' && messageCompanyId) {
        try {
          // Find customer contacts for this company
          const customerContacts = await db.collection('users').find({
            companyId: messageCompanyId,
            role: 'customer'
          }).toArray()

          // Get company info
          const company = await db.collection('companies').findOne({ id: messageCompanyId })
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://smartrep.nu'

          // Send email notification using template
          for (const contact of customerContacts) {
            if (contact.email) {
              const emailHtml = EmailTemplates.newMessage({
                recipientName: contact.name,
                senderName: user.name,
                messagePreview: message.content,
                portalUrl: baseUrl,
                taskNumber: body.taskNumber || null
              })
              
              await sendEmailWithTemplate(
                contact.email,
                'Ny besked fra SMARTREP',
                emailHtml
              )
              console.log(`Email notification sent to ${contact.email}`)
            }
          }
        } catch (emailErr) {
          console.error('Error sending email notification:', emailErr)
          // Don't fail the message creation if email fails
        }
      }
      
      const { _id, ...cleanMessage } = message
      return handleCORS(NextResponse.json(cleanMessage, { status: 201 }))
    }

    // Mark message as read - PATCH /api/messages/:id/read
    if (route.match(/^\/messages\/[^/]+\/read$/) && method === 'PATCH') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const messageId = path[1]
      
      await db.collection('messages').updateOne(
        { id: messageId },
        { $set: { read: true, readAt: new Date() } }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // Mark all messages from a company as read - POST /api/messages/mark-read-by-company
    if (route === '/messages/mark-read-by-company' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      const { companyId } = body
      
      // Mark all unread messages from this company as read
      const result = await db.collection('messages').updateMany(
        { 
          companyId: companyId,
          fromUserRole: 'customer',
          read: false
        },
        { $set: { read: true, readAt: new Date(), readBy: user.id } }
      )

      return handleCORS(NextResponse.json({ 
        success: true, 
        markedAsRead: result.modifiedCount 
      }))
    }

    // Get unread message count - GET /api/messages/unread-count
    if (route === '/messages/unread-count' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      let query = { read: false }
      if (user.role === 'customer') {
        query.toUserId = user.id
      } else if (user.role === 'admin') {
        // Admin sees unread messages from customers
        query.fromUserRole = 'customer'
      }

      const count = await db.collection('messages').countDocuments(query)
      return handleCORS(NextResponse.json({ count }))
    }

    // ============ WEATHER API ============
    
    // Get weather - GET /api/weather
    if (route === '/weather' && method === 'GET') {
      const url = new URL(request.url)
      const city = url.searchParams.get('city') || 'Fredericia'
      const postalCode = url.searchParams.get('postal') || '7000'

      try {
        // DMI API call
        const dmiResponse = await fetch(
          `https://dmigw.govcloud.dk/v2/metObs/collections/observation/items?datetime=latest&api-key=${process.env.DMI_API_KEY}`,
          { headers: { 'X-Gravitee-Api-Key': process.env.DMI_API_KEY } }
        )
        
        if (dmiResponse.ok) {
          const weatherData = await dmiResponse.json()
          return handleCORS(NextResponse.json(weatherData))
        } else {
          // Fallback weather data
          return handleCORS(NextResponse.json({
            location: city,
            postalCode: postalCode,
            forecast: [
              { day: 'I dag', temp: 18, condition: 'sunny', icon: '☀️' },
              { day: 'I morgen', temp: 16, condition: 'cloudy', icon: '☁️' },
              { day: 'Onsdag', temp: 14, condition: 'rainy', icon: '🌧️' },
              { day: 'Torsdag', temp: 17, condition: 'sunny', icon: '☀️' },
              { day: 'Fredag', temp: 19, condition: 'sunny', icon: '☀️' },
              { day: 'Lørdag', temp: 20, condition: 'partly_cloudy', icon: '⛅' },
              { day: 'Søndag', temp: 18, condition: 'cloudy', icon: '☁️' }
            ]
          }))
        }
      } catch (error) {
        console.error('Weather API error:', error)
        return handleCORS(NextResponse.json({
          location: city,
          postalCode: postalCode,
          forecast: [
            { day: 'I dag', temp: 18, condition: 'sunny', icon: '☀️' },
            { day: 'I morgen', temp: 16, condition: 'cloudy', icon: '☁️' }
          ]
        }))
      }
    }

    // ============ OPTIONS/ENUMS ============
    
    // Get options - GET /api/options (taskTypes kan overstyres fra Indstillinger > Datafelter)
    if (route === '/options' && method === 'GET') {
      const defaultTaskTypes = [
        { value: 'PLA', label: 'PLA (Plast)' },
        { value: 'BUN', label: 'BUN (Bundstykke)' },
        { value: 'GLA', label: 'GLA (Glas)' },
        { value: 'ALU', label: 'ALU (Aluminium)' },
        { value: 'TRÆ', label: 'TRÆ (Træ)' },
        { value: 'COA', label: 'COA (Coating)' },
        { value: 'INS', label: 'INS (Isolering)' },
        { value: 'REN', label: 'REN (Rengøring)' }
      ]
      let taskTypes = defaultTaskTypes
      try {
        const customOptions = await db.collection('settings').findOne({ type: 'data_fields' })
        if (customOptions?.fields?.taskTypes?.length) {
          taskTypes = customOptions.fields.taskTypes
        }
      } catch (_) { /* use defaults */ }
      return handleCORS(NextResponse.json({
        buildingParts: BUILDING_PARTS,
        colors: COLORS,
        locations: LOCATIONS,
        statusLabels: STATUS_LABELS,
        categories: [
          { value: 'foraflevering', label: 'Foraflevering' },
          { value: 'service', label: 'Service' },
          { value: 'oevrig', label: 'Øvrig' }
        ],
        weatherTypes: [
          { value: 'rain', label: 'Regnvejr OK', icon: '🌧️' },
          { value: 'sun', label: 'Kræver tørvejr', icon: '☀️' },
          { value: 'both', label: 'Blandet', icon: '⛅' }
        ],
        taskTypes
      }))
    }

    // ============ DASHBOARD STATS ============
    
    // Get dashboard stats - GET /api/dashboard
    if (route === '/dashboard' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      let baseQuery = {}
      if (user.role === 'customer') {
        baseQuery.companyId = user.companyId
      }

      const stats = {
        totalTasks: await db.collection('tasks').countDocuments(baseQuery),
        activeTasks: await db.collection('tasks').countDocuments({ ...baseQuery, status: { $in: ['awaiting_confirmation', 'under_planning', 'planned'] } }),
        completedTasks: await db.collection('tasks').countDocuments({ ...baseQuery, status: 'completed' }),
        totalCompanies: await db.collection('companies').countDocuments({}),
        totalContacts: await db.collection('users').countDocuments({ role: 'customer' }),
        pendingReports: await db.collection('photo_reports').countDocuments({ status: 'pending' })
      }

      // Recent tasks
      const recentTasks = await db.collection('tasks')
        .find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()

      stats.recentTasks = recentTasks.map(({ _id, ...rest }) => rest)

      return handleCORS(NextResponse.json(stats))
    }

    // ============ SEND SMS ============
    
    // Send SMS - POST /api/sms/send
    if (route === '/sms/send' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      const { to, message, taskId } = body

      if (!to || !message) {
        return handleCORS(NextResponse.json({ error: 'Telefonnummer og besked er påkrævet' }, { status: 400 }))
      }

      try {
        // Twilio integration
        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const authToken = process.env.TWILIO_AUTH_TOKEN
        const fromNumber = process.env.TWILIO_PHONE_NUMBER

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

        const formData = new URLSearchParams()
        formData.append('To', to)
        formData.append('From', 'SMARTREP')
        formData.append('Body', message)

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        })

        const twilioData = await twilioResponse.json()

        // Log the SMS
        await db.collection('communications').insertOne({
          id: uuidv4(),
          type: 'sms',
          taskId: taskId || null,
          to: to,
          message: message,
          status: twilioResponse.ok ? 'sent' : 'failed',
          twilioSid: twilioData.sid || null,
          error: twilioData.message || null,
          sentBy: user.id,
          sentByName: user.name,
          createdAt: new Date()
        })

        if (twilioResponse.ok) {
          return handleCORS(NextResponse.json({ success: true, sid: twilioData.sid }))
        } else {
          return handleCORS(NextResponse.json({ error: twilioData.message || 'SMS fejlede' }, { status: 400 }))
        }
      } catch (error) {
        console.error('SMS error:', error)
        return handleCORS(NextResponse.json({ error: 'SMS kunne ikke sendes' }, { status: 500 }))
      }
    }

    // ============ SEND EMAIL ============
    
    // Send Email - POST /api/email/send
    if (route === '/email/send' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      const { to, subject, html, taskId } = body

      if (!to || !subject || !html) {
        return handleCORS(NextResponse.json({ error: 'Modtager, emne og indhold er påkrævet' }, { status: 400 }))
      }

      try {
        const sendgridUrl = 'https://api.sendgrid.com/v3/mail/send'
        
        const emailData = {
          personalizations: [{ to: [{ email: to }] }],
          from: { email: 'noreply@smartrep.dk', name: 'SMARTREP' },
          subject: subject,
          content: [{ type: 'text/html', value: html }]
        }

        const sendgridResponse = await fetch(sendgridUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        })

        // Log the email
        await db.collection('communications').insertOne({
          id: uuidv4(),
          type: 'email',
          taskId: taskId || null,
          to: to,
          subject: subject,
          content: html,
          status: sendgridResponse.ok ? 'sent' : 'failed',
          sentBy: user.id,
          sentByName: user.name,
          createdAt: new Date()
        })

        if (sendgridResponse.ok || sendgridResponse.status === 202) {
          return handleCORS(NextResponse.json({ success: true }))
        } else {
          const errorData = await sendgridResponse.json().catch(() => ({}))
          return handleCORS(NextResponse.json({ error: errorData.errors?.[0]?.message || 'Email fejlede' }, { status: 400 }))
        }
      } catch (error) {
        console.error('Email error:', error)
        return handleCORS(NextResponse.json({ error: 'Email kunne ikke sendes' }, { status: 500 }))
      }
    }

    // ============ COMMUNICATIONS LOG ============
    
    // Get communications - GET /api/communications
    if (route === '/communications' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const taskId = url.searchParams.get('taskId')

      let query = {}
      if (taskId) query.taskId = taskId

      const communications = await db.collection('communications')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()

      const cleaned = communications.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Send communication with template - POST /api/communications/send
    if (route === '/communications/send' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      const { type, template, to, toPhone, contactName, taskId } = body

      // Portal invitation template
      const templates = {
        portal_invitation: {
          email: {
            subject: 'Velkommen til SMARTREP Kundeportal',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0133ff; color: white; padding: 20px; text-align: center;">
                  <h1 style="margin: 0;">SMARTREP</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                  <h2 style="color: #111827;">Hej ${contactName || 'Kunde'},</h2>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Du er blevet inviteret til SMARTREP Kundeportalen, hvor du kan:
                  </p>
                  <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
                    <li>📋 Se og følge status på dine opgaver</li>
                    <li>📸 Godkende fotorapporter</li>
                    <li>📅 Se planlagte besøg</li>
                    <li>💬 Kommunikere direkte med SMARTREP</li>
                  </ul>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="background: #0133ff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      Log ind på Kundeportalen
                    </a>
                  </div>
                  <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #6b7280;">Dine loginoplysninger:</p>
                    <p style="margin: 0 0 5px 0; color: #111827;"><strong>Email:</strong> ${to}</p>
                    <p style="margin: 0; color: #111827;"><strong>Password:</strong> Dit password er sendt separat</p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">
                    Ved spørgsmål kontakt os på tlf. +45 8282 2572
                  </p>
                </div>
                <div style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                  <p>Denne email er sendt automatisk fra SMARTREP.</p>
                </div>
              </div>
            `
          },
          sms: {
            message: `Hej ${contactName || 'Kunde'}! Du er inviteret til SMARTREP Kundeportalen. Log ind her: ${process.env.NEXT_PUBLIC_BASE_URL} - Dine loginoplysninger sendes separat pr. email.`
          }
        }
      }

      const selectedTemplate = templates[template]
      if (!selectedTemplate) {
        return handleCORS(NextResponse.json({ error: 'Ukendt skabelon' }, { status: 400 }))
      }

      let success = false
      let errorMsg = null

      // Send email
      if (type === 'email' && to && process.env.SENDGRID_API_KEY) {
        try {
          const emailTemplate = selectedTemplate.email
          await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: to, name: contactName }] }],
              from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@smartrep.dk', name: 'SMARTREP' },
              subject: emailTemplate.subject,
              content: [{ type: 'text/html', value: emailTemplate.html }]
            })
          })
          success = true
        } catch (err) {
          errorMsg = err.message
        }
      }

      // Send SMS
      if (type === 'sms' && toPhone && process.env.TWILIO_ACCOUNT_SID) {
        try {
          const smsTemplate = selectedTemplate.sms
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
          const twilioAuth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
          
          await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${twilioAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              To: toPhone,
              From: 'SMARTREP',
              Body: smsTemplate.message
            })
          })
          success = true
        } catch (err) {
          errorMsg = err.message
        }
      }

      // Log communication
      await db.collection('communications').insertOne({
        id: uuidv4(),
        type: type,
        template: template,
        to: to || toPhone,
        toName: contactName,
        taskId: taskId || null,
        status: success ? 'sent' : 'failed',
        error: errorMsg,
        sentAt: success ? new Date() : null,
        sentBy: user.id,
        createdAt: new Date()
      })

      if (success) {
        return handleCORS(NextResponse.json({ success: true, message: 'Besked sendt' }))
      } else {
        return handleCORS(NextResponse.json({ error: errorMsg || 'Fejl ved afsendelse' }, { status: 500 }))
      }
    }

    // ============ FILE UPLOAD ============
    
    // Upload file - POST /api/upload
    if (route === '/upload' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      try {
        const formData = await request.formData()
        const file = formData.get('file')
        const taskId = formData.get('taskId')
        const reportId = formData.get('reportId')
        const damageId = formData.get('damageId')
        const photoType = formData.get('photoType') || 'damage'

        if (!file) {
          return handleCORS(NextResponse.json({ error: 'Ingen fil valgt' }, { status: 400 }))
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Generate unique filename
        const ext = file.name.split('.').pop()
        const filename = `${uuidv4()}.${ext}`
        const filepath = `/uploads/${filename}`

        // Save to public/uploads
        const fs = await import('fs/promises')
        await fs.writeFile(`./public${filepath}`, buffer)

        // Save file record to database
        const fileRecord = {
          id: uuidv4(),
          filename: filename,
          originalName: file.name,
          path: filepath,
          size: buffer.length,
          mimeType: file.type,
          taskId: taskId || null,
          reportId: reportId || null,
          damageId: damageId || null,
          photoType: photoType,
          uploadedBy: user.id,
          uploadedByName: user.name,
          createdAt: new Date()
        }

        await db.collection('files').insertOne(fileRecord)

        return handleCORS(NextResponse.json({ 
          success: true, 
          file: { ...fileRecord, url: filepath }
        }))
      } catch (error) {
        console.error('Upload error:', error)
        return handleCORS(NextResponse.json({ error: 'Upload fejlede' }, { status: 500 }))
      }
    }

    // Get files - GET /api/files
    if (route === '/files' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const taskId = url.searchParams.get('taskId')
      const reportId = url.searchParams.get('reportId')

      let query = {}
      if (taskId) query.taskId = taskId
      if (reportId) query.reportId = reportId

      const files = await db.collection('files')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()

      const cleaned = files.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // ============ DATE PROPOSALS ============
    
    // Create date proposal - POST /api/tasks/:id/date-proposal
    if (route.match(/^\/tasks\/[^/]+\/date-proposal$/) && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const taskId = path[1]
      const body = await request.json()
      const { dates, message, recipientPhone, recipientEmail } = body

      if (!dates || dates.length === 0) {
        return handleCORS(NextResponse.json({ error: 'Mindst én dato er påkrævet' }, { status: 400 }))
      }

      const task = await db.collection('tasks').findOne({ id: taskId })
      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Opgave ikke fundet' }, { status: 404 }))
      }

      // Create date proposal record
      const proposal = {
        id: uuidv4(),
        taskId: taskId,
        dates: dates,
        message: message || '',
        recipientPhone: recipientPhone || task.owner1Phone,
        recipientEmail: recipientEmail || task.contactEmail,
        status: 'pending',
        selectedDate: null,
        createdBy: user.id,
        createdByName: user.name,
        createdAt: new Date()
      }

      await db.collection('date_proposals').insertOne(proposal)

      // Log communication
      await db.collection('communications').insertOne({
        id: uuidv4(),
        type: 'date_proposal',
        taskId: taskId,
        to: recipientPhone || recipientEmail,
        message: `Datoforslag sendt for opgave #${task.taskNumber}`,
        status: 'sent',
        proposalId: proposal.id,
        createdAt: new Date()
      })

      return handleCORS(NextResponse.json(proposal))
    }

    // Get date proposals for task - GET /api/tasks/:id/date-proposals
    if (route.match(/^\/tasks\/[^/]+\/date-proposals$/) && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const taskId = path[1]
      const proposals = await db.collection('date_proposals')
        .find({ taskId })
        .sort({ createdAt: -1 })
        .toArray()

      const cleaned = proposals.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Select date from proposal - POST /api/date-proposals/:id/select
    if (route.match(/^\/date-proposals\/[^/]+\/select$/) && method === 'POST') {
      const proposalId = path[1]
      const body = await request.json()
      const { selectedDate } = body

      if (!selectedDate) {
        return handleCORS(NextResponse.json({ error: 'Dato er påkrævet' }, { status: 400 }))
      }

      await db.collection('date_proposals').updateOne(
        { id: proposalId },
        { 
          $set: { 
            status: 'selected',
            selectedDate: new Date(selectedDate),
            selectedAt: new Date()
          } 
        }
      )

      // Get proposal to update task
      const proposal = await db.collection('date_proposals').findOne({ id: proposalId })
      if (proposal?.taskId) {
        await db.collection('tasks').updateOne(
          { id: proposal.taskId },
          { $set: { plannedDate: new Date(selectedDate), status: 'planned', updatedAt: new Date() } }
        )
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ ACTIVITY LOG ============
    
    // Log activity - POST /api/logs
    if (route === '/logs' && method === 'POST') {
      const user = getUserFromToken(request)
      const body = await request.json()
      
      const logEntry = {
        id: uuidv4(),
        entityType: body.entityType || 'task', // task, invoice, report, etc.
        entityId: body.entityId,
        action: body.action, // created, updated, status_changed, etc.
        description: body.description,
        changes: body.changes || null, // { field: { from: x, to: y } }
        userId: user?.id || 'system',
        userName: user?.name || body.userName || 'System',
        createdAt: new Date()
      }

      await db.collection('activity_logs').insertOne(logEntry)
      return handleCORS(NextResponse.json(logEntry, { status: 201 }))
    }

    // Get logs for entity - GET /api/logs?entityType=task&entityId=xxx
    if (route === '/logs' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const entityType = url.searchParams.get('entityType')
      const entityId = url.searchParams.get('entityId')

      let query = {}
      if (entityType) query.entityType = entityType
      if (entityId) query.entityId = entityId

      const logs = await db.collection('activity_logs').find(query).sort({ createdAt: -1 }).limit(100).toArray()
      const cleaned = logs.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Create global activity log entry - POST /api/activity_logs/global
    if (route === '/activity_logs/global' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      
      const logEntry = {
        id: uuidv4(),
        type: 'global',
        action: body.action,
        details: body.details || {},
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      }

      await db.collection('activity_logs').insertOne(logEntry)
      
      const { _id, ...cleanLog } = logEntry
      return handleCORS(NextResponse.json(cleanLog, { status: 201 }))
    }

    // ============ ORDER CONFIRMATION (ORDREBEKRÆFTELSE) ============
    const ORIGIN_FREDERICIA = 'Fredericia, Denmark'
    // Link i email/SMS til kunde skal være et offentligt URL – brug PORTAL_PUBLIC_URL (fx https://kundeportal.smartrep.nu)
    const BASE_URL = process.env.PORTAL_PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Send order confirmation - POST /api/order-confirmation/send
    if (route === '/order-confirmation/send' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || (user.role !== 'admin' && user.role !== 'technician_admin')) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }
      const body = await request.json()
      const { taskId, serviceZone, taskType, addGlassRisk, addChemicalCleaning, glassNote, chemicalNote, distance_km, drive_time_minutes } = body
      const task = await db.collection('tasks').findOne({ id: taskId })
      if (!task) return handleCORS(NextResponse.json({ error: 'Opgave ikke fundet' }, { status: 404 }))

      const token = uuidv4()
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      const items = []
      items.push({ type: 'standard', customNote: '', accepted: null, respondedAt: null })
      if (serviceZone === 'extended') {
        items.push({ type: 'extended_zone', customNote: '', accepted: null, respondedAt: null })
      }
      if (addGlassRisk || taskType === 'solo_glass') {
        items.push({ type: 'glass_risk', customNote: glassNote || '', accepted: null, respondedAt: null })
      }
      if (addChemicalCleaning || taskType === 'solo_chemical') {
        items.push({ type: 'chemical_cleaning', customNote: chemicalNote || '', accepted: null, respondedAt: null })
      }

      const confirmation = {
        id: uuidv4(),
        taskId: task.id,
        token,
        status: 'sent',
        sentAt: new Date(),
        respondedAt: null,
        expiresAt,
        serviceZone: serviceZone || 'standard',
        taskType: taskType || 'mixed',
        addGlassRisk: !!addGlassRisk,
        addChemicalCleaning: !!addChemicalCleaning,
        glassNote: glassNote || '',
        chemicalNote: chemicalNote || '',
        distance_km: distance_km ?? null,
        drive_time_minutes: drive_time_minutes ?? null,
        items,
        sentBy: user.id,
        sentByName: user.name,
        taskInfo: {
          address: task.address,
          postalCode: task.postalCode,
          city: task.city,
          companyName: task.companyName,
          contactName: task.contactName,
          contactEmail: task.contactEmail,
          taskNumber: task.taskNumber,
          damages: (task.damages || []).map(d => ({ part: d.part, location: d.location, notes: d.notes, quantity: d.quantity }))
        }
      }
      await db.collection('order_confirmations').insertOne(confirmation)
      await db.collection('tasks').updateOne(
        { id: taskId },
        { $set: { orderConfirmationId: confirmation.id, orderConfirmationStatus: 'sent', orderConfirmationSentAt: new Date(), updatedAt: new Date() } }
      )

      const confirmUrl = `${BASE_URL}/confirm/${token}`
      // B2B: Ordrebekræftelser går kun til kundekontakt (aldrig bygherre – bygherre får kun SMS om besøg)
      let recipientName = task.contactName || 'Kunde'
      let recipientEmail = task.contactEmail || ''
      let recipientPhone = task.contactPhone || ''
      if (task.contactId) {
        const contact = await db.collection('users').findOne({ id: task.contactId })
        if (contact) {
          recipientEmail = contact.email || recipientEmail
          recipientPhone = contact.phone || recipientPhone
          recipientName = contact.name || recipientName
        }
      }
      if (!recipientEmail || !recipientEmail.trim()) {
        return handleCORS(NextResponse.json({ error: 'Opgaven har ingen kontakt-email. Tilføj en kontakt med email (Skift kontakt) før ordrebekræftelse sendes.' }, { status: 400 }))
      }

      const emailHtml = getEmailBaseTemplate(`
        <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1a1a1a;">Ordrebekræftelse – ${task.address || ''}, ${task.postalCode || ''} ${task.city || ''}</h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 22px; color: #495057;">Hej ${recipientName},</p>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 22px; color: #495057;">Vi har modtaget jeres opgave og beder jer gennemse og bekræfte nedenstående.</p>
        ${getEmailButton('SE OG BEKRÆFT ORDREBEKRÆFTELSE', confirmUrl)}
        <p style="margin: 16px 0 0 0; font-size: 13px; color: #6c757d;">Eller åbn dette link i din browser:</p>
        <p style="margin: 6px 0 0 0; font-size: 14px;"><a href="${confirmUrl}" style="color: ${BRAND_BLUE}; word-break: break-all;">${confirmUrl}</a></p>
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #6c757d;">Linket er aktivt i 14 dage.</p>
        <p style="margin: 12px 0 0 0; font-size: 14px; color: #495057;">Ved spørgsmål er I velkomne til at kontakte os.</p>
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #495057;">Mvh.<br/><strong>${user.name}</strong><br/>SMARTREP<br/>Tlf. 82 82 25 72<br/>info@smartrep.nu</p>
      `)
      let emailResult = { success: false, error: 'Ingen email' }
      if (recipientEmail) {
        emailResult = await sendEmailWithTemplate(recipientEmail, `Ordrebekræftelse – ${task.address || ''}, ${task.postalCode || ''} ${task.city || ''} | SMARTREP`, emailHtml)
      }

      const smsMessage = `Hej ${recipientName}. I har modtaget en ordrebekræftelse fra SMARTREP. Gennemse og bekræft her: ${confirmUrl}`
      let smsResult = { success: false }
      if (recipientPhone) {
        smsResult = await sendSMS(recipientPhone, smsMessage)
      }

      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        taskId,
        action: 'order_confirmation_sent',
        description: `Ordrebekræftelse sendt til ${recipientEmail || 'kontakt'}. Type: ${serviceZone === 'extended' ? 'Udvidet' : 'Standard'}${addGlassRisk ? ' + Glasrisiko' : ''}${addChemicalCleaning ? ' + Afrensning' : ''}`,
        userId: user.id,
        userName: user.name,
        createdAt: new Date(),
        details: { confirmationId: confirmation.id }
      })
      await db.collection('task_logs').insertOne({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        taskId,
        action: 'order_confirmation_sent',
        description: `Ordrebekræftelse sendt til ${recipientEmail || 'kontakt'}`,
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      })

      const { _id: _oid, ...cleanConf } = confirmation
      return handleCORS(NextResponse.json({ ...cleanConf, confirmUrl, smsResult, emailResult, recipientEmail, recipientPhone }, { status: 201 }))
    }

    // Get order confirmation by token (public) - GET /api/order-confirmation/public/:token
    if (route.match(/^\/order-confirmation\/public\/[^/]+$/) && method === 'GET') {
      const token = path[2]
      const conf = await db.collection('order_confirmations').findOne({ token })
      if (!conf) return handleCORS(NextResponse.json({ error: 'Ugyldig eller udløbet link' }, { status: 404 }))
      if (new Date() > new Date(conf.expiresAt)) return handleCORS(NextResponse.json({ error: 'Linket er udløbet' }, { status: 410 }))
      const { _id, ...rest } = conf
      return handleCORS(NextResponse.json(rest))
    }

    // Submit bygherre response - POST /api/order-confirmation/public/:token/respond
    if (route.match(/^\/order-confirmation\/public\/[^/]+\/respond$/) && method === 'POST') {
      const token = path[2]
      const body = await request.json()
      const conf = await db.collection('order_confirmations').findOne({ token })
      if (!conf) return handleCORS(NextResponse.json({ error: 'Ugyldig eller udløbet link' }, { status: 404 }))
      if (conf.status === 'response_received' || conf.status === 'activated') {
        return handleCORS(NextResponse.json({ error: 'Der er allerede blevet svaret på denne ordrebekræftelse' }, { status: 400 }))
      }
      const { items: responseItems, overall_accepted } = body
      const updatedItems = (conf.items || []).map((item, i) => {
        const fromResp = Array.isArray(responseItems) && responseItems.find(r => r.type === item.type)
        if (fromResp && typeof fromResp.accepted === 'boolean') {
          return { ...item, accepted: fromResp.accepted, respondedAt: new Date() }
        }
        return item
      })
      await db.collection('order_confirmations').updateOne(
        { token },
        { $set: { items: updatedItems, status: 'response_received', respondedAt: new Date(), overall_accepted: overall_accepted !== false } }
      )
      const taskId = conf.taskId
      await db.collection('tasks').updateOne(
        { id: taskId },
        { $set: { orderConfirmationStatus: 'response_received', orderConfirmationRespondedAt: new Date(), updatedAt: new Date() } }
      )
      const respondentIdentifier = conf.taskInfo?.contactEmail || conf.taskInfo?.contactName || 'Kunde'
      const detailsLines = updatedItems.filter(i => i.type !== 'standard').map(i => `${i.type === 'glass_risk' ? 'Glaspolering' : i.type === 'chemical_cleaning' ? 'Kemisk afrensning' : i.type}: ${i.accepted ? 'Accepteret' : 'Afvist'}`)
      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        taskId,
        action: 'order_confirmation_response',
        description: `Byggeleder besvarede ordrebekræftelse.${detailsLines.length ? ' ' + detailsLines.join(', ') : ''}`,
        userId: null,
        userName: respondentIdentifier,
        createdAt: new Date(),
        details: { items: updatedItems, overall_accepted }
      })
      await db.collection('task_logs').insertOne({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        taskId,
        action: 'order_confirmation_response',
        description: `Byggeleder besvarede ordrebekræftelse`,
        userId: null,
        userName: respondentIdentifier,
        createdAt: new Date(),
        details: { items: updatedItems }
      })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // Get order confirmation for task - GET /api/order-confirmation/task/:taskId
    if (route.match(/^\/order-confirmation\/task\/[^/]+$/) && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      const taskId = path[2]
      const conf = await db.collection('order_confirmations').findOne({ taskId })
      if (!conf) return handleCORS(NextResponse.json(null))
      const { _id, ...rest } = conf
      return handleCORS(NextResponse.json(rest))
    }

    // Resend order confirmation (genfremsend) - POST /api/order-confirmation/resend
    if (route === '/order-confirmation/resend' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || (user.role !== 'admin' && user.role !== 'technician_admin')) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }
      const body = await request.json()
      const { taskId, overrideEmail, overridePhone, baseUrl: resendBaseUrl } = body
      if (!taskId) return handleCORS(NextResponse.json({ error: 'taskId mangler' }, { status: 400 }))
      const conf = await db.collection('order_confirmations').findOne({ taskId })
      if (!conf) return handleCORS(NextResponse.json({ error: 'Ingen ordrebekræftelse fundet' }, { status: 404 }))
      const task = await db.collection('tasks').findOne({ id: taskId })
      if (!task) return handleCORS(NextResponse.json({ error: 'Opgave ikke fundet' }, { status: 404 }))

      const baseUrl = (resendBaseUrl && String(resendBaseUrl).trim())
        ? String(resendBaseUrl).trim().replace(/\/$/, '')
        : (process.env.PORTAL_PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
      const confirmUrl = `${baseUrl}/confirm/${conf.token}`
      let recipientName = task.contactName || 'Kunde'
      let recipientEmail = (overrideEmail && String(overrideEmail).trim()) || task.contactEmail || ''
      let recipientPhone = (overridePhone && String(overridePhone).trim()) || task.contactPhone || ''
      if (!recipientEmail && !overrideEmail && task.contactId) {
        const contact = await db.collection('users').findOne({ id: task.contactId })
        if (contact) {
          recipientEmail = contact.email || recipientEmail
          recipientPhone = recipientPhone || contact.phone || ''
          recipientName = contact.name || recipientName
        }
      }
      if (!recipientEmail || !recipientEmail.trim()) {
        return handleCORS(NextResponse.json({ error: 'Opgaven har ingen kontakt-email. Tilføj en kontakt med email (Skift kontakt) eller angiv "Send til anden email".' }, { status: 400 }))
      }

      const emailHtml = getEmailBaseTemplate(`
        <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1a1a1a;">Ordrebekræftelse – ${task.address || ''}, ${task.postalCode || ''} ${task.city || ''}</h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 22px; color: #495057;">Hej ${recipientName},</p>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 22px; color: #495057;">Vi sender linket til ordrebekræftelsen igen som ønsket.</p>
        ${getEmailButton('SE OG BEKRÆFT ORDREBEKRÆFTELSE', confirmUrl)}
        <p style="margin: 16px 0 0 0; font-size: 13px; color: #6c757d;">Eller åbn dette link i din browser:</p>
        <p style="margin: 6px 0 0 0; font-size: 14px;"><a href="${confirmUrl}" style="color: ${BRAND_BLUE}; word-break: break-all;">${confirmUrl}</a></p>
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #6c757d;">Linket er aktivt i 14 dage.</p>
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #495057;">Mvh.<br/><strong>${user.name}</strong><br/>SMARTREP<br/>Tlf. 82 82 25 72<br/>info@smartrep.nu</p>
      `)
      let emailResult = { success: false, error: 'Ingen email' }
      if (recipientEmail) {
        emailResult = await sendEmailWithTemplate(recipientEmail, `Ordrebekræftelse – ${task.address || ''}, ${task.postalCode || ''} ${task.city || ''} | SMARTREP`, emailHtml)
      }
      const smsMessage = `Hej ${recipientName}. I har modtaget en ordrebekræftelse fra SMARTREP. Gennemse og bekræft her: ${confirmUrl}`
      let smsResult = { success: false }
      if (recipientPhone) {
        smsResult = await sendSMS(recipientPhone, smsMessage)
      }

      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        taskId,
        action: 'order_confirmation_resent',
        description: `Ordrebekræftelse genfremsendt til ${recipientEmail || 'kontakt'}`,
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      })
      await db.collection('task_logs').insertOne({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        taskId,
        action: 'order_confirmation_resent',
        description: `Ordrebekræftelse genfremsendt til ${recipientEmail || 'kontakt'}`,
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      })
      return handleCORS(NextResponse.json({ success: true, confirmUrl, smsResult, emailResult, recipientEmail, recipientPhone }))
    }

    // Test delivery (send én email + én SMS til angivet adresse/telefon – til fejlsøgning)
    if (route === '/order-confirmation/test-delivery' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || (user.role !== 'admin' && user.role !== 'technician_admin')) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }
      const body = await request.json()
      const { taskId, email, phone, baseUrl: testBaseUrl } = body
      if (!taskId) return handleCORS(NextResponse.json({ error: 'taskId mangler' }, { status: 400 }))
      const conf = await db.collection('order_confirmations').findOne({ taskId })
      if (!conf) return handleCORS(NextResponse.json({ error: 'Ingen ordrebekræftelse for denne opgave' }, { status: 404 }))
      const task = await db.collection('tasks').findOne({ id: taskId })
      if (!task) return handleCORS(NextResponse.json({ error: 'Opgave ikke fundet' }, { status: 404 }))

      const portalPublicUrl = (testBaseUrl && String(testBaseUrl).trim())
        ? String(testBaseUrl).trim().replace(/\/$/, '')
        : (process.env.PORTAL_PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
      const confirmUrl = `${portalPublicUrl}/confirm/${conf.token}`

      const toEmail = (email && String(email).trim()) || task.contactEmail || (task.contactId ? (await db.collection('users').findOne({ id: task.contactId }))?.email : null)
      const toPhone = (phone && String(phone).trim()) || task.contactPhone || (task.contactId ? (await db.collection('users').findOne({ id: task.contactId }))?.phone : null)

      if (!toEmail || !toEmail.trim()) {
        return handleCORS(NextResponse.json({ error: 'Angiv modtagerens email i feltet (fx lg@smartrep.nu) – ellers ved vi ikke hvor test-mailen skal sendes hen.' }, { status: 400 }))
      }

      let emailResult = { success: false, error: 'Ingen email angivet' }
      if (toEmail) {
        const html = getEmailBaseTemplate(`
          <h2>Test – Ordrebekræftelse</h2>
          <p>Denne email er en test fra SMARTREP.</p>
          <p><a href="${confirmUrl}">${confirmUrl}</a></p>
        `)
        emailResult = await sendEmailWithTemplate(toEmail, 'Test ordrebekræftelse | SMARTREP', html)
      }

      let smsResult = { success: false, error: 'Ingen telefon angivet' }
      if (toPhone) {
        smsResult = await sendSMS(toPhone, `SMARTREP test. Åbn ordrebekræftelse: ${confirmUrl}`)
      }

      return handleCORS(NextResponse.json({
        confirmUrl,
        portalPublicUrl,
        message: 'Linket i SMS/email virker KUN for kunden, hvis appen er udgivet på portalPublicUrl (fx på Vercel). Er domænet ikke deployet, kan linket ikke åbnes.',
        emailResult,
        smsResult,
        sentTo: { email: toEmail || null, phone: toPhone || null }
      }))
    }

    // Activate order confirmation (godkend og flyt til Aktive) - POST /api/order-confirmation/activate
    if (route === '/order-confirmation/activate' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || (user.role !== 'admin' && user.role !== 'technician_admin')) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }
      const body = await request.json()
      const { taskId } = body
      if (!taskId) return handleCORS(NextResponse.json({ error: 'taskId mangler' }, { status: 400 }))
      const conf = await db.collection('order_confirmations').findOne({ taskId })
      if (!conf) return handleCORS(NextResponse.json({ error: 'Ordrebekræftelse ikke fundet' }, { status: 404 }))
      if (conf.status !== 'response_received' && conf.status !== 'sent') {
        return handleCORS(NextResponse.json({ error: 'Ordrebekræftelse er ikke i tilstand til aktivering' }, { status: 400 }))
      }
      await db.collection('order_confirmations').updateOne(
        { taskId },
        { $set: { status: 'activated' } }
      )
      await db.collection('tasks').updateOne(
        { id: taskId },
        { $set: { orderConfirmationStatus: 'activated', status: 'under_planning', updatedAt: new Date() } }
      )
      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        taskId,
        action: 'order_confirmation_activated',
        description: 'Opgave aktiveret (godkendt ordrebekræftelse)',
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      })
      await db.collection('task_logs').insertOne({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        taskId,
        action: 'order_confirmation_activated',
        description: 'Opgave aktiveret af ' + user.name,
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ PRODUCTS / PRICE LIST ============
    
    // Get all products - GET /api/products
    if (route === '/products' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      // Check if products exist, if not initialize them
      const count = await db.collection('products').countDocuments()
      if (count === 0) {
        // Initialize default products from the price list
        const defaultProducts = [
          { nr: 'AFD', name: 'Specialafdækning, pr. time', group: '1005', price: 825.00 },
          { nr: 'AFR1', name: 'KEMISK afrensning af alurammer, pr. ramme', group: '1005', price: 325.00 },
          { nr: 'AFR2', name: 'Afrensnings af alurammer (ej kemisk)', group: '1005', price: 1500.00 },
          { nr: 'BRO', name: 'Broafgift', group: '1010', price: 196.00 },
          { nr: 'COAT', name: 'CERAMIGUARD - Keramisk coating af alurammer', group: '1004', price: 8000.00 },
          { nr: 'COLOR', name: 'COLOR:UP - Kemisk afrensning af alurammer - Komplet hus', group: '1005', price: 2500.00 },
          { nr: 'DIV', name: 'Diverse ifm. lakering, timelønsopgave', group: '1005', price: 850.00 },
          { nr: 'ELOX1', name: 'Smartrepair, ELOX - Farvekode', group: '1002', price: 1775.00 },
          { nr: 'ELOX2', name: 'Sprøjtelakering af eloxeret overflade', group: '1002', price: 2275.00 },
          { nr: 'GEN', name: 'Gennemgang & rapport, KOMBI (Ifm. reparation samme dag)', group: '1005', price: 850.00 },
          { nr: 'GEN2', name: 'Gennemgang & rapport, SOLO (Uden samtidig reparation)', group: '1005', price: 1500.00 },
          { nr: 'GLAS', name: 'Glaspolering, 2-trins maskinpolering (ej ridser), Pr. glas', group: '1003', price: 825.00 },
          { nr: 'KOMP', name: 'KOMPLET Aluramme, Hoveddør m/u glas. Demontering + specialafdækning', group: '1002', price: 2650.00 },
          { nr: 'KØR', name: 'Kørsel, Servicebil', group: '1010', price: 4.75 },
          { nr: 'MAT', name: 'Materialer', group: '1006', price: 0 },
          { nr: 'OPR', name: 'Opretning af profil. Genopbygning i 2K polyesterspartel', group: '1002', price: 650.00 },
          { nr: 'PLEJE', name: 'ALUPLEJE 250 ml. Sæt', group: '1006', price: 329.00 },
          { nr: 'RIS', name: 'Specialopgave, SMARTrepair, Afløbsrist (ELOX)', group: '1002', price: 2680.00 },
          { nr: 'SCH', name: 'Specialopgave, SMARTrepair, Schlüterskinner (ELOX)', group: '1002', price: 2880.00 },
          { nr: 'SPR', name: 'Sprossedør - SPECIALOPGAVE', group: '1002', price: 3350.00 },
          { nr: 'SØJ', name: 'Sprøjtelakering af søjle. Korrosionsfast 2-K, pr. meter', group: '1002', price: 1475.00 },
          { nr: 'TIM', name: 'Timelønsopgave', group: '1005', price: 825.00 },
          { nr: 'TIM2', name: 'Timeløn, køretid', group: '1005', price: 825.00 },
          { nr: 'STA10', name: 'Lakreparation - "granit/sablé" overflade m. struktur. 1. profil, inkl. opstart', group: '1002', price: 2380.00, customerPricingEnabled: true },
          { nr: 'STA11', name: 'Lakreparation - "granit/sablé" overflade m. struktur. Øvrige profiler', group: '1002', price: 1680.00, customerPricingEnabled: true },
          { nr: 'STA13', name: 'Lakreparation - glat overflade - valgfri Ral. 1. profil', group: '1002', price: 2380.00, customerPricingEnabled: true },
          { nr: 'STA14', name: 'Lakreparation - glat overflade - valgfri Ral. Øvrige profiler', group: '1002', price: 1680.00, customerPricingEnabled: true },
          { nr: 'STA15', name: 'Lakering af indv. trækarm - Valgfri Ral. 1. profil', group: '1002', price: 1800.00, customerPricingEnabled: true },
          { nr: 'STA16', name: 'Lakering af indv. trækarm - Valgfri Ral. Øvrige profiler', group: '1002', price: 1620.00, customerPricingEnabled: true },
          { nr: 'STA20', name: 'Lakering af enkelt komposit bundstykke (1.)', group: '1002', price: 2375.00, customerPricingEnabled: true },
          { nr: 'STA21', name: 'Lakering af enkelt komposit bundstykke. Øvrige', group: '1002', price: 2137.50, customerPricingEnabled: true },
          { nr: 'STA22', name: 'Lakering af 2-farvet bundstykke - komposit/elox. alu. (1.)', group: '1002', price: 2375.00, customerPricingEnabled: true },
          { nr: 'STA23', name: 'Lakering af 2-farvet bundstykke - komposit/elox. alu. Øvrige', group: '1002', price: 2137.50, customerPricingEnabled: true },
          { nr: 'STA24', name: 'Lakering af halvandet kompositbundstykke (1.)', group: '1002', price: 2450.00, customerPricingEnabled: true },
          { nr: 'STA30', name: 'Lakering af halvandet komposit bundstykke. Øvrige', group: '1002', price: 2205.00, customerPricingEnabled: true },
          { nr: 'STA31', name: 'Lakering af dobb. komposit bundstykke (1.)', group: '1002', price: 2580.00, customerPricingEnabled: true },
          { nr: 'STA32', name: 'Lakering af dobb. komposit bundstykke. Øvrige', group: '1002', price: 2322.00, customerPricingEnabled: true },
          { nr: 'STA35', name: 'Lakering af sparkeplade', group: '1002', price: 850.00, customerPricingEnabled: true },
          { nr: 'STA36', name: 'Lakering af drypnæse', group: '1002', price: 850.00, customerPricingEnabled: true },
          { nr: 'STA40', name: 'Sprøjtelakering af dørplade, træstruktur (Ej brand)', group: '1002', price: 2400.00, customerPricingEnabled: true },
          { nr: 'STA41', name: 'Sprøjtelakering af dørplade, træstruktur - 2. dør', group: '1002', price: 2400.00, customerPricingEnabled: true },
          { nr: 'STA42', name: 'Sprøjtelakering af dørplade, glat (BRAND)', group: '1002', price: 2400.00, customerPricingEnabled: true },
          { nr: 'STA43', name: 'Sprøjtelakering af dørplade, glat (BRAND) 2. dør', group: '1002', price: 2160.00, customerPricingEnabled: true },
          { nr: 'STA44', name: 'Maling af dørplade, indvendig', group: '1002', price: 850.00, customerPricingEnabled: true },
          { nr: 'STA50', name: 'Glaspolering, 1. felt - under 15 cm ridse', group: '1003', price: 1475.00, customerPricingEnabled: true },
          { nr: 'STA51', name: 'Glaspolering, 1. felt - over 15 cm.', group: '1003', price: 2062.50, customerPricingEnabled: true },
          { nr: 'STA52', name: 'Glaspolering, øvrige felter, under 15 cm ridse', group: '1003', price: 1327.50, customerPricingEnabled: true },
          { nr: 'STA53', name: 'Glaspolering, øvrige felter, over 15 cm ridse', group: '1003', price: 1856.50, customerPricingEnabled: true }
        ].map(p => ({ ...p, id: uuidv4(), unit: 'stk', description: '', createdAt: new Date() }))

        await db.collection('products').insertMany(defaultProducts)
      }

      const products = await db.collection('products').find({}).sort({ nr: 1 }).toArray()
      const cleaned = products.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Update product - PUT /api/products/:id
    if (route.match(/^\/products\/[^/]+$/) && method === 'PUT') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const productId = path[1]
      const body = await request.json()

      await db.collection('products').updateOne(
        { id: productId },
        { $set: { ...body, updatedAt: new Date() } }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ CUSTOMER PRICING ============
    
    // Get customer pricing - GET /api/customer-pricing/:companyId
    if (route.match(/^\/customer-pricing\/[^/]+$/) && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const companyId = path[1]
      const pricing = await db.collection('customer_pricing').findOne({ companyId })
      
      if (!pricing) {
        return handleCORS(NextResponse.json({ companyId, discountPercent: 0, customPrices: {} }))
      }

      const { _id, ...rest } = pricing
      return handleCORS(NextResponse.json(rest))
    }

    // Save customer pricing - PUT /api/customer-pricing/:companyId
    if (route.match(/^\/customer-pricing\/[^/]+$/) && method === 'PUT') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const companyId = path[1]
      const body = await request.json()

      await db.collection('customer_pricing').updateOne(
        { companyId },
        { 
          $set: { 
            companyId,
            discountPercent: body.discountPercent || 0,
            customPrices: body.customPrices || {},
            updatedAt: new Date()
          },
          $setOnInsert: { id: uuidv4(), createdAt: new Date() }
        },
        { upsert: true }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ INVOICES ============
    
    // Get all invoices - GET /api/invoices
    if (route === '/invoices' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const status = url.searchParams.get('status')
      const taskId = url.searchParams.get('taskId')

      let query = {}
      if (status) query.status = status
      if (taskId) query.taskId = taskId

      const invoices = await db.collection('invoices').find(query).sort({ createdAt: -1 }).toArray()
      const cleaned = invoices.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Create/Update invoice for task - POST /api/invoices
    if (route === '/invoices' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      
      // Check if invoice exists for this task
      let invoice = await db.collection('invoices').findOne({ taskId: body.taskId })
      
      if (invoice) {
        // Update existing
        await db.collection('invoices').updateOne(
          { taskId: body.taskId },
          { 
            $set: { 
              lines: body.lines || [],
              subtotal: body.subtotal || 0,
              vat: body.vat || 0,
              total: body.total || 0,
              status: body.status || 'draft',
              updatedAt: new Date(),
              updatedBy: user.id,
              updatedByName: user.name
            } 
          }
        )
        invoice = await db.collection('invoices').findOne({ taskId: body.taskId })
      } else {
        // Create new
        const task = await db.collection('tasks').findOne({ id: body.taskId })
        
        // Generate invoice number
        const lastInvoice = await db.collection('invoices').find({}).sort({ invoiceNumber: -1 }).limit(1).toArray()
        const nextNumber = lastInvoice.length > 0 ? (lastInvoice[0].invoiceNumber || 1000) + 1 : 1001

        invoice = {
          id: uuidv4(),
          invoiceNumber: nextNumber,
          taskId: body.taskId,
          companyId: task?.companyId,
          companyName: task?.companyName,
          address: task?.address,
          lines: body.lines || [],
          subtotal: body.subtotal || 0,
          vat: body.vat || 0,
          total: body.total || 0,
          status: body.status || 'draft', // draft, ready, sent, paid
          createdAt: new Date(),
          createdBy: user.id,
          createdByName: user.name
        }
        await db.collection('invoices').insertOne(invoice)
      }

      // Log the action
      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        entityType: 'invoice',
        entityId: invoice.id,
        action: body.status === 'ready' ? 'marked_ready' : 'updated',
        description: body.status === 'ready' ? 'Faktura markeret klar til fakturering' : 'Faktura opdateret',
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      })

      const { _id, ...cleanInvoice } = invoice
      return handleCORS(NextResponse.json(cleanInvoice))
    }

    // Update invoice status - PATCH /api/invoices/:id/status
    if (route.match(/^\/invoices\/[^/]+\/status$/) && method === 'PATCH') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const invoiceId = path[1]
      const body = await request.json()

      await db.collection('invoices').updateOne(
        { id: invoiceId },
        { $set: { status: body.status, updatedAt: new Date() } }
      )

      // Log the action
      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        entityType: 'invoice',
        entityId: invoiceId,
        action: 'status_changed',
        description: `Faktura status ændret til: ${body.status}`,
        userId: user.id,
        userName: user.name,
        createdAt: new Date()
      })

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ SETTINGS / API KEYS ============
    
    // Get settings - GET /api/settings
    if (route === '/settings' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const settings = await db.collection('settings').findOne({ type: 'api_keys' })
      
      if (!settings) {
        return handleCORS(NextResponse.json({
          dmi: process.env.DMI_API_KEY ? '••••••••' : '',
          googleMaps: process.env.GOOGLE_MAPS_API_KEY ? '••••••••' : '',
          syncfusion: process.env.SYNCFUSION_LICENSE_KEY ? '••••••••' : '',
          twilioSid: process.env.TWILIO_ACCOUNT_SID ? '••••••••' : '',
          twilioAuth: process.env.TWILIO_AUTH_TOKEN ? '••••••••' : '',
          twilioPhone: process.env.TWILIO_PHONE_NUMBER || '',
          sendgrid: process.env.SENDGRID_API_KEY ? '••••••••' : '',
          sendgridFrom: process.env.SENDGRID_FROM_EMAIL || '',
          dinero: ''
        }))
      }

      const keys = settings.keys || {}
      // Masker følsomme nøgler så de ikke vises i klartekst efter genindlæsning
      const SENSITIVE_KEYS = ['googleMaps', 'dmi', 'syncfusion', 'twilioSid', 'twilioAuth', 'sendgrid', 'dinero']
      const masked = { ...keys }
      SENSITIVE_KEYS.forEach(k => {
        if (masked[k] && String(masked[k]).trim() !== '') masked[k] = '••••••••'
      })
      return handleCORS(NextResponse.json(masked))
    }

    // Save settings - PUT /api/settings
    if (route === '/settings' && method === 'PUT') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()

      await db.collection('settings').updateOne(
        { type: 'api_keys' },
        { 
          $set: { 
            type: 'api_keys',
            keys: body,
            updatedAt: new Date(),
            updatedBy: user.id
          }
        },
        { upsert: true }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============ DATA FIELDS / OPTIONS ============
    
    // Get editable options - GET /api/options/editable
    if (route === '/options/editable' && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const customOptions = await db.collection('settings').findOne({ type: 'data_fields' })
      
      // Default options
      const defaults = {
        buildingParts: [
          { value: 'bundstykke', label: 'Bundstykke' },
          { value: 'ramme', label: 'Ramme' },
          { value: 'karm', label: 'Karm' },
          { value: 'dorplade', label: 'Dørplade' },
          { value: 'glas', label: 'Glas' },
          { value: 'sparkeplade', label: 'Sparkeplade' },
          { value: 'drypnaese', label: 'Drypnæse' },
          { value: 'haandtag', label: 'Håndtag' },
          { value: 'hængsel', label: 'Hængsel' },
          { value: 'andet', label: 'Andet' }
        ],
        locations: [
          { value: 'indgang', label: 'Indgang' },
          { value: 'koekken', label: 'Køkken' },
          { value: 'stue', label: 'Stue' },
          { value: 'vaerelse', label: 'Værelse' },
          { value: 'badevaerelse', label: 'Badeværelse' },
          { value: 'garage', label: 'Garage' },
          { value: 'kaelder', label: 'Kælder' },
          { value: 'terrasse', label: 'Terrasse' },
          { value: 'andet', label: 'Andet' }
        ],
        colors: [
          { value: 'hvid', label: 'Hvid' },
          { value: 'sort', label: 'Sort' },
          { value: 'gra', label: 'Grå' },
          { value: 'antracit', label: 'Antracit' },
          { value: 'brun', label: 'Brun' },
          { value: 'not_specified', label: 'Ikke specificeret' }
        ],
        taskTypes: [
          { value: 'PLA', label: 'PLA (Plast)' },
          { value: 'BUN', label: 'BUN (Bundstykke)' },
          { value: 'GLA', label: 'GLA (Glas)' },
          { value: 'ALU', label: 'ALU (Aluminium)' },
          { value: 'TRÆ', label: 'TRÆ (Træ)' },
          { value: 'COA', label: 'COA (Coating)' },
          { value: 'INS', label: 'INS (Isolering)' },
          { value: 'REN', label: 'REN (Rengøring)' }
        ]
      }

      if (customOptions?.fields) {
        return handleCORS(NextResponse.json({ ...defaults, ...customOptions.fields }))
      }

      return handleCORS(NextResponse.json(defaults))
    }

    // Save editable options - PUT /api/options/editable
    if (route === '/options/editable' && method === 'PUT') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()

      await db.collection('settings').updateOne(
        { type: 'data_fields' },
        { 
          $set: { 
            type: 'data_fields',
            fields: body,
            updatedAt: new Date(),
            updatedBy: user.id
          }
        },
        { upsert: true }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============================================
    // BYGHERRE COMMUNICATION ENDPOINTS
    // ============================================

    // Create bygherre communication - POST /api/bygherre/send
    if (route === '/bygherre/send' && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const body = await request.json()
      const { taskId, type, proposedDates, message } = body

      // Get task details
      const task = await db.collection('tasks').findOne({ id: taskId })
      if (!task) {
        return handleCORS(NextResponse.json({ error: 'Opgave ikke fundet' }, { status: 404 }))
      }

      // Generate unique token for public URL
      const token = uuidv4()

      // Create communication record
      const communication = {
        id: uuidv4(),
        token,
        taskId,
        type, // 'confirm_task', 'schedule_outdoor', 'schedule_indoor'
        status: 'sent',
        proposedDates: proposedDates || [], // [{date, timeSlot}]
        requiresAccess: type === 'schedule_indoor',
        
        // Task/contact info for landing page (taskSummary vises for kunder, notes vises IKKE)
        taskInfo: {
          address: task.address,
          postalCode: task.postalCode,
          city: task.city,
          companyName: task.companyName,
          owner1Name: task.owner1Name,
          owner1Phone: task.owner1Phone,
          owner1Email: task.owner1Email,
          taskSummary: task.taskSummary || ''
        },
        
        // Response data (filled when bygherre responds)
        response: null,
        respondedAt: null,
        
        // Final confirmation
        confirmedDate: null,
        confirmedTimeSlot: null,
        finalConfirmationSent: false,
        
        sentBy: user.id,
        sentByName: user.name,
        createdAt: new Date()
      }

      await db.collection('bygherre_communications').insertOne(communication)

      // Log activity
      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        taskId,
        userId: user.id,
        userName: user.name,
        action: 'bygherre_sms_sent',
        details: { type, proposedDates, token },
        timestamp: new Date()
      })

      // Update task to mark that bygherre communication is pending
      // Only mark as pending for schedule types (that require bygherre response)
      // "confirm_task" is just a notification - no response needed
      if (type !== 'confirm_task') {
        await db.collection('tasks').updateOne(
          { id: taskId },
          { 
            $set: { 
              bygherreCommPending: true,
              bygherreCommId: communication.id,
              bygherreCommType: type
            } 
          }
        )
      }

      // Send SMS via Twilio
      const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/bygherre/${type === 'schedule_indoor' ? 'vaelg-dato' : 'bekraeft'}/${token}`
      
      // Build SMS message based on type
      let smsMessage = ''
      const taskAddr = task.address + ', ' + task.postalCode + ' ' + task.city
      
      if (type === 'confirm_task') {
        // SMS_01: Simple confirmation notification
        smsMessage = `Hej ${task.owner1Name || 'Bygherre'},\n\nVi har registreret en service-opgave på din adresse: ${taskAddr}.\n\nMvh. SMARTREP`
      } else if (type === 'schedule_outdoor') {
        // SMS_02: Outdoor visit notification with date
        const dateStr = proposedDates[0]?.date ? new Date(proposedDates[0].date).toLocaleDateString('da-DK') : 'snart'
        const timeStr = proposedDates[0]?.timeSlot ? formatTimeSlotForSMS(proposedDates[0].timeSlot) : ''
        smsMessage = `Hej ${task.owner1Name || 'Bygherre'},\n\nVi kommer forbi ${taskAddr} den ${dateStr}${timeStr ? ' kl. ' + timeStr : ''} for udvendigt arbejde.\n\nBekræft venligst her: ${publicUrl}\n\nMvh. SMARTREP`
      } else if (type === 'schedule_indoor') {
        // SMS_03: Indoor visit with date options
        const datesText = proposedDates.filter(d => d.date).map(d => {
          const dateStr = new Date(d.date).toLocaleDateString('da-DK')
          const timeStr = formatTimeSlotForSMS(d.timeSlot)
          return `${dateStr} kl. ${timeStr}`
        }).join('\n')
        smsMessage = `Hej ${task.owner1Name || 'Bygherre'},\n\nVi skal udføre indvendigt arbejde på ${taskAddr}.\n\nVælg venligst en af følgende datoer:\n${datesText}\n\nBekræft her: ${publicUrl}\n\nMvh. SMARTREP`
      }
      
      // Send the SMS if we have a phone number
      let smsResult = { success: false, error: 'Ingen telefonnummer' }
      const bygherrePhone = task.owner1Phone || task.owner2Phone
      
      if (bygherrePhone && smsMessage) {
        smsResult = await sendSMS(bygherrePhone, smsMessage)
      }
      
      // Update communication with SMS result
      await db.collection('bygherre_communications').updateOne(
        { id: communication.id },
        { $set: { smsResult, smsSentAt: new Date() } }
      )

      const { _id, ...cleanComm } = communication
      return handleCORS(NextResponse.json({ 
        ...cleanComm, 
        publicUrl,
        smsResult,
        message: smsResult.success ? 'SMS sendt til bygherre' : 'Kommunikation oprettet (SMS fejlede: ' + smsResult.error + ')'
      }, { status: 201 }))
    }

    // Get bygherre communication by token (public) - GET /api/bygherre/public/:token
    if (route.match(/^\/bygherre\/public\/[^/]+$/) && method === 'GET') {
      const token = path[2]
      
      const comm = await db.collection('bygherre_communications').findOne({ token })
      if (!comm) {
        return handleCORS(NextResponse.json({ error: 'Ugyldig eller udløbet link' }, { status: 404 }))
      }

      // Return only necessary info for public page
      const publicData = {
        id: comm.id,
        type: comm.type,
        taskInfo: comm.taskInfo,
        proposedDates: comm.proposedDates,
        requiresAccess: comm.requiresAccess,
        status: comm.status,
        hasResponded: !!comm.response
      }

      return handleCORS(NextResponse.json(publicData))
    }

    // Submit bygherre response (public) - POST /api/bygherre/public/:token/respond
    if (route.match(/^\/bygherre\/public\/[^/]+\/respond$/) && method === 'POST') {
      const token = path[2]
      const body = await request.json()
      
      const comm = await db.collection('bygherre_communications').findOne({ token })
      if (!comm) {
        return handleCORS(NextResponse.json({ error: 'Ugyldig eller udløbet link' }, { status: 404 }))
      }

      if (comm.response) {
        return handleCORS(NextResponse.json({ error: 'Der er allerede svaret på denne forespørgsel' }, { status: 400 }))
      }

      const { 
        confirmed, // true/false
        selectedDates, // array of selected date indices
        accessMethod, // 'home' | 'key'
        keyLocation, // string if accessMethod === 'key'
        alternativeDates, // string with suggested dates if declined
        remarks, // optional remarks
        phone // optional phone
      } = body

      const response = {
        confirmed,
        selectedDates: selectedDates || [],
        accessMethod: accessMethod || null,
        keyLocation: keyLocation || null,
        alternativeDates: alternativeDates || null,
        remarks: remarks || null,
        phone: phone || null,
        submittedAt: new Date()
      }

      await db.collection('bygherre_communications').updateOne(
        { token },
        { 
          $set: { 
            response,
            respondedAt: new Date(),
            status: confirmed ? 'accepted' : 'declined'
          } 
        }
      )

      // Log activity
      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        taskId: comm.taskId,
        action: 'bygherre_response',
        details: { confirmed, selectedDates, accessMethod },
        timestamp: new Date()
      })

      // Clear the pending flag on the task when bygherre responds
      await db.collection('tasks').updateOne(
        { id: comm.taskId },
        { $set: { bygherreCommPending: false } }
      )

      // If single date was confirmed, auto-send SMS_03
      if (confirmed && comm.type === 'schedule_outdoor' && comm.proposedDates.length === 1) {
        // Update task with confirmed date
        await db.collection('tasks').updateOne(
          { id: comm.taskId },
          { 
            $set: { 
              bygherreConfirmed: true,
              bygherreConfirmedDate: comm.proposedDates[0].date,
              bygherreConfirmedTimeSlot: comm.proposedDates[0].timeSlot
            } 
          }
        )
        // TODO: Send confirmation SMS_03 via Twilio
      }

      // If datoforslag was accepted, update task with selected date
      if (confirmed && comm.type === 'schedule_indoor' && selectedDates && selectedDates.length > 0) {
        const selectedIdx = selectedDates[0]
        const selectedDate = comm.proposedDates[selectedIdx]
        if (selectedDate) {
          await db.collection('tasks').updateOne(
            { id: comm.taskId },
            { 
              $set: { 
                bygherreConfirmed: true,
                bygherreConfirmedDate: selectedDate.date,
                bygherreConfirmedTimeSlot: selectedDate.timeSlot,
                bygherreAccessMethod: accessMethod || null,
                bygherreKeyLocation: keyLocation || null,
                bygherreRemarks: remarks || null
              } 
            }
          )
        }
      }

      return handleCORS(NextResponse.json({ 
        success: true, 
        message: confirmed ? 'Tak for din bekræftelse!' : 'Tak for dit svar!'
      }))
    }

    // Send final confirmation (SMS_06) - POST /api/bygherre/:id/confirm-final
    if (route.match(/^\/bygherre\/[^/]+\/confirm-final$/) && method === 'POST') {
      const user = getUserFromToken(request)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const commId = path[1]
      const body = await request.json()
      const { confirmedDate, confirmedTimeSlot } = body

      const comm = await db.collection('bygherre_communications').findOne({ id: commId })
      if (!comm) {
        return handleCORS(NextResponse.json({ error: 'Kommunikation ikke fundet' }, { status: 404 }))
      }

      await db.collection('bygherre_communications').updateOne(
        { id: commId },
        { 
          $set: { 
            confirmedDate,
            confirmedTimeSlot,
            finalConfirmationSent: true,
            finalConfirmationSentAt: new Date(),
            finalConfirmationSentBy: user.id,
            status: 'confirmed'
          } 
        }
      )

      // Update task
      await db.collection('tasks').updateOne(
        { id: comm.taskId },
        { 
          $set: { 
            bygherreCommPending: false,
            bygherreConfirmed: true,
            bygherreConfirmedDate: confirmedDate,
            bygherreConfirmedTimeSlot: confirmedTimeSlot
          } 
        }
      )

      // Log activity
      await db.collection('activity_logs').insertOne({
        id: uuidv4(),
        taskId: comm.taskId,
        userId: user.id,
        userName: user.name,
        action: 'bygherre_final_confirmation',
        details: { confirmedDate, confirmedTimeSlot },
        timestamp: new Date()
      })

      // Send SMS_06 - Final confirmation to bygherre
      const task = await db.collection('tasks').findOne({ id: comm.taskId })
      if (task) {
        const bygherrePhone = task.owner1Phone || task.owner2Phone
        if (bygherrePhone) {
          const dateStr = new Date(confirmedDate).toLocaleDateString('da-DK')
          const timeStr = formatTimeSlotForSMS(confirmedTimeSlot)
          const taskAddr = task.address + ', ' + task.postalCode + ' ' + task.city
          const smsMessage = `Hej ${task.owner1Name || 'Bygherre'},\n\nDin aftale er nu bekræftet!\n\nDato: ${dateStr}\nTidspunkt: ${timeStr}\nAdresse: ${taskAddr}\n\nMvh. SMARTREP`
          await sendSMS(bygherrePhone, smsMessage)
        }
      }

      return handleCORS(NextResponse.json({ success: true, message: 'Endelig bekræftelse sendt' }))
    }

    // Get bygherre communications for a task - GET /api/bygherre/task/:taskId
    if (route.match(/^\/bygherre\/task\/[^/]+$/) && method === 'GET') {
      const user = getUserFromToken(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 }))
      }

      const taskId = path[2]
      
      const communications = await db.collection('bygherre_communications')
        .find({ taskId })
        .sort({ createdAt: -1 })
        .toArray()

      const cleaned = communications.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // Root endpoint
    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'SMARTREP API v1.0', status: 'online' }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` },
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    const msg = error?.message || String(error)
    const isDbError = !process.env.MONGO_URL?.trim() ||
      /connect|ECONNREFUSED|MongoServerError|MongoNetworkError|getaddrinfo|ENOTFOUND|authentication failed|timed out|ETIMEDOUT/i.test(msg)
    const userMessage = isDbError
      ? 'Kunne ikke forbinde til database. Tjek at MONGO_URL, DB_NAME og JWT_SECRET er sat i Vercel, og at MongoDB Atlas tillader adgang (Network Access: Allow from anywhere).'
      : (msg ? `Fejl: ${msg.substring(0, 200)}` : 'Internal server error')
    return handleCORS(NextResponse.json(
      { error: userMessage, details: msg },
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute