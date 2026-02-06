'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, Trash2, MapPin, Loader2, X, Upload, File, Search, UserPlus, Lock
} from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'
import { PhoneInput } from '@/components/ui/phone-input'

const CreateTaskDialog = ({ open, onClose, options, companies, user, onCreated }) => {
  const [formData, setFormData] = useState({ 
    companyId: '', companyName: '', contactId: '', contactName: '', contactPhone: '', contactEmail: '',
    address: '', postalCode: '', city: '', latitude: null, longitude: null, caseNumber: '', isHouseEmpty: false, 
    owner1Name: '', owner1Phone: '', owner2Name: '', owner2Phone: '', 
    category: 'service', weatherType: 'sun', estimatedTime: 2, taskSummary: '', notes: '', damages: [], files: [],
    deadline: '', deadlineLocked: false, types: []
  })
  const [loading, setLoading] = useState(false)
  const [showDamageForm, setShowDamageForm] = useState(false)
  const [currentDamage, setCurrentDamage] = useState({ part: '', quantity: 1, color: 'not_specified', location: '', notes: '', photo: null })
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [companyContacts, setCompanyContacts] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [showNewContactForm, setShowNewContactForm] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' })
  const [creatingContact, setCreatingContact] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const fileInputRef = useRef(null)
  const addressInputRef = useRef(null)

  // Ved kunde: sæt firma når dialogen åbnes, så kontaktliste og upload virker
  useEffect(() => {
    if (open && user?.role === 'customer' && user?.companyId) {
      setFormData(prev => ({ ...prev, companyId: user.companyId, companyName: user.companyName || '' }))
      const loadContacts = async () => {
        try {
          const users = await api.get('/users')
          const contacts = users.filter(u => u.companyId === user.companyId && u.role === 'customer')
          setCompanyContacts(contacts)
        } catch (err) { console.error(err) }
      }
      loadContacts()
    }
  }, [open, user?.role, user?.companyId, user?.companyName])

  // Load contacts when company changes
  const handleCompanyChange = async (companyId) => {
    const company = companies.find(c => c.id === companyId)
    setFormData(prev => ({ 
      ...prev, 
      companyId, 
      companyName: company?.name || '',
      contactId: '',
      contactName: '',
      contactPhone: '',
      contactEmail: ''
    }))
    setCompanyContacts([])
    setShowNewContactForm(false)
    
    if (companyId) {
      setLoadingContacts(true)
      try {
        const users = await api.get('/users')
        const contacts = users.filter(u => u.companyId === companyId && u.role === 'customer')
        setCompanyContacts(contacts)
      } catch (err) {
        console.error('Error loading contacts:', err)
      } finally {
        setLoadingContacts(false)
      }
    }
  }

  // Handle contact selection
  const handleContactChange = (contactId) => {
    if (contactId === 'new') {
      setShowNewContactForm(true)
      setFormData(prev => ({ ...prev, contactId: '', contactName: '', contactPhone: '', contactEmail: '' }))
    } else {
      setShowNewContactForm(false)
      const contact = companyContacts.find(c => c.id === contactId)
      if (contact) {
        setFormData(prev => ({ 
          ...prev, 
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone || '',
          contactEmail: contact.email || ''
        }))
      }
    }
  }

  // Create new contact
  const handleCreateContact = async () => {
    if (!newContact.name || !formData.companyId) return
    
    setCreatingContact(true)
    try {
      const contact = await api.post('/contacts', {
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email,
        companyId: formData.companyId
      })
      
      // Add to list and select
      setCompanyContacts(prev => [...prev, contact])
      setFormData(prev => ({
        ...prev,
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone || '',
        contactEmail: contact.email || ''
      }))
      setShowNewContactForm(false)
      setNewContact({ name: '', phone: '', email: '' })
    } catch (err) {
      alert('Fejl ved oprettelse af kontakt')
    } finally {
      setCreatingContact(false)
    }
  }

  // Google Places Autocomplete
  const searchAddress = async (query) => {
    if (query.length < 3) {
      setAddressSuggestions([])
      return
    }
    
    try {
      // Use Google Places API (if available) or fallback to DAWA (Danish Address API)
      const response = await fetch(`https://api.dataforsyningen.dk/autocomplete?q=${encodeURIComponent(query)}&type=adresse&fuzzy=true`)
      const results = await response.json()
      setAddressSuggestions(results.slice(0, 5))
      setShowSuggestions(true)
    } catch (err) {
      console.error('Address search error:', err)
    }
  }

  const selectAddress = async (suggestion) => {
    const data = suggestion.data || suggestion.adresse
    if (data) {
      // DAWA autocomplete returnerer data.x (lon) og data.y (lat) direkte
      const lon = data.x != null ? Number(data.x) : null
      const lat = data.y != null ? Number(data.y) : null
      setFormData(prev => ({
        ...prev,
        address: (data.vejnavn || '') + (data.husnr ? ' ' + data.husnr : ''),
        postalCode: data.postnr || '',
        city: data.postnrnavn || '',
        latitude: lat,
        longitude: lon
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        address: suggestion.tekst || suggestion.forslagstekst || '',
        latitude: null,
        longitude: null
      }))
    }
    setShowSuggestions(false)
    setAddressSuggestions([])
  }

  const addDamage = () => {
    if (currentDamage.part && currentDamage.location) {
      setFormData(prev => ({ ...prev, damages: [...prev.damages, { ...currentDamage, id: Date.now().toString() }] }))
      setCurrentDamage({ part: '', quantity: 1, color: 'not_specified', location: '', notes: '' })
      setShowDamageForm(false)
    }
  }

  // File upload handler
  const uploadFile = async (file) => {
    const token = localStorage.getItem('smartrep_token')
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    formDataUpload.append('photoType', 'task_attachment')

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formDataUpload
    })

    if (!response.ok) throw new Error('Upload fejlede')
    return response.json()
  }

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    
    setUploadingFiles(true)
    const newFiles = []
    
    for (const file of files) {
      // Allow images and PDFs
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf'
      if (!isValid) {
        alert(`${file.name} er ikke en gyldig fil. Kun billeder og PDF'er er tilladt.`)
        continue
      }
      
      try {
        const result = await uploadFile(file)
        if (result?.file?.id) {
          newFiles.push({
            id: result.file.id,
            name: result.file.originalName || file.name,
            url: result.file.url,
            type: file.type.startsWith('image/') ? 'image' : 'document'
          })
        }
      } catch (err) {
        console.error('Upload fejl:', err)
        const msg = err?.message || (typeof err === 'string' ? err : 'Upload fejlede')
        alert(`Fejl ved upload af ${file.name}: ${msg}`)
      }
    }
    
    if (newFiles.length > 0) {
      setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }))
    }
    setUploadingFiles(false)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (fileId) => {
    setFormData(prev => ({ ...prev, files: prev.files.filter(f => f.id !== fileId) }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    const payload = {
      ...formData,
      damageSections: [{ id: 'main', name: 'Skader', includeOnPrint: true }],
      damages: (formData.damages || []).map(d => ({ ...d, sectionId: d.sectionId || 'main' }))
    }
    try { await api.post('/tasks', payload); onCreated() }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Opret ny opgave</DialogTitle><DialogDescription>Udfyld oplysningerne</DialogDescription></DialogHeader>
        <div className="space-y-4">
          {/* Kunde (Firma) */}
          {user?.role === 'admin' && (
            <div>
              <Label>Kunde (Firma) *</Label>
              <Select value={formData.companyId} onValueChange={handleCompanyChange}>
                <SelectTrigger><SelectValue placeholder="Vælg kunde" /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          
          {/* Kontaktperson dropdown - only show when company is selected */}
          {formData.companyId && (
            <div>
              <Label>Kontaktperson *</Label>
              {loadingContacts ? (
                <div className="flex items-center gap-2 py-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Indlæser kontakter...</span>
                </div>
              ) : (
                <Select value={formData.contactId || ''} onValueChange={handleContactChange}>
                  <SelectTrigger><SelectValue placeholder="Vælg kontaktperson" /></SelectTrigger>
                  <SelectContent>
                    {companyContacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          {c.position && <span className="text-xs text-gray-400">({c.position})</span>}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="new">
                      <div className="flex items-center gap-2 text-blue-600">
                        <UserPlus className="w-4 h-4" />
                        <span>Opret ny kontakt</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {/* Selected contact info */}
              {formData.contactId && formData.contactName && !showNewContactForm && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium">{formData.contactName}</p>
                  {formData.contactPhone && <p className="text-gray-500">{formData.contactPhone}</p>}
                  {formData.contactEmail && <p className="text-gray-500">{formData.contactEmail}</p>}
                </div>
              )}
              
              {/* New contact form */}
              {showNewContactForm && (
                <div className="mt-3 p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/50 space-y-3">
                  <p className="text-sm font-medium text-blue-800">Opret ny kontakt</p>
                  <div>
                    <Label className="text-xs">Navn *</Label>
                    <Input 
                      value={newContact.name} 
                      onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Kontaktpersonens navn"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Mobilnummer</Label>
                      <PhoneInput 
                        value={newContact.phone} 
                        onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">E-mail</Label>
                      <Input 
                        type="email"
                        value={newContact.email} 
                        onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@firma.dk"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleCreateContact} 
                      disabled={!newContact.name || creatingContact}
                      className="text-white"
                      style={{ backgroundColor: BRAND_BLUE }}
                    >
                      {creatingContact ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                      Opret kontakt
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => { setShowNewContactForm(false); setNewContact({ name: '', phone: '', email: '' }) }}
                    >
                      Annuller
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Address with autocomplete */}
          <div className="relative">
            <Label>Adresse *</Label>
            <div className="relative">
              <Input 
                ref={addressInputRef}
                value={formData.address} 
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, address: e.target.value }))
                  searchAddress(e.target.value)
                }}
                onFocus={() => formData.address.length >= 3 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Begynd at skrive adresse..."
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Address suggestions dropdown */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {addressSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectAddress(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{suggestion.tekst || suggestion.forslagstekst}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Manual address fields */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Postnr. *</Label><Input placeholder="0000" value={formData.postalCode} onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))} /></div>
            <div><Label>By *</Label><Input placeholder="By" value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} /></div>
          </div>
          
          <div><Label>Sagsnummer</Label><Input placeholder="Bruges til fakturareference" value={formData.caseNumber} onChange={(e) => setFormData(prev => ({ ...prev, caseNumber: e.target.value }))} /></div>
          <div className="flex items-center gap-2"><Checkbox id="isHouseEmpty" checked={formData.isHouseEmpty} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isHouseEmpty: checked }))} /><Label htmlFor="isHouseEmpty">Huset er tomt</Label></div>
          {!formData.isHouseEmpty && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <Label className="font-medium">Bygherre information</Label>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Bygherre 1 navn</Label><Input value={formData.owner1Name} onChange={(e) => setFormData(prev => ({ ...prev, owner1Name: e.target.value }))} /></div>
                <div><Label className="text-xs">Bygherre 1 mobil</Label><PhoneInput value={formData.owner1Phone} onChange={(e) => setFormData(prev => ({ ...prev, owner1Phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Bygherre 2 navn</Label><Input value={formData.owner2Name} onChange={(e) => setFormData(prev => ({ ...prev, owner2Name: e.target.value }))} /></div>
                <div><Label className="text-xs">Bygherre 2 mobil</Label><PhoneInput value={formData.owner2Phone} onChange={(e) => setFormData(prev => ({ ...prev, owner2Phone: e.target.value }))} /></div>
              </div>
            </div>
          )}
          {/* Deadline Section */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
            <Label className="font-medium">Deadline</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Forventet deadline</Label>
                <Input 
                  type="date" 
                  value={formData.deadline} 
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))} 
                />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="deadlineLocked" 
                    checked={formData.deadlineLocked} 
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, deadlineLocked: checked }))} 
                  />
                  <Label htmlFor="deadlineLocked" className="flex items-center gap-1 cursor-pointer">
                    <Lock className="w-4 h-4 text-gray-500" />
                    Låst deadline
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Task Type Section – skjult for kunde */}
          {user?.role !== 'customer' && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <Label className="font-medium">Type (vælg én eller flere)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(options?.taskTypes || [
                  { value: 'PLA', label: 'PLA (Plast)' },
                  { value: 'BUN', label: 'BUN (Bundstykke)' },
                  { value: 'GLA', label: 'GLA (Glas)' },
                  { value: 'ALU', label: 'ALU (Aluminium)' },
                  { value: 'TRÆ', label: 'TRÆ (Træ)' },
                  { value: 'COA', label: 'COA (Coating)' },
                  { value: 'INS', label: 'INS (Isolering)' },
                  { value: 'REN', label: 'REN (Rengøring)' }
                ]).map(type => {
                  const selected = (formData.types || []).includes(type.value)
                  return (
                    <div key={type.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`type_${type.value}`}
                        checked={selected}
                        onChange={() => {
                          setFormData(prev => {
                            const current = prev.types || []
                            const next = current.includes(type.value)
                              ? current.filter(t => t !== type.value)
                              : [...current, type.value]
                            return { ...prev, types: next }
                          })
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                      <Label htmlFor={`type_${type.value}`} className="cursor-pointer text-sm">{type.label || type.value}</Label>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className={`grid gap-4 ${user?.role === 'customer' ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <div><Label>Kategori</Label><Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="foraflevering">Foraflevering</SelectItem><SelectItem value="service">Service</SelectItem><SelectItem value="oevrig">Øvrig</SelectItem></SelectContent></Select></div>
            <div><Label>Vejr</Label><Select value={formData.weatherType} onValueChange={(v) => setFormData(prev => ({ ...prev, weatherType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sun">Kræver tørvejr</SelectItem><SelectItem value="rain">Regnvejr OK</SelectItem><SelectItem value="both">Blandet</SelectItem></SelectContent></Select></div>
            {user?.role !== 'customer' && (
              <div><Label>Est. tid</Label><Select value={formData.estimatedTime.toString()} onValueChange={(v) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5,6,7,8].map(n => <SelectItem key={n} value={n.toString()}>{n} timer</SelectItem>)}</SelectContent></Select></div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><Label>Skader ({formData.damages.length})</Label><Button variant="outline" size="sm" onClick={() => setShowDamageForm(true)}><Plus className="w-4 h-4 mr-1" />Tilføj skade</Button></div>
            {formData.damages.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.damages.map((d, idx) => (
                  <div key={d.id} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium">Skade #{idx + 1}: {options?.buildingParts?.find(p=>p.value===d.part)?.label}</span>
                        <div className="text-sm text-gray-500 mt-1">
                          Antal: {d.quantity} • Placering: {options?.locations?.find(l=>l.value===d.location)?.label || d.location}
                          {d.color !== 'not_specified' && ` • Farve: ${options?.colors?.find(c=>c.value===d.color)?.label || d.color}`}
                        </div>
                        {d.notes && <p className="text-sm text-gray-600 mt-1 italic">{d.notes}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setFormData(prev => ({ ...prev, damages: prev.damages.filter(x => x.id !== d.id) }))}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showDamageForm && (
              <div className="p-4 border-2 border-blue-200 rounded-lg space-y-4 bg-blue-50/30">
                <p className="font-medium text-sm">Ny skade</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Bygningsdel *</Label><Select value={currentDamage.part} onValueChange={(v) => setCurrentDamage(prev => ({ ...prev, part: v }))}><SelectTrigger className="bg-white"><SelectValue placeholder="Vælg bygningsdel" /></SelectTrigger><SelectContent>{options?.buildingParts?.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs">Antal</Label><Select value={currentDamage.quantity.toString()} onValueChange={(v) => setCurrentDamage(prev => ({ ...prev, quantity: parseInt(v) }))}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={n.toString()}>{n} stk.</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Farve</Label><Select value={currentDamage.color} onValueChange={(v) => setCurrentDamage(prev => ({ ...prev, color: v }))}><SelectTrigger className="bg-white"><SelectValue placeholder="Vælg farve" /></SelectTrigger><SelectContent>{options?.colors?.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs">Placering *</Label><Select value={currentDamage.location} onValueChange={(v) => setCurrentDamage(prev => ({ ...prev, location: v }))}><SelectTrigger className="bg-white"><SelectValue placeholder="Vælg placering" /></SelectTrigger><SelectContent>{options?.locations?.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div>
                  <Label className="text-xs">Eventuelle bemærkninger</Label>
                  <Textarea 
                    placeholder="Tilføj eventuelle bemærkninger til denne skade..." 
                    value={currentDamage.notes} 
                    onChange={(e) => setCurrentDamage(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-white"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={addDamage} disabled={!currentDamage.part || !currentDamage.location} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
                    <Plus className="w-4 h-4 mr-1" />Tilføj skade
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowDamageForm(false); setCurrentDamage({ part: '', quantity: 1, color: 'not_specified', location: '', notes: '', photo: null }) }}>
                    Annuller
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* File Upload Section */}
          <div>
            <Label className="mb-2 block">Filer & Billeder ({formData.files.length})</Label>
            
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileInput}
                className="hidden"
              />
              {uploadingFiles ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-gray-600">Uploader...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Træk filer hertil eller <span className="text-blue-600 underline">klik for at vælge</span></p>
                  <p className="text-xs text-gray-400 mt-1">Billeder (JPG, PNG) og PDF-filer er tilladt</p>
                </>
              )}
            </div>
            
            {/* Uploaded Files Preview */}
            {formData.files.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {formData.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                    {file.type === 'image' ? (
                      <img src={file.url} alt={file.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                        <File className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); removeFile(file.id) }}>
                      <X className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div><Label>Opgave opsummering</Label><Textarea placeholder="Kort opsummering af opgaven (synlig for kunder i kundeportal)" value={formData.taskSummary} onChange={(e) => setFormData(prev => ({ ...prev, taskSummary: e.target.value }))} /></div>
          {user?.role !== 'customer' && (
            <div><Label>Bemærkninger (Kun synlig internt)</Label><Textarea placeholder="Eventuelle interne bemærkninger..." value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} /></div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annuller</Button><Button onClick={handleSubmit} disabled={loading || uploadingFiles} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>{loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Opret opgave</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


export default CreateTaskDialog
