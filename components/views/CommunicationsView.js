'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Phone, Mail, Send, Loader2, Megaphone } from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { api, BRAND_BLUE } from '@/lib/constants'
import { PhoneInput } from '@/components/ui/phone-input'

const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: #0133ff; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">SMARTREP</h1>
    </div>
    <div style="padding: 30px; background: #f9fafb;">
      <p>Kære {{Kontakt_navn}},</p>
      <p>Indsæt din besked her...</p>
      <p>Med venlig hilsen,<br/>SMARTREP</p>
    </div>
    <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
      SMARTREP ApS | www.smartrep.nu
    </div>
  </div>
</body></html>`

function smsSegmentCount(len) {
  if (len <= 0) return 0
  if (len <= 160) return 1
  if (len <= 306) return 2
  return Math.ceil(len / 153)
}

export default function CommunicationsView() {
  const [activeSection, setActiveSection] = useState('send') // 'send' | 'marketing'
  const [activeTab, setActiveTab] = useState('sms')
  const [loading, setLoading] = useState(false)
  const [smsForm, setSmsForm] = useState({ to: '', message: '' })
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', html: '' })
  const [history, setHistory] = useState([])
  const [emailStatus, setEmailStatus] = useState(null)

  // Marketing
  const [companies, setCompanies] = useState([])
  const [contacts, setContacts] = useState([])
  const [marketingCompanyId, setMarketingCompanyId] = useState('')
  const [marketingContactIds, setMarketingContactIds] = useState([])
  const [marketingSendSms, setMarketingSendSms] = useState(false)
  const [marketingSendEmail, setMarketingSendEmail] = useState(false)
  const [marketingSms, setMarketingSms] = useState('')
  const [marketingEmailSubject, setMarketingEmailSubject] = useState('')
  const [marketingEmailHtml, setMarketingEmailHtml] = useState(DEFAULT_EMAIL_TEMPLATE)
  const [marketingSending, setMarketingSending] = useState(false)

  const templates = [
    { id: '1', name: 'Ordrebekræftelse', type: 'email', subject: 'Ordrebekræftelse - {{Sagsnr}}', body: 'Kære {{Kontakt_navn}},\n\nVi bekræfter hermed modtagelsen af din ordre.\n\nKunde: {{Kunde}}\nSagsnr: {{Sagsnr}}\nAdresse: {{Adresse}}\n\nMed venlig hilsen,\nSMARTREP' },
    { id: '2', name: 'Planlagt besøg', type: 'sms', body: 'Hej {{Bygherre_navn}}, SMARTREP kommer d. {{Dato}} kl. {{Tid}} til {{Adresse}}. Mvh SMARTREP' },
    { id: '3', name: 'Opgave udført', type: 'email', subject: 'Opgave udført - {{Sagsnr}}', body: 'Kære {{Kontakt_navn}},\n\nVi har færdiggjort arbejdet på:\n{{Adresse}}\n\nMed venlig hilsen,\nSMARTREP' }
  ]

  useEffect(() => { api.get('/communications').then(setHistory).catch(console.error) }, [])
  useEffect(() => { api.get('/email/status').then(setEmailStatus).catch(() => setEmailStatus(null)) }, [])
  useEffect(() => {
    api.get('/companies').then(setCompanies).catch(console.error)
  }, [])
  useEffect(() => {
    api.get('/users').then(users => setContacts(users.filter(u => u.role === 'customer'))).catch(console.error)
  }, [])

  const sendSMS = async () => {
    setLoading(true)
    try {
      await api.post('/sms/send', smsForm)
      setSmsForm({ to: '', message: '' })
      api.get('/communications').then(setHistory)
      alert('SMS sendt!')
    } catch (err) { alert('Fejl: ' + err.message) }
    finally { setLoading(false) }
  }

  const sendEmail = async () => {
    setLoading(true)
    try {
      await api.post('/email/send', emailForm)
      setEmailForm({ to: '', subject: '', html: '' })
      api.get('/communications').then(setHistory)
      alert('Email sendt!')
    } catch (err) { alert('Fejl: ' + err.message) }
    finally { setLoading(false) }
  }

  const applyTemplate = (t) => {
    if (t.type === 'sms') {
      setSmsForm(prev => ({ ...prev, message: t.body }))
      setActiveTab('sms')
    } else {
      setEmailForm(prev => ({ ...prev, subject: t.subject, html: t.body }))
      setActiveTab('email')
    }
  }

  const marketingContacts = marketingCompanyId
    ? contacts.filter(c => c.companyId === marketingCompanyId)
    : contacts

  const sendMarketing = async () => {
    const ids = marketingContactIds.length ? marketingContactIds : marketingContacts.map(c => c.id)
    if (!marketingSendSms && !marketingSendEmail) {
      alert('Vælg SMS and/or E-mail')
      return
    }
    if (ids.length === 0) {
      alert('Vælg mindst én kontakt')
      return
    }
    if (marketingSendEmail && (!marketingEmailSubject || !marketingEmailHtml)) {
      alert('Udfyld e-mail emne og indhold')
      return
    }
    if (marketingSendSms && !marketingSms.trim()) {
      alert('Udfyld SMS besked')
      return
    }
    setMarketingSending(true)
    try {
      await api.post('/marketing/send', {
        companyId: marketingCompanyId || undefined,
        contactIds: ids,
        sendSms: marketingSendSms,
        sendEmail: marketingSendEmail,
        smsMessage: marketingSendSms ? marketingSms : undefined,
        emailSubject: marketingSendEmail ? marketingEmailSubject : undefined,
        emailHtml: marketingSendEmail ? marketingEmailHtml : undefined
      })
      setMarketingSms('')
      api.get('/communications').then(setHistory)
      alert('Marketing sendt!')
    } catch (err) { alert('Fejl: ' + err.message) }
    finally { setMarketingSending(false) }
  }

  const loadDefaultEmailTemplate = () => {
    setMarketingEmailHtml(DEFAULT_EMAIL_TEMPLATE)
  }

  const smsSegments = smsSegmentCount(marketingSms.length)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kommunikation</h2>
          <p className="text-gray-500">Send SMS og email til kunder</p>
        </div>
        {emailStatus && (
          <div className={`text-xs px-3 py-1.5 rounded ${emailStatus.configured ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {emailStatus.configured ? `Email: ${emailStatus.fromEmail}` : emailStatus.hint}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeSection === 'send' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('send')}
          style={activeSection === 'send' ? { backgroundColor: BRAND_BLUE } : {}}
        >
          <Send className="w-4 h-4 mr-2" />Send
        </Button>
        <Button
          variant={activeSection === 'marketing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('marketing')}
          style={activeSection === 'marketing' ? { backgroundColor: BRAND_BLUE } : {}}
        >
          <Megaphone className="w-4 h-4 mr-2" />Marketing
        </Button>
      </div>

      {activeSection === 'send' && (
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Skabeloner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.map(t => (
                <Button
                  key={t.id}
                  variant="outline"
                  className="w-full justify-start text-left"
                  onClick={() => applyTemplate(t)}
                >
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs opacity-70">{t.type.toUpperCase()}</p>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader>
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'sms' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('sms')}
                  style={activeTab === 'sms' ? { backgroundColor: BRAND_BLUE } : {}}
                >
                  <Phone className="w-4 h-4 mr-2" />SMS
                </Button>
                <Button
                  variant={activeTab === 'email' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('email')}
                  style={activeTab === 'email' ? { backgroundColor: BRAND_BLUE } : {}}
                >
                  <Mail className="w-4 h-4 mr-2" />Email
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeTab === 'sms' ? (
                <>
                  <div>
                    <Label>Telefonnummer</Label>
                    <PhoneInput
                      value={smsForm.to}
                      onChange={(e) => setSmsForm(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Besked</Label>
                    <Textarea
                      placeholder="Din SMS besked..."
                      value={smsForm.message}
                      onChange={(e) => setSmsForm(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Merge-felter: {`{{Kunde}}, {{Kontakt_navn}}, {{Sagsnr}}, {{Adresse}}`}
                    </p>
                  </div>
                  <Button
                    onClick={sendSMS}
                    disabled={loading}
                    className="text-white"
                    style={{ backgroundColor: BRAND_BLUE }}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    <Send className="w-4 h-4 mr-2" />Send SMS
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <Label>Modtager</Label>
                    <Input
                      type="email"
                      placeholder="modtager@email.dk"
                      value={emailForm.to}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Emne</Label>
                    <Input
                      placeholder="Email emne..."
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Indhold</Label>
                    <Textarea
                      placeholder="Email indhold..."
                      value={emailForm.html}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, html: e.target.value }))}
                      rows={6}
                    />
                  </div>
                  <Button
                    onClick={sendEmail}
                    disabled={loading}
                    className="text-white"
                    style={{ backgroundColor: BRAND_BLUE }}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    <Send className="w-4 h-4 mr-2" />Send Email
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'marketing' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Marketing</CardTitle>
            <p className="text-xs text-gray-500">Vælg kunde og kontakter, SMS og/eller E-mail</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vælg kunde</Label>
                <Select value={marketingCompanyId} onValueChange={setMarketingCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Vælg kunde..." /></SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Kontakter (vælg eller afkryds manuelt)</Label>
              <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                {marketingContacts.map(c => {
                  const isChecked = marketingContactIds.length === 0 || marketingContactIds.includes(c.id)
                  return (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={!!isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setMarketingContactIds(prev =>
                              prev.length === 0 ? marketingContacts.map(x => x.id) : (prev.includes(c.id) ? prev : [...prev, c.id])
                            )
                          } else {
                            setMarketingContactIds(prev =>
                              prev.length === 0 ? marketingContacts.map(x => x.id).filter(id => id !== c.id) : prev.filter(id => id !== c.id)
                            )
                          }
                        }}
                      />
                      <span className="text-sm">{c.name} {c.email && <span className="text-gray-500">({c.email})</span>}</span>
                    </label>
                  )
                })}
                {marketingContacts.length === 0 && <p className="text-sm text-gray-500">Vælg kunde for at se kontakter</p>}
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <Checkbox checked={marketingSendSms} onCheckedChange={setMarketingSendSms} />
                <span className="text-sm">SMS</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={marketingSendEmail} onCheckedChange={setMarketingSendEmail} />
                <span className="text-sm">E-mail</span>
              </label>
            </div>
            {marketingSendEmail && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>E-mail (standard skabelon loades)</Label>
                  <Button variant="outline" size="sm" onClick={loadDefaultEmailTemplate}>Load skabelon</Button>
                </div>
                <Input
                  placeholder="Emne"
                  value={marketingEmailSubject}
                  onChange={(e) => setMarketingEmailSubject(e.target.value)}
                />
                <Textarea
                  placeholder="E-mail indhold (HTML tilladt)"
                  value={marketingEmailHtml}
                  onChange={(e) => setMarketingEmailHtml(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            )}
            {marketingSendSms && (
              <div>
                <Label>SMS</Label>
                <Textarea
                  placeholder="SMS besked..."
                  value={marketingSms}
                  onChange={(e) => setMarketingSms(e.target.value)}
                  rows={4}
                />
                <p className={`text-xs mt-1 ${smsSegments > 1 ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                  {marketingSms.length} tegn = {smsSegments} SMS
                </p>
              </div>
            )}
            <Button
              onClick={sendMarketing}
              disabled={marketingSending}
              className="text-white"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              {marketingSending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <Send className="w-4 h-4 mr-2" />Send
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Seneste kommunikation</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.slice(0, 15).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.type === 'marketing' ? (
                      <Megaphone className="w-4 h-4 text-purple-500" />
                    ) : item.type === 'sms' ? (
                      <Phone className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Mail className="w-4 h-4 text-gray-400" />
                    )}
                    <div>
                      {item.type === 'marketing' && item.recipients?.length ? (
                        <p className="text-sm font-medium">Marketing: {item.recipients.map(r => r.name || r.email).join(', ')}</p>
                      ) : (
                        <p className="text-sm font-medium">{item.to}</p>
                      )}
                      <p className="text-xs text-gray-500 truncate max-w-md">{item.message || item.subject}</p>
                      {item.createdAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: da })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={item.status === 'sent' ? 'default' : 'destructive'}>
                    {item.status === 'sent' ? 'Sendt' : 'Fejlet'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Ingen kommunikation endnu</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
