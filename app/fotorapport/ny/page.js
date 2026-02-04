'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, Trash2, Plus, ArrowLeft, ArrowRight, Check, Loader2, Lock } from 'lucide-react'

const BRAND_BLUE = '#0133ff'

// API Helper
const api = {
  async fetch(endpoint, options = {}) {
    const token = localStorage.getItem('smartrep_token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
    const response = await fetch(`/api${endpoint}`, { ...options, headers })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'API fejl')
    return data
  },
  get: (endpoint) => api.fetch(endpoint),
  post: (endpoint, body) => api.fetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
}

// Building parts options
const BUILDING_PARTS = [
  { value: 'vindue', label: 'Vindue' },
  { value: 'doer', label: 'Dør' },
  { value: 'facade', label: 'Facade' },
  { value: 'tag', label: 'Tag' },
  { value: 'gulv', label: 'Gulv' },
  { value: 'vaeg', label: 'Væg' },
  { value: 'loft', label: 'Loft' },
  { value: 'trappe', label: 'Trappe' },
  { value: 'altan', label: 'Altan' },
  { value: 'carport', label: 'Carport' },
  { value: 'garage', label: 'Garage' },
  { value: 'hegn', label: 'Hegn' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'andet', label: 'Andet' },
]

export default function NyFotorapportPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [companies, setCompanies] = useState([])
  const [contacts, setContacts] = useState([]) // All contacts from API
  
  // Step 1: Task selection
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  
  // Step 2: Address info
  const [addressInfo, setAddressInfo] = useState({
    address: '',
    postalCode: '',
    city: ''
  })
  
  // Step 2: Company (locked after task selection)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedCompanyName, setSelectedCompanyName] = useState('')
  const [isCompanyLocked, setIsCompanyLocked] = useState(false)
  
  // Step 2: Contact fields (ALWAYS EDITABLE)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  
  // Step 3: Damages
  const [damages, setDamages] = useState([
    { id: Date.now(), buildingPart: '', location: '', description: '', closeupPhoto: null, locationPhoto: null }
  ])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [tasksData, companiesData, usersData] = await Promise.all([
        api.get('/tasks'),
        api.get('/companies'),
        api.get('/users')
      ])
      // Filter to show tasks that are planned or under planning
      setTasks(tasksData.filter(t => t.status === 'planned' || t.status === 'under_planning'))
      setCompanies(companiesData || [])
      // Filter contacts (customers)
      setContacts(usersData.filter(u => u.role === 'customer') || [])
    } catch (err) {
      console.error('Load error:', err)
    }
  }

  // Get contacts - show all contacts, but highlight those from selected company
  const getFilteredContacts = () => {
    // Return all contacts - we'll sort them so company contacts come first
    if (!selectedCompanyId) return contacts
    
    // Sort: company contacts first, then others
    return [...contacts].sort((a, b) => {
      const aIsCompany = a.companyId === selectedCompanyId
      const bIsCompany = b.companyId === selectedCompanyId
      if (aIsCompany && !bIsCompany) return -1
      if (!aIsCompany && bIsCompany) return 1
      return 0
    })
  }

  const handleTaskSelect = (taskId) => {
    setSelectedTaskId(taskId)
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setSelectedTask(task)
      
      // Auto-fill address info from task
      setAddressInfo({
        address: task.address || '',
        postalCode: task.postalCode || '',
        city: task.city || ''
      })
      
      // Auto-fill and LOCK company
      setSelectedCompanyId(task.companyId || '')
      setSelectedCompanyName(task.companyName || '')
      setIsCompanyLocked(true)
      
      // Auto-fill contact fields (but keep them EDITABLE)
      setContactName(task.contactName || task.owner1Name || '')
      setContactEmail(task.contactEmail || '')
      setContactPhone(task.contactPhone || task.owner1Phone || '')
    }
  }

  // When selecting a contact from dropdown, fill the editable fields
  const handleContactSelect = (contactId) => {
    if (contactId === 'manual') {
      // User wants to enter manually - clear fields
      setContactName('')
      setContactEmail('')
      setContactPhone('')
      return
    }
    
    const contact = contacts.find(c => c.id === contactId)
    if (contact) {
      setContactName(contact.name || '')
      setContactEmail(contact.email || '')
      setContactPhone(contact.phone || '')
    }
  }

  // Image upload handler
  const handleImageUpload = (damageId, field, e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setDamages(prev => prev.map(d => 
          d.id === damageId ? { ...d, [field]: reader.result } : d
        ))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (damageId, field) => {
    setDamages(prev => prev.map(d => 
      d.id === damageId ? { ...d, [field]: null } : d
    ))
  }

  const updateDamage = (damageId, field, value) => {
    setDamages(prev => prev.map(d => 
      d.id === damageId ? { ...d, [field]: value } : d
    ))
  }

  const addDamage = () => {
    setDamages(prev => [...prev, { 
      id: Date.now(), 
      buildingPart: '', 
      location: '', 
      description: '', 
      closeupPhoto: null, 
      locationPhoto: null 
    }])
  }

  const removeDamage = (damageId) => {
    if (damages.length > 1) {
      setDamages(prev => prev.filter(d => d.id !== damageId))
    }
  }

  const canProceed = () => {
    if (step === 1) return selectedTaskId !== ''
    if (step === 2) return addressInfo.address !== '' && contactName !== '' && (contactEmail !== '' || contactPhone !== '')
    if (step === 3) {
      return damages.every(d => 
        d.buildingPart && d.location && d.closeupPhoto && d.locationPhoto
      )
    }
    return false
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Create report as DRAFT first
      const result = await api.post('/photoreports', {
        taskId: selectedTaskId,
        companyId: selectedCompanyId,
        contactName: contactName,
        contactEmail: contactEmail,
        contactPhone: contactPhone,
        address: addressInfo.address,
        postalCode: addressInfo.postalCode,
        city: addressInfo.city,
        damages: damages.map(d => ({
          id: d.id.toString(),
          item: BUILDING_PARTS.find(p => p.value === d.buildingPart)?.label || d.buildingPart,
          type: d.description || d.buildingPart,
          location: d.location,
          notes: d.description,
          closeupPhoto: d.closeupPhoto,
          locationPhoto: d.locationPhoto,
          status: 'pending'
        }))
      })

      // Ask if user wants to send immediately
      const shouldSend = confirm('✅ Fotorapport oprettet som kladde!\n\nVil du sende den til kunden nu via SMS og Email?')
      
      if (shouldSend && result.id) {
        try {
          const sendResult = await api.post(`/photoreports/${result.id}/send`)
          alert(`📤 Rapport sendt!\n\nSMS: ${sendResult.notifications?.sms || 'Ikke konfigureret'}\nEmail: ${sendResult.notifications?.email || 'Ikke konfigureret'}\n\nReview link:\n${sendResult.reviewUrl || ''}`)
        } catch (sendErr) {
          alert('Rapporten blev oprettet, men kunne ikke sendes: ' + sendErr.message + '\n\nDu kan sende den senere fra Fotorapporter-oversigten.')
        }
      } else {
        alert('✅ Rapporten er gemt som kladde.\n\nDu kan sende den senere fra Fotorapporter-oversigten.')
      }
      
      router.push('/')
    } catch (err) {
      alert('Fejl: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📷</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Opret Ny Fotorapport</h1>
              <p className="text-sm text-gray-500">Trin {step} af 3</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            Annuller
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <div className="flex-1">
              <div className={`h-2 rounded-full ${step >= 1 ? 'bg-green-500' : 'bg-gray-200'}`} style={step === 1 ? { backgroundColor: BRAND_BLUE } : step > 1 ? { backgroundColor: '#22c55e' } : {}} />
              <p className={`text-xs mt-1 text-center ${step === 1 ? 'font-semibold' : 'text-gray-500'}`}>
                Vælg Opgave
              </p>
            </div>
            <div className="flex-1 mx-1">
              <div className={`h-2 rounded-full ${step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`} style={step === 2 ? { backgroundColor: BRAND_BLUE } : step > 2 ? { backgroundColor: '#22c55e' } : {}} />
              <p className={`text-xs mt-1 text-center ${step === 2 ? 'font-semibold' : 'text-gray-500'}`}>
                Kunde & Kontakt
              </p>
            </div>
            <div className="flex-1">
              <div className={`h-2 rounded-full ${step >= 3 ? 'bg-green-500' : 'bg-gray-200'}`} style={step === 3 ? { backgroundColor: BRAND_BLUE } : {}} />
              <p className={`text-xs mt-1 text-center ${step === 3 ? 'font-semibold' : 'text-gray-500'}`}>
                Skader
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4">
        {/* Step 1: Select Task */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Vælg Opgave</h2>
              <p className="text-sm text-gray-500 mb-4">
                Vælg den opgave som fotorapporten skal knyttes til
              </p>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tasks.length === 0 && (
                  <p className="text-gray-500 text-center py-8">Ingen opgaver tilgængelige</p>
                )}
                {tasks.map((task, index) => (
                  <div
                    key={task.id}
                    onClick={() => handleTaskSelect(task.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTaskId === task.id 
                        ? 'border-2 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    style={selectedTaskId === task.id ? { borderColor: BRAND_BLUE } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">#{index} - {task.address}</p>
                        <p className="text-sm text-gray-500">{task.postalCode} {task.city}</p>
                        <p className="text-sm text-gray-500">{task.companyName}</p>
                      </div>
                      {selectedTaskId === task.id && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: BRAND_BLUE }}>
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Company, Contact & Address */}
        {step === 2 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Kunde & Kontakt</h2>
              <p className="text-sm text-gray-500 mb-4">
                Bekræft eller rediger kontaktoplysninger
              </p>
              
              <div className="space-y-6">
                {/* Company Section - LOCKED */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <Label className="font-semibold">Kunde (fra valgt opgave)</Label>
                  </div>
                  <Input 
                    value={selectedCompanyName}
                    disabled={true}
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Kunden er låst til den valgte opgave</p>
                </div>

                {/* Contact Selection */}
                <div>
                  <Label className="font-semibold">Vælg kontaktperson fra kartotek</Label>
                  <Select onValueChange={handleContactSelect}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Vælg kontakt eller indtast manuelt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">📝 Indtast manuelt</SelectItem>
                      {getFilteredContacts().map(contact => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} {contact.companyId === selectedCompanyId ? '(fra kunde)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Eller udfyld/rediger felterne nedenfor manuelt</p>
                </div>

                {/* Editable Contact Fields */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-800 mb-3">📧 Kontaktinfo (altid redigerbar)</p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Kontakt Navn *</Label>
                      <Input 
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Indtast kontaktpersonens navn"
                      />
                    </div>
                    <div>
                      <Label>Kontakt Email</Label>
                      <Input 
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="kontakt@firma.dk"
                      />
                    </div>
                    <div>
                      <Label>Kontakt Telefon (SMS)</Label>
                      <Input 
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+45 12 34 56 78"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3">
                    ⚠️ Besigtigelseslink sendes til både email og SMS ved oprettelse
                  </p>
                </div>

                {/* Address Fields */}
                <div className="pt-4 border-t">
                  <Label className="font-semibold">Adresse (fra opgave)</Label>
                  <div className="space-y-3 mt-2">
                    <div>
                      <Label className="text-sm">Adresse</Label>
                      <Input 
                        value={addressInfo.address}
                        onChange={(e) => setAddressInfo(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Postnummer</Label>
                        <Input 
                          value={addressInfo.postalCode}
                          onChange={(e) => setAddressInfo(prev => ({ ...prev, postalCode: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">By</Label>
                        <Input 
                          value={addressInfo.city}
                          onChange={(e) => setAddressInfo(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Damages */}
        {step === 3 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Skader</h2>
              <p className="text-sm text-gray-500 mb-4">
                Dokumenter de nye skader der er fundet
              </p>
              
              <div className="space-y-6">
                {damages.map((damage, index) => (
                  <div key={damage.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Skade {index + 1}</h3>
                      {damages.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeDamage(damage.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Fjern
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Building Part */}
                      <div>
                        <Label>Bygningsdel *</Label>
                        <Select 
                          value={damage.buildingPart} 
                          onValueChange={(v) => updateDamage(damage.id, 'buildingPart', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Vælg bygningsdel" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUILDING_PARTS.map(part => (
                              <SelectItem key={part.value} value={part.value}>
                                {part.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Location */}
                      <div>
                        <Label>Placering *</Label>
                        <Input 
                          placeholder="F.eks. Nordvendt gavl, Stue vindue, Indgangsparti"
                          value={damage.location}
                          onChange={(e) => updateDamage(damage.id, 'location', e.target.value)}
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <Label>Beskrivelse</Label>
                        <Textarea 
                          placeholder="Detaljeret beskrivelse af skaden"
                          value={damage.description}
                          onChange={(e) => updateDamage(damage.id, 'description', e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Photos */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Closeup Photo */}
                        <div>
                          <Label>Nærfoto *</Label>
                          <div className="mt-1">
                            {damage.closeupPhoto ? (
                              <div className="relative">
                                <img 
                                  src={damage.closeupPhoto} 
                                  alt="Nærfoto" 
                                  className="w-full h-40 object-cover rounded-lg border"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => removeImage(damage.id, 'closeupPhoto')}
                                >
                                  Slet
                                </Button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-500">Klik for at vælge</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(damage.id, 'closeupPhoto', e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Location Photo */}
                        <div>
                          <Label>Lokationsfoto *</Label>
                          <div className="mt-1">
                            {damage.locationPhoto ? (
                              <div className="relative">
                                <img 
                                  src={damage.locationPhoto} 
                                  alt="Lokationsfoto" 
                                  className="w-full h-40 object-cover rounded-lg border"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => removeImage(damage.id, 'locationPhoto')}
                                >
                                  Slet
                                </Button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-500">Klik for at vælge</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(damage.id, 'locationPhoto', e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Another Damage Button */}
                <Button
                  variant="outline"
                  className="w-full py-6 border-dashed"
                  onClick={addDamage}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  + Tilføj Endnu En Skade
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbage
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="text-white"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              Næste
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className="text-white"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Opretter...</>
              ) : (
                <>Opret Fotorapport</>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
