'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Phone, Mail, Send, Loader2 } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

export default function CommunicationsView() {
  const [activeTab, setActiveTab] = useState('sms')
  const [loading, setLoading] = useState(false)
  const [smsForm, setSmsForm] = useState({ to: '', message: '' })
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', html: '' })
  const [history, setHistory] = useState([])
  const templates = [
    { id: '1', name: 'Ordrebekræftelse', type: 'email', subject: 'Ordrebekræftelse - {{Sagsnr}}', body: 'Kære {{Kontakt_navn}},\n\nVi bekræfter hermed modtagelsen af din ordre.\n\nKunde: {{Kunde}}\nSagsnr: {{Sagsnr}}\nAdresse: {{Adresse}}\n\nMed venlig hilsen,\nSMARTREP' },
    { id: '2', name: 'Planlagt besøg', type: 'sms', body: 'Hej {{Bygherre_navn}}, SMARTREP kommer d. {{Dato}} kl. {{Tid}} til {{Adresse}}. Mvh SMARTREP' },
    { id: '3', name: 'Opgave udført', type: 'email', subject: 'Opgave udført - {{Sagsnr}}', body: 'Kære {{Kontakt_navn}},\n\nVi har færdiggjort arbejdet på:\n{{Adresse}}\n\nMed venlig hilsen,\nSMARTREP' }
  ]

  useEffect(() => { api.get('/communications').then(setHistory).catch(console.error) }, [])

  const sendSMS = async () => {
    setLoading(true)
    try { 
      await api.post('/sms/send', smsForm)
      setSmsForm({ to: '', message: '' })
      api.get('/communications').then(setHistory)
      alert('SMS sendt!') 
    }
    catch (err) { alert('Fejl: ' + err.message) }
    finally { setLoading(false) }
  }

  const sendEmail = async () => {
    setLoading(true)
    try { 
      await api.post('/email/send', emailForm)
      setEmailForm({ to: '', subject: '', html: '' })
      api.get('/communications').then(setHistory)
      alert('Email sendt!') 
    }
    catch (err) { alert('Fejl: ' + err.message) }
    finally { setLoading(false) }
  }

  const applyTemplate = (t) => {
    if (t.type === 'sms') { 
      setSmsForm(prev => ({ ...prev, message: t.body }))
      setActiveTab('sms') 
    }
    else { 
      setEmailForm(prev => ({ ...prev, subject: t.subject, html: t.body }))
      setActiveTab('email') 
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kommunikation</h2>
        <p className="text-gray-500">Send SMS og email til kunder</p>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        {/* Templates */}
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
        
        {/* Message Form */}
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
                  <Input 
                    placeholder="+45 12345678" 
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
      
      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Seneste kommunikation</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.type === 'sms' ? 
                      <Phone className="w-4 h-4 text-gray-400" /> : 
                      <Mail className="w-4 h-4 text-gray-400" />
                    }
                    <div>
                      <p className="text-sm font-medium">{item.to}</p>
                      <p className="text-xs text-gray-500 truncate max-w-md">{item.message || item.subject}</p>
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