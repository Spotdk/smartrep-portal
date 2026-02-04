'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MapPin } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

export default function TechnicianCreateTaskDialog({ open, onClose, options, companies, user, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyId: '',
    address: '',
    postalCode: '',
    city: '',
    description: '',
    category: 'service',
    estimatedTime: 2
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.companyId || !form.address) return

    setLoading(true)
    try {
      await api.post('/tasks', {
        ...form,
        createdBy: user?.id,
        status: 'awaiting_confirmation'
      })
      
      setForm({
        companyId: '',
        address: '',
        postalCode: '',
        city: '',
        description: '',
        category: 'service',
        estimatedTime: 2
      })
      
      onCreated?.()
    } catch (err) {
      alert('Fejl ved oprettelse: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Opret ny opgave</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Kunde *</Label>
            <Select value={form.companyId} onValueChange={(value) => setForm(prev => ({ ...prev, companyId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg kunde..." />
              </SelectTrigger>
              <SelectContent>
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Adresse *</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Vejnavn og husnummer"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Postnr.</Label>
              <Input
                value={form.postalCode}
                onChange={(e) => setForm(prev => ({ ...prev, postalCode: e.target.value }))}
                placeholder="0000"
              />
            </div>
            <div>
              <Label>By</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="By"
              />
            </div>
          </div>

          <div>
            <Label>Kategori</Label>
            <Select value={form.category} onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="foraflevering">Foraflevering</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="oevrig">Øvrig</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Estimeret tid (timer)</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={form.estimatedTime}
              onChange={(e) => setForm(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 2 }))}
            />
          </div>

          <div>
            <Label>Beskrivelse</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Beskriv opgaven..."
              rows={3}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuller
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !form.companyId || !form.address}
            className="text-white"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Opret opgave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}