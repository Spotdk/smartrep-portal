'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, Trash2, Plus, ArrowLeft, ArrowRight, Check, Loader2, Lock, Search, FilePlus, Link2 } from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

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

export default function NyFotorapportPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState(null) // null = vælg | 'fresh' | 'existing'
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [companies, setCompanies] = useState([])
  const [contacts, setContacts] = useState([]) // All contacts from API
  const [portalUsers, setPortalUsers] = useState([]) // Admin/tekniker til "Udført af"
  const [performedByUserId, setPerformedByUserId] = useState('') // Valgt bruger (tom = current)
  const [options, setOptions] = useState({ buildingParts: [] })
  const [taskSearchQuery, setTaskSearchQuery] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [caseNumber, setCaseNumber] = useState('')
  const addressInputRef = useRef(null)
  
  useEffect(() => {
    api.get('/auth/me')
      .then((u) => {
        if (u?.role === 'customer') {
          router.replace('/')
          return
        }
        setUser(u)
        setAuthChecked(true)
      })
      .catch(() => router.replace('/'))
  }, [router])
  
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
    if (authChecked) loadData()
  }, [authChecked])

  const loadData = async () => {
    try {
      const [tasksData, companiesData, usersData, optionsData] = await Promise.all([
        api.get('/tasks'),
        api.get('/companies'),
        api.get('/users'),
        api.get('/options')
      ])
      // Filter to show tasks that are planned or under planning
      setTasks(tasksData)
      setCompanies(companiesData || [])
      setContacts(usersData.filter(u => u.role === 'customer') || [])
      setPortalUsers(usersData.filter(u => u.role !== 'customer') || [])
      setOptions(optionsData || { buildingParts: [] })
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
      setAddressInfo({ address: task.address || '', postalCode: task.postalCode || '', city: task.city || '' })
      setSelectedCompanyId(task.companyId || '')
      setSelectedCompanyName(task.companyName || '')
      setIsCompanyLocked(true)
      setContactName(task.contactName || task.owner1Name || '')
      setContactEmail(task.contactEmail || '')
      setContactPhone(task.contactPhone || task.owner1Phone || '')
      setCaseNumber(task.taskNumber || '')
    }
  }

  // DAWA adresse-autocomplete
  const searchAddress = async (query) => {
    if (query.length < 3) { setAddressSuggestions([]); return }
    try {
      const res = await fetch(`https://api.dataforsyningen.dk/autocomplete?q=${encodeURIComponent(query)}&type=adresse&fuzzy=true`)
      const results = await res.json()
      setAddressSuggestions(results.slice(0, 5))
      setShowAddressSuggestions(true)
    } catch (err) { console.error('Address search:', err) }
  }
  const selectAddress = (suggestion) => {
    const data = suggestion.data || suggestion.adresse
    if (data) {
      setAddressInfo({
        address: (data.vejnavn || '') + (data.husnr ? ' ' + data.husnr : ''),
        postalCode: data.postnr || '',
        city: data.postnrnavn || ''
      })
    } else {
      setAddressInfo(prev => ({ ...prev, address: suggestion.tekst || suggestion.forslagstekst || '' }))
    }
    setShowAddressSuggestions(false)
    setAddressSuggestions([])
  }

  const filteredTasks = taskSearchQuery.trim()
    ? tasks.filter(t => {
        const q = taskSearchQuery.toLowerCase()
        const addr = [t.address, t.postalCode, t.city].filter(Boolean).join(' ').toLowerCase()
        const num = String(t.taskNumber || '').toLowerCase()
        return addr.includes(q) || num.includes(q)
      })
    : tasks

  const handleCompanyChange = (companyId) => {
    const c = companies.find(x => x.id === companyId)
    setSelectedCompanyId(companyId)
    setSelectedCompanyName(c?.name || '')
    setContactName('')
    setContactEmail('')
    setContactPhone('')
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

  // Image upload handler – upload via API i stedet for base64 (undgår for stor request)
  const [uploadingPhoto, setUploadingPhoto] = useState(null)
  const handleImageUpload = async (damageId, field, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto({ damageId, field })
    try {
      const token = localStorage.getItem('smartrep_token')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('photoType', 'damage')
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload fejlede')
      const url = data?.file?.url || null
      if (url) {
        setDamages(prev => prev.map(d => 
          d.id === damageId ? { ...d, [field]: url } : d
        ))
      }
    } catch (err) {
      alert('Upload fejl: ' + (err?.message || 'Kunne ikke uploade billede'))
    } finally {
      setUploadingPhoto(null)
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

  const maxStep = mode === 'fresh' ? 2 : 3
  const canProceed = () => {
    if (!mode) return false
    if (mode === 'fresh') {
      if (step === 1) return selectedCompanyId && contactName && addressInfo.address && (contactEmail || contactPhone)
      if (step === 2) return damages.every(d => d.buildingPart && d.location && d.closeupPhoto && d.locationPhoto)
    }
    if (mode === 'existing') {
      if (step === 1) return selectedTaskId !== ''
      if (step === 2) return addressInfo.address && contactName && (contactEmail || contactPhone)
      if (step === 3) return damages.every(d => d.buildingPart && d.location && d.closeupPhoto && d.locationPhoto)
    }
    return false
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Create report as DRAFT first
      const result = await api.post('/photoreports', {
        taskId: mode === 'existing' ? selectedTaskId : null,
        companyId: selectedCompanyId,
        caseNumber: caseNumber || (selectedTask?.taskNumber ?? ''),
        contactName: contactName,
        contactEmail: contactEmail,
        contactPhone: contactPhone,
        address: addressInfo.address,
        postalCode: addressInfo.postalCode,
        city: addressInfo.city,
        performedByUserId: performedByUserId || undefined,
        damages: damages.map(d => ({
          id: d.id.toString(),
          item: options?.buildingParts?.find(p => p.value === d.buildingPart)?.label || d.buildingPart,
          type: options?.buildingParts?.find(p => p.value === d.buildingPart)?.label || d.buildingPart,
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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} />
          <span className="text-sm text-gray-500">Tjekker adgang...</span>
        </div>
      </div>
    )
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
              <p className="text-sm text-gray-500">{mode ? `Trin ${step} af ${maxStep}` : 'Vælg type'} </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            Annuller
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      {mode && (
        <div className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center">
              <div className="flex-1">
                <div className={`h-2 rounded-full ${step >= 1 ? 'bg-green-500' : 'bg-gray-200'}`} style={step === 1 ? { backgroundColor: BRAND_BLUE } : step > 1 ? { backgroundColor: '#22c55e' } : {}} />
                <p className={`text-xs mt-1 text-center ${step === 1 ? 'font-semibold' : 'text-gray-500'}`}>
                  {mode === 'fresh' ? 'Kunde & Kontakt' : mode === 'existing' && step === 1 ? 'Vælg Opgave' : 'Kunde & Kontakt'}
                </p>
              </div>
              <div className="flex-1 mx-1">
                <div className={`h-2 rounded-full ${step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`} style={step === 2 ? { backgroundColor: BRAND_BLUE } : step > 2 ? { backgroundColor: '#22c55e' } : {}} />
                <p className={`text-xs mt-1 text-center ${step === 2 ? 'font-semibold' : 'text-gray-500'}`}>
                  {mode === 'fresh' ? 'Skader' : mode === 'existing' ? (step === 2 ? 'Kunde & Kontakt' : 'Skader') : ''}
                </p>
              </div>
              {mode === 'existing' && (
                <div className="flex-1">
                  <div className={`h-2 rounded-full ${step >= 3 ? 'bg-green-500' : 'bg-gray-200'}`} style={step === 3 ? { backgroundColor: BRAND_BLUE } : {}} />
                  <p className={`text-xs mt-1 text-center ${step === 3 ? 'font-semibold' : 'text-gray-500'}`}>Skader</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4">
        {/* Mode selection */}
        {!mode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => { setMode('fresh'); setStep(1); setSelectedTaskId(''); setSelectedTask(null); setIsCompanyLocked(false); setAddressInfo({ address: '', postalCode: '', city: '' }); setContactName(''); setContactEmail(''); setContactPhone(''); setCaseNumber(''); }}>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <FilePlus className="w-12 h-12 mb-3" style={{ color: BRAND_BLUE }} />
                <h3 className="font-semibold text-lg mb-2">Opret ny rapport</h3>
                <p className="text-sm text-gray-500">Frisk formular – vælg kunde, kontakt og adresse manuelt</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => { setMode('existing'); setStep(1); setSelectedTaskId(''); setSelectedTask(null); setTaskSearchQuery(''); }}>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Link2 className="w-12 h-12 mb-3" style={{ color: BRAND_BLUE }} />
                <h3 className="font-semibold text-lg mb-2">Til eksisterende opgave</h3>
                <p className="text-sm text-gray-500">Søg og vælg en eksisterende opgave</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 1 fresh: Kunde, Kontakt, Adresse, Sagsnr., Oprettet dato/af */}
        {mode === 'fresh' && step === 1 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Kunde & Kontakt</h2>
              <div className="space-y-6">
                <div>
                  <Label>Vælg kunde *</Label>
                  <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                    <SelectTrigger><SelectValue placeholder="Vælg kunde" /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vælg kontakt *</Label>
                  <Select onValueChange={handleContactSelect}>
                    <SelectTrigger><SelectValue placeholder="Vælg kontakt eller indtast manuelt" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Indtast manuelt</SelectItem>
                      {getFilteredContacts().map(contact => (
                        <SelectItem key={contact.id} value={contact.id}>{contact.name} {contact.companyId === selectedCompanyId ? '(fra kunde)' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Kontakt navn *</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Navn" />
                  <Label>Email / Telefon *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" />
                    <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Telefon" />
                  </div>
                </div>
                <div className="relative">
                  <Label>Adresse * (DAWA autocomplete eller manuel)</Label>
                  <Input
                    ref={addressInputRef}
                    value={addressInfo.address}
                    onChange={(e) => { setAddressInfo(prev => ({ ...prev, address: e.target.value })); searchAddress(e.target.value) }}
                    onFocus={() => addressInfo.address.length >= 3 && setShowAddressSuggestions(true)}
                    placeholder="Indtast adresse – fx Slotsgade 155"
                  />
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.map((s, i) => (
                        <button key={i} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => selectAddress(s)}>
                          {s.tekst || s.forslagstekst}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Input value={addressInfo.postalCode} onChange={(e) => setAddressInfo(prev => ({ ...prev, postalCode: e.target.value }))} placeholder="Postnr." />
                    <Input value={addressInfo.city} onChange={(e) => setAddressInfo(prev => ({ ...prev, city: e.target.value }))} placeholder="By" />
                  </div>
                </div>
                <div>
                  <Label>Sagsnr.</Label>
                  <Input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} placeholder="Fx FY-2026-601" />
                </div>
                {user?.role === 'admin' && portalUsers.length > 0 && (
                  <div>
                    <Label>Udført af</Label>
                    <Select value={performedByUserId || user?.id} onValueChange={setPerformedByUserId}>
                      <SelectTrigger><SelectValue placeholder="Vælg bruger" /></SelectTrigger>
                      <SelectContent>
                        {portalUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name} {u.role === 'technician' ? '(Tekniker)' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {user?.role === 'technician' && (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    Udført af: {user?.name || '–'} (automatisk)
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  Oprettet: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: da })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1 existing: Search + task list */}
        {mode === 'existing' && step === 1 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Vælg Opgave</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  placeholder="Søg opgave # eller adresse"
                  className="pl-10"
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTasks.length === 0 && <p className="text-gray-500 text-center py-8">Ingen opgaver fundet</p>}
                {filteredTasks.map((task) => (
                  <div key={task.id} onClick={() => handleTaskSelect(task.id)} className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedTaskId === task.id ? 'border-2 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`} style={selectedTaskId === task.id ? { borderColor: BRAND_BLUE } : {}}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">#{task.taskNumber} – {task.address}</p>
                        <p className="text-sm text-gray-500">{task.postalCode} {task.city} · {task.companyName}</p>
                      </div>
                      {selectedTaskId === task.id && <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: BRAND_BLUE }}><Check className="w-4 h-4" /></div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 existing: Company, Contact & Address */}
        {mode === 'existing' && step === 2 && (
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

                {/* Address Fields - DAWA autocomplete */}
                <div className="pt-4 border-t">
                  <Label className="font-semibold">Adresse</Label>
                  <div className="space-y-3 mt-2 relative">
                    <div>
                      <Label className="text-sm">Adresse (DAWA autocomplete eller manuel)</Label>
                      <Input 
                        value={addressInfo.address}
                        onChange={(e) => { setAddressInfo(prev => ({ ...prev, address: e.target.value })); if (e.target.value.length >= 3) searchAddress(e.target.value); else setShowAddressSuggestions(false); }}
                        onFocus={() => addressInfo.address.length >= 3 && setShowAddressSuggestions(true)}
                        placeholder="Indtast adresse"
                      />
                      {showAddressSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {addressSuggestions.map((s, i) => (
                            <button key={i} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => selectAddress(s)}>{s.tekst || s.forslagstekst}</button>
                          ))}
                        </div>
                      )}
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
                <div className="pt-4">
                  <Label className="text-sm">Sagsnr.</Label>
                  <Input value={caseNumber || selectedTask?.taskNumber || ''} onChange={(e) => setCaseNumber(e.target.value)} placeholder="Fx FY-2026-601" />
                </div>
                {user?.role === 'admin' && portalUsers.length > 0 && (
                  <div>
                    <Label>Udført af</Label>
                    <Select value={performedByUserId || user?.id} onValueChange={setPerformedByUserId}>
                      <SelectTrigger><SelectValue placeholder="Vælg bruger" /></SelectTrigger>
                      <SelectContent>
                        {portalUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name} {u.role === 'technician' ? '(Tekniker)' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {user?.role === 'technician' && (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    Udført af: {user?.name || '–'} (automatisk)
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  Oprettet: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: da })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 fresh / Step 3 existing: Damages */}
        {(mode === 'fresh' && step === 2) || (mode === 'existing' && step === 3) ? (
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
                            {(options?.buildingParts || []).map(part => (
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
                              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-60">
                                {uploadingPhoto?.damageId === damage.id && uploadingPhoto?.field === 'closeupPhoto' ? (
                                  <Loader2 className="w-8 h-8 text-gray-400 mb-2 animate-spin" />
                                ) : (
                                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                )}
                                <span className="text-sm text-gray-500">{uploadingPhoto?.damageId === damage.id && uploadingPhoto?.field === 'closeupPhoto' ? 'Uploader...' : 'Klik for at vælge'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(damage.id, 'closeupPhoto', e)}
                                  disabled={!!uploadingPhoto}
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
                              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-60">
                                {uploadingPhoto?.damageId === damage.id && uploadingPhoto?.field === 'locationPhoto' ? (
                                  <Loader2 className="w-8 h-8 text-gray-400 mb-2 animate-spin" />
                                ) : (
                                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                )}
                                <span className="text-sm text-gray-500">{uploadingPhoto?.damageId === damage.id && uploadingPhoto?.field === 'locationPhoto' ? 'Uploader...' : 'Klik for at vælge'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(damage.id, 'locationPhoto', e)}
                                  disabled={!!uploadingPhoto}
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
        ) : null}

        {/* Navigation Buttons */}
        {mode && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step === 1 ? setMode(null) : setStep(s => s - 1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbage
          </Button>

          {step < maxStep ? (
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
        )}
      </main>
    </div>
  )
}
