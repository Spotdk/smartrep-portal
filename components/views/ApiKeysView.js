'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

export default function ApiKeysView() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/settings').then(setSettings).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/settings', settings)
      alert('✅ Indstillinger gemt!')
    } catch (err) {
      alert('Fejl: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  const apiFields = [
    { key: 'dmi', label: 'DMI API Key', description: 'Vejr API fra DMI' },
    { key: 'googleMaps', label: 'Google Maps API Key', description: 'Maps JavaScript API + Places API' },
    { key: 'syncfusion', label: 'Syncfusion License Key', description: 'Kalender-komponent licens' },
    { key: 'twilioSid', label: 'Twilio Account SID', description: 'SMS gateway' },
    { key: 'twilioAuth', label: 'Twilio Auth Token', description: 'SMS gateway' },
    { key: 'twilioPhone', label: 'Twilio Phone Number', description: 'F.eks. +45...' },
    { key: 'sendgrid', label: 'SendGrid API Key', description: 'Email gateway' },
    { key: 'sendgridFrom', label: 'SendGrid From Email', description: 'Afsender email' },
    { key: 'dinero', label: 'Dinero API Key', description: 'Fakturering (kommer snart)' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
          <p className="text-gray-500">Konfigurer integrationer og eksterne tjenester</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Gem indstillinger
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {apiFields.map((field) => (
            <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
              <div>
                <Label className="font-medium">{field.label}</Label>
                <p className="text-xs text-gray-500">{field.description}</p>
              </div>
              <div className="col-span-2">
                <Input
                  type={field.key.toLowerCase().includes('auth') || field.key.toLowerCase().includes('key') || field.key.toLowerCase().includes('sid') ? 'password' : 'text'}
                  value={settings[field.key] || ''}
                  onChange={(e) => updateSetting(field.key, e.target.value)}
                  placeholder={field.key.toLowerCase().includes('auth') ? '••••••••' : 'Indtast værdi...'}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}