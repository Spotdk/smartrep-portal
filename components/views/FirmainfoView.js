'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Building2 } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

const FIELDS = [
  { key: 'companyName', label: 'Firmanavn', placeholder: 'SMARTREP' },
  { key: 'address', label: 'Adresse (kun intern brug)', placeholder: 'Antonio Costas Vej 15', internal: true },
  { key: 'postcode', label: 'Postnr.', placeholder: '7000', internal: true },
  { key: 'city', label: 'By', placeholder: 'Fredericia', internal: true },
  { key: 'cvr', label: 'CVR', placeholder: '25808436' },
  { key: 'bank', label: 'Bank', placeholder: 'Lunar' },
  { key: 'regNo', label: 'Reg. nr.', placeholder: '' },
  { key: 'account', label: 'Konto', placeholder: '' },
  { key: 'phone', label: 'Tlf. nr.', placeholder: '' },
  { key: 'email', label: 'Email', placeholder: '' }
]

export default function FirmainfoView() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/firmainfo').then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  const update = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/firmainfo', data)
      alert('✅ Firmaoplysninger gemt!')
    } catch (err) {
      alert('Fejl: ' + (err.message || 'Kunne ikke gemme'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7" style={{ color: BRAND_BLUE }} />
            Firmaoplysninger
          </h2>
          <p className="text-gray-500 mt-1">
            Bruges på ordrebekræftelser, bygherre-sider og andre dokumenter. Adresse/postnr./by bruges kun internt og vises ikke offentligt.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Gem
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {FIELDS.map(({ key, label, placeholder, internal }) => (
            <div key={key} className="grid grid-cols-3 gap-4 items-center">
              <div>
                <Label className="font-medium">{label}</Label>
                {internal && (
                  <p className="text-xs text-amber-600 mt-0.5">Kun intern beregning – vises ikke på dokumenter</p>
                )}
              </div>
              <div className="col-span-2">
                <Input
                  value={data[key] ?? ''}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
