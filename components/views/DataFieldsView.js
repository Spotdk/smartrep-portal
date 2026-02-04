'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

export default function DataFieldsView() {
  const [fields, setFields] = useState({ buildingParts: [], locations: [], colors: [], taskTypes: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState({ category: '', value: '', label: '' })

  useEffect(() => {
    api.get('/options/editable').then(setFields).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/options/editable', fields)
      alert('✅ Datafelter gemt!')
    } catch (err) {
      alert('Fejl: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const addItem = () => {
    if (!newItem.category || !newItem.value || !newItem.label) return
    setFields(prev => ({
      ...prev,
      [newItem.category]: [...(prev[newItem.category] || []), { value: newItem.value, label: newItem.label }]
    }))
    setNewItem({ category: '', value: '', label: '' })
  }

  const removeItem = (category, value) => {
    setFields(prev => ({
      ...prev,
      [category]: prev[category].filter(item => item.value !== value)
    }))
  }

  const categories = [
    { id: 'buildingParts', label: 'Bygningsdele' },
    { id: 'locations', label: 'Placeringer' },
    { id: 'colors', label: 'Farver' },
    { id: 'taskTypes', label: 'Type (tags)' }
  ]

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Datafelter</h2>
          <p className="text-gray-500">Rediger dropdown-værdier for opgaver</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Gem ændringer
        </Button>
      </div>

      {/* Add New Item */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tilføj nyt felt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Label>Kategori</Label>
              <Select value={newItem.category} onValueChange={(v) => setNewItem(prev => ({ ...prev, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Vælg..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Værdi (intern)</Label>
              <Input 
                value={newItem.value} 
                onChange={(e) => {
                  const v = e.target.value.replace(/\s/g, '_')
                  setNewItem(prev => ({ ...prev, value: prev.category === 'taskTypes' ? v : v.toLowerCase() }))
                }}
                placeholder={newItem.category === 'taskTypes' ? 'f.eks. PLA eller ALU' : 'f.eks. altan'}
              />
            </div>
            <div className="flex-1">
              <Label>Label (vises)</Label>
              <Input 
                value={newItem.label} 
                onChange={(e) => setNewItem(prev => ({ ...prev, label: e.target.value }))}
                placeholder="f.eks. Altan"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addItem} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
                <Plus className="w-4 h-4 mr-1" />Tilføj
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {categories.map(category => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="text-base">{category.label}</CardTitle>
              <CardDescription>{fields[category.id]?.length || 0} værdier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fields[category.id]?.map((item) => (
                  <div key={item.value} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-gray-400 ml-2">({item.value})</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(category.id, item.value)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}