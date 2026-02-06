'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { 
  Plus, Trash2, Send, Clock, Lock, Phone, Mail, MapPin, User, ChevronDown, AlertCircle, CheckCircle,
  Loader2, X, RefreshCw, Navigation, Printer, Pencil, UserPlus, UserCheck, History, FileText, ExternalLink, BarChart3
} from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { api, BRAND_BLUE, STATUS_CONFIG, getIdDaysColor } from '@/lib/constants'
import { formatAddress, taskAddressString } from '@/lib/utils'
import { PhoneInput } from '@/components/ui/phone-input'
import WeatherIcon from '@/components/shared/WeatherIcon'
import WeatherStatusWidget from '@/components/weather/WeatherStatusWidget'

// Lazy load sub-sections
const TaskCommunicationSection = dynamic(() => import('./TaskCommunicationSection'), { ssr: false, loading: () => null })
const WeatherReportModal = dynamic(() => import('@/components/weather/WeatherReportModal'), { ssr: false, loading: () => null })
const TaskInvoiceSection = dynamic(() => import('./TaskInvoiceSection'), { ssr: false, loading: () => null })
const TaskLogSection = dynamic(() => import('./TaskLogSection'), { ssr: false, loading: () => null })
const OrderConfirmationSendModal = dynamic(() => import('./OrderConfirmationSendModal'), { ssr: false, loading: () => null })

const TaskDetailDialog = ({ task, open, onClose, options, onUpdate, user }) => {
  const [updating, setUpdating] = useState(false)
  const [statusPopup, setStatusPopup] = useState(null)
  const [showChangeContact, setShowChangeContact] = useState(false)
  const [availableContacts, setAvailableContacts] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [showAddDamage, setShowAddDamage] = useState(false)
  const [activeDamageSectionId, setActiveDamageSectionId] = useState(null)
  const [newDamage, setNewDamage] = useState({ part: '', quantity: 1, color: 'not_specified', location: '', notes: '', sectionId: 'main' })
  const [editingSectionId, setEditingSectionId] = useState(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const [showOrderConfirmationModal, setShowOrderConfirmationModal] = useState(false)
  const [orderConfirmation, setOrderConfirmation] = useState(null)
  const [loadingOrderConfirmation, setLoadingOrderConfirmation] = useState(false)
  const [showResendOrderConfirmation, setShowResendOrderConfirmation] = useState(false)
  const [resendOverrideEmail, setResendOverrideEmail] = useState('')
  const [resendOverridePhone, setResendOverridePhone] = useState('')
  const [resendTestBaseUrl, setResendTestBaseUrl] = useState('')
  const [resendResult, setResendResult] = useState(null)
  const [testDeliveryLoading, setTestDeliveryLoading] = useState(false)
  const [showWeatherReportModal, setShowWeatherReportModal] = useState(false)
  const [geocodeLoading, setGeocodeLoading] = useState(false)
  const [uploadingDamagePhoto, setUploadingDamagePhoto] = useState(null) // { damageId }
  const autoGeocodeAttemptedRef = useRef(null)

  // Opgave har adresse men mangler koordinater (vejr kræver lat/long)
  const hasAddressButNoCoords = task && (task.address || task.postalCode || task.city) && (!task.latitude || !task.longitude)

  // Auto-geokod når opgave åbnes med adresse men uden koordinater (uden manuel handling)
  useEffect(() => {
    if (!open) { autoGeocodeAttemptedRef.current = null; return }
    if (!task?.id || !hasAddressButNoCoords || geocodeLoading) return
    if (autoGeocodeAttemptedRef.current === task.id) return
    autoGeocodeAttemptedRef.current = task.id
    setGeocodeLoading(true)
    api.post(`/tasks/${task.id}/geocode`, {})
      .then(() => { onUpdate?.() })
      .catch(() => { /* Beholder attempted så vi ikke retry-loop; bruger kan klikke Prøv igen */ })
      .finally(() => setGeocodeLoading(false))
  }, [open, task?.id, hasAddressButNoCoords, geocodeLoading, onUpdate])

  // Initialize edit data when task changes or editing starts
  useEffect(() => {
    if (task) {
      const sections = task.damageSections?.length
        ? task.damageSections
        : [{ id: 'main', name: 'Skader', includeOnPrint: true }]
      const damages = (task.damages || []).map(d => ({
        ...d,
        sectionId: d.sectionId || 'main'
      }))
      setEditData({
        address: formatAddress(task.address) || (typeof task.address === 'string' ? task.address : '') || '',
        postalCode: task.postalCode || '',
        city: task.city || '',
        caseNumber: task.caseNumber || '',
        isHouseEmpty: task.isHouseEmpty || false,
        owner1Name: task.owner1Name || '',
        owner1Phone: task.owner1Phone || '',
        owner2Name: task.owner2Name || '',
        owner2Phone: task.owner2Phone || '',
        category: task.category || 'service',
        weatherType: task.weatherType || 'sun',
        estimatedTime: task.estimatedTime || 2,
        deadline: task.deadline || '',
        deadlineLocked: task.deadlineLocked || false,
        types: Array.isArray(task.types) ? [...task.types] : (task.taskType ? [task.taskType] : []),
        taskSummary: task.taskSummary || '',
        notes: task.notes || '',
        damageSections: sections,
        damages
      })
    }
  }, [task, isEditing])

  // Load order confirmation when task has one
  useEffect(() => {
    if (!task?.id || !open) return
    if (task.orderConfirmationId || task.orderConfirmationStatus) {
      setLoadingOrderConfirmation(true)
      api.get(`/order-confirmation/task/${task.id}`)
        .then((data) => { setOrderConfirmation(data) })
        .catch(() => { setOrderConfirmation(null) })
        .finally(() => setLoadingOrderConfirmation(false))
    } else {
      setOrderConfirmation(null)
    }
  }, [task?.id, task?.orderConfirmationId, task?.orderConfirmationStatus, open])
  
  const handleOrderConfirmationSent = () => {
    onUpdate?.()
    setOrderConfirmation(null)
    api.get(`/order-confirmation/task/${task.id}`).then(setOrderConfirmation).catch(() => {})
  }

  const handleActivateOrderConfirmation = async () => {
    setUpdating(true)
    try {
      await api.post('/order-confirmation/activate', { taskId: task.id })
      setStatusPopup('Opgave aktiveret og flyttet til Aktive')
      setTimeout(() => setStatusPopup(null), 3000)
      onUpdate()
      api.get(`/order-confirmation/task/${task.id}`).then(setOrderConfirmation).catch(() => {})
    } catch (err) {
      console.error(err)
      alert(err.message || 'Kunne ikke aktivere opgaven')
    } finally {
      setUpdating(false)
    }
  }

  const openResendOrderConfirmation = () => {
    setResendOverrideEmail('')
    setResendOverridePhone('')
    setResendResult(null)
    setShowResendOrderConfirmation(true)
  }

  const handleResendOrderConfirmation = async () => {
    setUpdating(true)
    setResendResult(null)
    try {
      const body = { taskId: task.id }
      if (resendOverrideEmail?.trim()) body.overrideEmail = resendOverrideEmail.trim()
      if (resendOverridePhone?.trim()) body.overridePhone = resendOverridePhone.trim()
      if (resendTestBaseUrl?.trim()) body.baseUrl = resendTestBaseUrl.trim()
      const data = await api.post('/order-confirmation/resend', body)
      setResendResult(data)
      setStatusPopup('Ordrebekræftelse genfremsendt')
      setTimeout(() => setStatusPopup(null), 3000)
      onUpdate?.()
      api.get(`/order-confirmation/task/${task.id}`).then(setOrderConfirmation).catch(() => {})
    } catch (err) {
      console.error(err)
      alert(err.message || 'Kunne ikke genfremsende')
    } finally {
      setUpdating(false)
    }
  }

  const closeResendOrderConfirmation = () => {
    setShowResendOrderConfirmation(false)
    setResendResult(null)
    setResendOverrideEmail('')
    setResendOverridePhone('')
    setResendTestBaseUrl('')
  }

  const handleTestDelivery = async () => {
    if (!resendOverrideEmail?.trim()) {
      alert('Udfyld email (fx lg@smartrep.nu) så vi ved hvor test-mailen skal sendes hen.')
      return
    }
    setTestDeliveryLoading(true)
    setResendResult(null)
    try {
      const body = { taskId: task.id, email: resendOverrideEmail.trim() }
      if (resendOverridePhone?.trim()) body.phone = resendOverridePhone.trim()
      if (resendTestBaseUrl?.trim()) body.baseUrl = resendTestBaseUrl.trim()
      const data = await api.post('/order-confirmation/test-delivery', body)
      setResendResult({
        confirmUrl: data.confirmUrl,
        emailResult: data.emailResult,
        smsResult: data.smsResult,
        recipientEmail: data.sentTo?.email ?? null,
        recipientPhone: data.sentTo?.phone ?? null,
        _test: true,
        portalPublicUrl: data.portalPublicUrl,
        message: data.message
      })
    } catch (err) {
      setResendResult({ _error: err.message || 'Test fejlede' })
    } finally {
      setTestDeliveryLoading(false)
    }
  }

  if (!task) return null

  const handleStatusChange = async (newStatus) => {
    setUpdating(true)
    try { 
      await api.patch(`/tasks/${task.id}/status`, { status: newStatus, fromStatus: task.status })
      setStatusPopup(STATUS_CONFIG[newStatus]?.label || newStatus)
      setTimeout(() => setStatusPopup(null), 3000)
      onUpdate() 
    }
    catch (err) { console.error(err) }
    finally { setUpdating(false) }
  }

  // Save all edits
  const handleSaveEdits = async () => {
    setUpdating(true)
    try {
      await api.put(`/tasks/${task.id}`, editData)
      setStatusPopup('Ændringer gemt')
      setTimeout(() => setStatusPopup(null), 3000)
      setIsEditing(false)
      onUpdate()
    } catch (err) {
      console.error(err)
      alert('Fejl ved gem af ændringer')
    } finally {
      setUpdating(false)
    }
  }

  // Add new damage
  const handleAddDamage = () => {
    if (!newDamage.part || !newDamage.location) return
    const sectionId = activeDamageSectionId || newDamage.sectionId || 'main'
    const damage = { ...newDamage, id: Date.now().toString(), sectionId }
    setEditData(prev => ({ ...prev, damages: [...prev.damages, damage] }))
    setNewDamage({ part: '', quantity: 1, color: 'not_specified', location: '', notes: '', sectionId })
    setShowAddDamage(false)
    setActiveDamageSectionId(null)
  }

  // Remove damage (match id eller _id fra API)
  const handleRemoveDamage = (damageId) => {
    setEditData(prev => ({ ...prev, damages: prev.damages.filter(d => (d.id !== damageId && d._id !== damageId)) }))
  }

  // Stabil id for skade (til reject/remove/photo)
  const getDamageId = (d) => d?.id ?? d?._id ?? null

  // Add damage section
  const handleAddSection = () => {
    const id = `sec-${Date.now()}`
    const newSection = { id, name: 'Ekstra skader', includeOnPrint: true }
    setEditData(prev => ({
      ...prev,
      damageSections: [...(prev.damageSections || []), newSection]
    }))
    setActiveDamageSectionId(id)
    setShowAddDamage(true)
    setNewDamage(prev => ({ ...prev, sectionId: id }))
  }

  // Update section
  const handleUpdateSection = (sectionId, updates) => {
    setEditData(prev => ({
      ...prev,
      damageSections: (prev.damageSections || []).map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      )
    }))
    setEditingSectionId(null)
  }

  // Remove section (only if empty, damages move to main)
  const handleRemoveSection = (sectionId) => {
    if (sectionId === 'main') return
    setEditData(prev => {
      const damages = (prev.damages || []).map(d =>
        d.sectionId === sectionId ? { ...d, sectionId: 'main' } : d
      )
      const damageSections = (prev.damageSections || []).filter(s => s.id !== sectionId)
      return { ...prev, damageSections, damages }
    })
  }

  // Mark damage as rejected by customer (kun i rediger-tilstand)
  const handleRejectDamage = (damageId) => {
    setEditData(prev => ({
      ...prev,
      damages: (prev.damages || []).map(d =>
        (d.id === damageId || d._id === damageId) ? { ...d, rejectedByCustomer: true, rejectedAt: new Date().toISOString() } : d
      )
    }))
  }

  // Fjern afvisning (clear flag; timestamp i opgavens log)
  const handleUnrejectDamage = async (damageId) => {
    setEditData(prev => ({
      ...prev,
      damages: (prev.damages || []).map(d =>
        (d.id === damageId || d._id === damageId) ? { ...d, rejectedByCustomer: false, rejectedAt: null } : d
      )
    }))
    if (task?.id) {
      try {
        await api.post('/logs', { entityType: 'task', entityId: task.id, action: 'damage_unreject', description: 'Afvisning fjernet fra skadelinje', changes: { damageId } })
      } catch (_) {}
    }
  }

  // Foto upload pr. skade (op til 4)
  const uploadDamagePhoto = async (damageId, file) => {
    if (!file?.type?.startsWith('image/')) return
    setUploadingDamagePhoto({ damageId })
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (task?.id) fd.append('taskId', task.id)
      fd.append('damageId', String(damageId))
      fd.append('photoType', 'damage')
      const token = typeof window !== 'undefined' ? localStorage.getItem('smartrep_token') : null
      const res = await fetch('/api/upload', { method: 'POST', body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await res.json()
      if (!data?.file?.url) throw new Error(data?.error || 'Ingen URL')
      const url = data.file.url.startsWith('http') ? data.file.url : (typeof window !== 'undefined' ? window.location.origin : '') + data.file.url
      setEditData(prev => ({
        ...prev,
        damages: (prev.damages || []).map(d =>
          (d.id === damageId || d._id === damageId)
            ? { ...d, photos: [...(d.photos || []), url].slice(0, 4) }
            : d
        )
      }))
    } catch (err) {
      console.error(err)
      alert('Upload fejl: ' + (err?.message || 'Kunne ikke uploade'))
    } finally {
      setUploadingDamagePhoto(null)
    }
  }

  const removeDamagePhoto = (damageId, photoIndex) => {
    setEditData(prev => ({
      ...prev,
      damages: (prev.damages || []).map(d =>
        (d.id === damageId || d._id === damageId)
          ? { ...d, photos: (d.photos || []).filter((_, i) => i !== photoIndex) }
          : d
      )
    }))
  }

  // Load contacts for the company when change contact dialog opens
  const loadCompanyContacts = async () => {
    if (!task.companyId) return
    setLoadingContacts(true)
    try {
      const users = await api.get('/users')
      const companyContacts = users.filter(u => u.companyId === task.companyId)
      setAvailableContacts(companyContacts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingContacts(false)
    }
  }

  // Geokod adresse (hent koordinater fra DAWA)
  const handleGeocode = async () => {
    if (!task?.id || geocodeLoading) return
    setGeocodeLoading(true)
    try {
      await api.post(`/tasks/${task.id}/geocode`, {})
      setStatusPopup('Adresse geokodet')
      setTimeout(() => setStatusPopup(null), 3000)
      onUpdate()
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Geokodning fejlede')
    } finally {
      setGeocodeLoading(false)
    }
  }

  // Change contact on task
  const handleChangeContact = async (contactId) => {
    setUpdating(true)
    try {
      await api.put(`/tasks/${task.id}`, { contactId })
      setShowChangeContact(false)
      setStatusPopup('Kontakt opdateret')
      setTimeout(() => setStatusPopup(null), 3000)
      onUpdate()
    } catch (err) {
      console.error(err)
      alert('Fejl ved opdatering af kontakt')
    } finally {
      setUpdating(false)
    }
  }

  // Google Maps embed URL
  const taskAddrStr = taskAddressString(task)
  const mapUrl = taskAddrStr ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${encodeURIComponent([taskAddrStr, task?.postalCode, task?.city, 'Denmark'].filter(Boolean).join(', '))}&zoom=15` : null

  // Display value (from editData if editing, otherwise from task)
  const getValue = (field) => isEditing ? editData[field] : task[field]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span>Opgave #{task.taskNumber}</span>
              <Badge className={`${STATUS_CONFIG[task.status]?.bgLight} ${STATUS_CONFIG[task.status]?.textColor} border-0`}>{STATUS_CONFIG[task.status]?.label}</Badge>
              <span className={`font-bold ${getIdDaysColor(task.idDays)}`}>ID: {task.idDays || 0}</span>
            </DialogTitle>
            {user?.role === 'admin' && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" />Rediger
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Annuller</Button>
                <Button size="sm" onClick={handleSaveEdits} disabled={updating} className="text-white" style={{ backgroundColor: BRAND_BLUE }}>
                  {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Gem ændringer
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        
        {/* Status change popup */}
        {statusPopup && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl z-[100] flex items-center gap-2 animate-in slide-in-from-top">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{statusPopup}</span>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-6">
          {/* Left column - Main info */}
          <div className="col-span-2 space-y-6">
            {/* Status change buttons */}
            {user?.role === 'admin' && !isEditing && (
              <div>
                <Label className="text-gray-500 text-xs mb-2 block">Hurtig statusændring</Label>
                <div className="flex flex-wrap gap-2">
                  {['under_planning','planned','completed','standby','cancelled'].filter(s=>s!==task.status).map(status => (
                    <Button key={status} size="sm" variant="outline" onClick={() => handleStatusChange(status)} disabled={updating} className="text-xs">
                      <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status]?.color} mr-2`} />{STATUS_CONFIG[status]?.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Customer & Contact - Customer is NOT editable */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-gray-500 text-xs">Kunde (ikke redigerbar)</Label>
                <p className="font-semibold text-gray-900">{task.companyName}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-gray-500 text-xs">Kontakt</Label>
                  {user?.role === 'admin' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs"
                      onClick={() => { setShowChangeContact(true); loadCompanyContacts(); }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />Skift
                    </Button>
                  )}
                </div>
                <p className="font-semibold text-gray-900">{task.contactName || '-'}</p>
                {task.contactEmail && (
                  <a href={`mailto:${task.contactEmail}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <Mail className="w-3 h-3" />
                    {task.contactEmail}
                  </a>
                )}
                {task.contactPhone && (
                  <a href={`tel:${task.contactPhone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <Phone className="w-3 h-3" />
                    {task.contactPhone}
                  </a>
                )}
              </div>
            </div>
            
            {/* Address - Editable */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-gray-500 text-xs">Adresse</Label>
              {isEditing ? (
                <div className="space-y-2 mt-2">
                  <Input value={editData.address} onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))} placeholder="Adresse" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={editData.postalCode} onChange={(e) => setEditData(prev => ({ ...prev, postalCode: e.target.value }))} placeholder="Postnr." />
                    <Input value={editData.city} onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))} placeholder="By" />
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-semibold text-gray-900">{taskAddressString(task) || '—'}</p>
                  <p className="text-sm text-gray-500">{task.postalCode} {task.city}</p>
                  {hasAddressButNoCoords && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1"
                      onClick={handleGeocode}
                      disabled={geocodeLoading}
                    >
                      {geocodeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                      Geokod adresse
                    </Button>
                  )}
                </>
              )}
            </div>
            
            {/* Owner info - Bygherre - Editable */}
            {(isEditing || task.owner1Name || task.owner2Name) && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-gray-700 text-xs font-medium mb-3 block">Bygherre information</Label>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Bygherre 1 navn</Label>
                        <Input value={editData.owner1Name} onChange={(e) => setEditData(prev => ({ ...prev, owner1Name: e.target.value }))} placeholder="Navn" />
                      </div>
                      <div>
                        <Label className="text-xs">Bygherre 1 mobil</Label>
                        <PhoneInput value={editData.owner1Phone} onChange={(e) => setEditData(prev => ({ ...prev, owner1Phone: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Bygherre 2 navn</Label>
                        <Input value={editData.owner2Name} onChange={(e) => setEditData(prev => ({ ...prev, owner2Name: e.target.value }))} placeholder="Navn" />
                      </div>
                      <div>
                        <Label className="text-xs">Bygherre 2 mobil</Label>
                        <PhoneInput value={editData.owner2Phone} onChange={(e) => setEditData(prev => ({ ...prev, owner2Phone: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {task.owner1Name && (
                      <div>
                        <p className="font-medium">{task.owner1Name}</p>
                        {task.owner1Phone && (
                          <a href={`tel:${task.owner1Phone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                            <Phone className="w-3 h-3" />{task.owner1Phone}
                          </a>
                        )}
                      </div>
                    )}
                    {task.owner2Name && (
                      <div>
                        <p className="font-medium">{task.owner2Name}</p>
                        {task.owner2Phone && (
                          <a href={`tel:${task.owner2Phone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                            <Phone className="w-3 h-3" />{task.owner2Phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Task details grid - Editable */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <Label className="text-gray-500 text-xs">ID Dage</Label>
                <p className={`font-bold text-2xl ${getIdDaysColor(task.idDays)}`}>{task.idDays || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <Label className="text-gray-500 text-xs">Kategori</Label>
                {isEditing ? (
                  <Select value={editData.category} onValueChange={(v) => setEditData(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="foraflevering">Foraflevering</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="oevrig">Øvrig</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium capitalize">{task.category || '-'}</p>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <Label className="text-gray-500 text-xs">Est. tid</Label>
                {isEditing ? (
                  <Select value={editData.estimatedTime?.toString()} onValueChange={(v) => setEditData(prev => ({ ...prev, estimatedTime: parseInt(v) }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8].map(n => <SelectItem key={n} value={n.toString()}>{n} timer</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{task.estimatedTime || 2} timer</p>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <Label className="text-gray-500 text-xs">Vejr</Label>
                {isEditing ? (
                  <Select value={editData.weatherType} onValueChange={(v) => setEditData(prev => ({ ...prev, weatherType: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sun">Tørvejr</SelectItem>
                      <SelectItem value="rain">Regnvejr OK</SelectItem>
                      <SelectItem value="both">Blandet</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <WeatherIcon type={task.weatherType} className="w-6 h-6" />
                  </div>
                )}
              </div>
            </div>

            {/* Vejrstatus-widget (DMI-baseret) */}
            {!isEditing && task && (
              <div className="col-span-full">
                <WeatherStatusWidget task={task} onGeocode={hasAddressButNoCoords ? handleGeocode : undefined} geocodeLoading={geocodeLoading} />
              </div>
            )}
            
            {/* Damages - Editable med skade-sektioner */}
            <div>
              <Label className="text-gray-500 text-xs mb-2 block">Skader ({(isEditing ? editData.damages : task.damages)?.length || 0})</Label>
              
              {(() => {
                const sections = isEditing ? (editData.damageSections || [{ id: 'main', name: 'Skader', includeOnPrint: true }]) : (task.damageSections?.length ? task.damageSections : [{ id: 'main', name: 'Skader', includeOnPrint: true }])
                const damages = isEditing ? editData.damages : (task.damages || []).map(d => ({ ...d, sectionId: d.sectionId || 'main' }))
                const sectionBgColors = ['bg-gray-100', 'bg-blue-50', 'bg-amber-50', 'bg-green-50', 'bg-slate-100', 'bg-sky-50']
                const sectionBorderColors = ['border-gray-200', 'border-blue-200', 'border-amber-200', 'border-green-200', 'border-slate-200', 'border-sky-200']
                const damageCardBg = ['bg-gray-50', 'bg-blue-50/50', 'bg-amber-50/50', 'bg-green-50/50', 'bg-slate-50', 'bg-sky-50/50']
                return (
                  <div className="space-y-4">
                    {sections.map((section, sectionIdx) => {
                      const sectionDamages = damages.filter(d => (d.sectionId || 'main') === section.id)
                      const isMain = section.id === 'main'
                      const secColor = sectionBgColors[sectionIdx % sectionBgColors.length]
                      const secBorder = sectionBorderColors[sectionIdx % sectionBorderColors.length]
                      const cardBg = damageCardBg[sectionIdx % damageCardBg.length]
                      return (
                        <div key={section.id} className={`border-2 ${secBorder} rounded-lg overflow-hidden`}>
                          {/* Sektions-header */}
                          <div className={`${secColor} px-3 py-2 flex items-center justify-between gap-2 flex-wrap`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {editingSectionId === section.id ? (
                                <>
                                  <Input
                                    className="h-8 w-40"
                                    value={editingSectionName}
                                    onChange={(e) => setEditingSectionName(e.target.value)}
                                    placeholder="Sektionsnavn"
                                  />
                                  <Button size="sm" onClick={() => handleUpdateSection(section.id, { name: editingSectionName.trim() || section.name })}>Gem</Button>
                                  <Button size="sm" variant="outline" onClick={() => { setEditingSectionId(null); setEditingSectionName('') }}>Annuller</Button>
                                </>
                              ) : (
                                <>
                                  <span className="font-medium text-sm">{section.name} ({sectionDamages.length})</span>
                                  {isEditing && !isMain && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingSectionId(section.id); setEditingSectionName(section.name) }}>
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                            {(isEditing || true) && (
                              <div className="flex items-center gap-2">
                                {isEditing && (
                                  <>
                                    <label className="flex items-center gap-1 text-xs">
                                      <Checkbox
                                        checked={section.includeOnPrint !== false}
                                        onCheckedChange={(v) => handleUpdateSection(section.id, { includeOnPrint: !!v })}
                                      />
                                      Inkluder på print
                                    </label>
                                    {!isMain && (
                                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleRemoveSection(section.id)}>
                                        Fjern sektion
                                      </Button>
                                    )}
                                  </>
                                )}
                                <Button variant="outline" size="sm" onClick={() => {
                                  if (!isEditing) setIsEditing(true)
                                  setActiveDamageSectionId(section.id)
                                  setNewDamage(prev => ({ ...prev, sectionId: section.id }))
                                  setShowAddDamage(true)
                                }}>
                                  <Plus className="w-3 h-3 mr-1" />Tilføj skade
                                </Button>
                              </div>
                            )}
                            {!isEditing && (
                              <label className="flex items-center gap-1 text-xs text-gray-500">
                                <Checkbox checked={section.includeOnPrint !== false} disabled />
                                Inkluder på print
                              </label>
                            )}
                          </div>
                          {/* Damages i sektionen */}
                          <div className="p-2 space-y-2">
                            {sectionDamages.map((damage, idx) => (
                              <div key={damage.id || idx} className={`p-3 rounded-lg border ${cardBg} ${secBorder} ${damage.rejectedByCustomer ? 'opacity-80' : ''}`} style={damage.rejectedByCustomer ? { textDecoration: 'line-through', color: '#b91c1c', borderColor: '#b91c1c' } : {}}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    {damage.rejectedByCustomer && damage.rejectedAt && (
                                      <p className="text-xs text-red-600 mb-1">Afvist af kunde {format(new Date(damage.rejectedAt), 'dd/MM/yyyy HH:mm', { locale: da })}</p>
                                    )}
                                    <span className="font-medium">{section.name} #{idx + 1}: {options?.buildingParts?.find(p=>p.value===damage.part)?.label || damage.part || damage.item}</span>
                                    <div className="text-sm text-gray-600 mt-1">
                                      Antal: {damage.quantity || 1}
                                      {damage.color && damage.color !== 'not_specified' && ` • Farve: ${options?.colors?.find(c=>c.value===damage.color)?.label || damage.color}`}
                                      {damage.location && ` • Placering: ${options?.locations?.find(l=>l.value===damage.location)?.label || damage.location}`}
                                    </div>
                                    {damage.notes && <p className="text-sm text-gray-500 mt-1 italic">{damage.notes}</p>}
                                  </div>
                                  {isEditing && (
                                    <div className="flex items-center gap-1">
                                      {damage.rejectedByCustomer ? (
                                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleUnrejectDamage(getDamageId(damage))}>
                                          Fjern afvisning
                                        </Button>
                                      ) : (
                                        <Button variant="ghost" size="sm" className="text-xs text-red-600" onClick={() => handleRejectDamage(getDamageId(damage))}>
                                          Markér afvist af kunde
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="icon" onClick={() => handleRemoveDamage(damage.id || damage._id)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                {/* Foto pr. skade (op til 4) – kun ved redigering */}
                                {isEditing && (
                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                    {(damage.photos || []).map((url, photoIdx) => (
                                      <div key={photoIdx} className="relative">
                                        <img src={url.startsWith('http') ? url : (typeof window !== 'undefined' ? window.location.origin : '') + url} alt="" className="w-16 h-16 object-cover rounded border" />
                                        <Button type="button" variant="ghost" size="icon" className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white hover:bg-red-600" onClick={() => removeDamagePhoto(getDamageId(damage), photoIdx)}>
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    {(damage.photos || []).length < 4 && (
                                      <label className="flex flex-col items-center justify-center w-16 h-16 rounded border border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100">
                                        {uploadingDamagePhoto?.damageId === getDamageId(damage) ? (
                                          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                                        ) : (
                                          <>
                                            <Plus className="w-5 h-5 text-gray-500" />
                                            <span className="text-xs text-gray-500 mt-0.5">Foto</span>
                                          </>
                                        )}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadDamagePhoto(getDamageId(damage), f); e.target.value = '' } }} disabled={!!uploadingDamagePhoto} />
                                      </label>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {sectionDamages.length === 0 && !isEditing && (
                              <p className="text-sm text-gray-500 py-2 px-3">Ingen skader</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <Button variant="outline" size="sm" onClick={() => { if (!isEditing) setIsEditing(true); handleAddSection() }} className="w-full">
                      <Plus className="w-4 h-4 mr-1" />Tilføj skade-sektion
                    </Button>
                  </div>
                )
              })()}
              
              {/* Add Damage Form - ved klik Tilføj skade sættes isEditing=true så formen kan bruge editData */}
              {showAddDamage && isEditing && (
                <div className="p-4 border-2 border-blue-200 rounded-lg space-y-3 bg-blue-50/30 mt-3">
                  <p className="font-medium text-sm">Tilføj ny skade</p>
                  {(editData.damageSections || []).length > 1 && (
                    <div>
                      <Label className="text-xs">Sektion</Label>
                      <Select value={newDamage.sectionId || 'main'} onValueChange={(v) => setNewDamage(prev => ({ ...prev, sectionId: v }))}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(editData.damageSections || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Bygningsdel *</Label>
                      <Select value={newDamage.part} onValueChange={(v) => setNewDamage(prev => ({ ...prev, part: v }))}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Vælg..." /></SelectTrigger>
                        <SelectContent>{options?.buildingParts?.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Antal</Label>
                      <Select value={newDamage.quantity.toString()} onValueChange={(v) => setNewDamage(prev => ({ ...prev, quantity: parseInt(v) }))}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={n.toString()}>{n} stk.</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Farve</Label>
                      <Select value={newDamage.color} onValueChange={(v) => setNewDamage(prev => ({ ...prev, color: v }))}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Vælg..." /></SelectTrigger>
                        <SelectContent>{options?.colors?.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Placering *</Label>
                      <Select value={newDamage.location} onValueChange={(v) => setNewDamage(prev => ({ ...prev, location: v }))}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Vælg..." /></SelectTrigger>
                        <SelectContent>{options?.locations?.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Bemærkninger</Label>
                    <Textarea 
                      className="bg-white" 
                      rows={2}
                      value={newDamage.notes}
                      onChange={(e) => setNewDamage(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Eventuelle bemærkninger..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddDamage} disabled={!newDamage.part || !newDamage.location}>Tilføj</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowAddDamage(false); setActiveDamageSectionId(null) }}>Annuller</Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Opgave opsummering - synlig for kunder */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Label className="text-gray-500 text-xs">Opgave opsummering</Label>
              {isEditing ? (
                <Textarea 
                  className="mt-2 bg-white"
                  rows={2}
                  value={editData.taskSummary}
                  onChange={(e) => setEditData(prev => ({ ...prev, taskSummary: e.target.value }))}
                  placeholder="Kort opsummering (synlig for kunder i kundeportal)"
                />
              ) : (
                <p className="text-sm mt-1 whitespace-pre-wrap">{task.taskSummary || '-'}</p>
              )}
            </div>

            {/* Bemærkninger - kun synlig internt */}
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Label className="text-gray-500 text-xs">Bemærkninger (Kun synlig internt)</Label>
              {isEditing ? (
                <Textarea 
                  className="mt-2 bg-white"
                  rows={3}
                  value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Eventuelle interne bemærkninger..."
                />
              ) : (
                <p className="text-sm mt-1 whitespace-pre-wrap">{task.notes || task.description || '-'}</p>
              )}
            </div>
            
            {/* Images - from legacy images array */}
            {task.images?.length > 0 && (
              <div>
                <Label className="text-gray-500 text-xs mb-2 block">Billeder ({task.images.length})</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(task.images || []).map((img, idx) => (
                    <a key={idx} href={img.url || img} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={img.url || img} 
                        alt={`Billede ${idx + 1}`} 
                        className="w-full h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* Documents - from legacy documents array */}
            {task.documents?.length > 0 && (
              <div>
                <Label className="text-gray-500 text-xs mb-2 block">Dokumenter ({task.documents.length})</Label>
                <div className="space-y-2">
                  {(task.documents || []).map((doc, idx) => (
                    <a 
                      key={idx} 
                      href={doc.url || doc} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <FileImage className="w-5 h-5 text-red-500" />
                      <span className="text-sm">{doc.name || `Dokument ${idx + 1}`}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* Files - New unified files array with images and PDFs */}
            {task.files?.length > 0 && (
              <div>
                <Label className="text-gray-500 text-xs mb-2 block">Vedhæftede filer ({task.files.length})</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(task.files || []).filter(f => f.type === 'image').map((file, idx) => (
                    <a key={file.id || idx} href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img 
                        src={file.url} 
                        alt={file.name} 
                        className="w-full h-28 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                      />
                      <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                    </a>
                  ))}
                </div>
                {(task.files || []).filter(f => f.type === 'document' || f.type === 'pdf').length > 0 && (
                  <div className="space-y-2 mt-3">
                    {(task.files || []).filter(f => f.type === 'document' || f.type === 'pdf').map((file, idx) => (
                      <a 
                        key={file.id || idx} 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <File className="w-5 h-5 text-red-500" />
                        <span className="text-sm truncate">{file.name}</span>
                        <Download className="w-4 h-4 text-gray-400 ml-auto" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right column - Map */}
          <div className="space-y-4">
            <div>
              <Label className="text-gray-500 text-xs mb-2 block">Lokation</Label>
              {mapUrl ? (
                <div className="rounded-lg overflow-hidden border">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="h-[250px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  Ingen adresse
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([taskAddrStr, task?.postalCode, task?.city, 'Denmark'].filter(Boolean).join(', '))}`, '_blank')}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Naviger til adressen
              </Button>
            </div>
            
            {/* Dates */}
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-gray-500 text-xs">Oprettet</Label>
                <p className="font-medium">{task.createdAt ? format(new Date(task.createdAt), 'dd/MM/yyyy HH:mm', { locale: da }) : '-'}</p>
              </div>
              {task.plannedDate && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <Label className="text-gray-500 text-xs">Planlagt dato</Label>
                  <p className="font-medium">{format(new Date(task.plannedDate), 'dd/MM/yyyy HH:mm', { locale: da })}</p>
                </div>
              )}
            </div>
            
            {/* Type – flere tags, ingen begrænsning (checkboxes) */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-gray-500 text-xs">Type (vælg én eller flere)</Label>
              {isEditing ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
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
                    const selected = (editData.types || []).includes(type.value)
                    return (
                      <div key={type.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`edit_type_${type.value}`}
                          checked={selected}
                          onChange={() => {
                            setEditData(prev => {
                              const current = prev.types || []
                              const next = current.includes(type.value)
                                ? current.filter(t => t !== type.value)
                                : [...current, type.value]
                              return { ...prev, types: next }
                            })
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                        <Label htmlFor={`edit_type_${type.value}`} className="cursor-pointer text-sm">{type.label || type.value}</Label>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="font-bold text-lg mt-1" style={{ color: BRAND_BLUE }}>
                  {(task.types && task.types.length) ? task.types.join(', ') : (task.taskType || '-')}
                </p>
              )}
            </div>
            
            {/* Deadline - Always visible */}
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-gray-500 text-xs">Deadline (forventet)</Label>
                {isEditing ? (
                  <Input type="date" className="mt-1" value={editData.deadline || ''} onChange={(e) => setEditData(prev => ({ ...prev, deadline: e.target.value }))} />
                ) : (
                  <p className="font-medium">{task.deadline ? format(new Date(task.deadline), 'dd/MM/yyyy', { locale: da }) : '-'}</p>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-gray-500 text-xs">Deadline låst</Label>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox 
                      id="editDeadlineLocked" 
                      checked={editData.deadlineLocked} 
                      onCheckedChange={(checked) => setEditData(prev => ({ ...prev, deadlineLocked: checked }))} 
                    />
                    <Label htmlFor="editDeadlineLocked" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />Ja, låst
                    </Label>
                  </div>
                ) : (
                  <p className="font-medium flex items-center gap-1">
                    {task.deadlineLocked ? (
                      <><Lock className="w-4 h-4 text-red-500" /><span className="text-red-600">Ja</span></>
                    ) : (
                      <span>Nej</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            
            {/* Case number - Editable */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-gray-500 text-xs">Sagsnr.</Label>
              {isEditing ? (
                <Input 
                  className="mt-1"
                  value={editData.caseNumber || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, caseNumber: e.target.value }))}
                  placeholder="Sagsnummer"
                />
              ) : (
                <p className="font-medium">{task.caseNumber || '-'}</p>
              )}
            </div>
            
            {/* House empty - Editable */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-gray-500 text-xs">Hus tomt?</Label>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox 
                    id="editIsHouseEmpty" 
                    checked={editData.isHouseEmpty} 
                    onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isHouseEmpty: checked }))} 
                  />
                  <Label htmlFor="editIsHouseEmpty">Ja, huset er tomt</Label>
                </div>
              ) : (
                <p className="font-medium">{task.isHouseEmpty ? 'Ja' : 'Nej'}</p>
              )}
            </div>
            
            {/* Arbejdskort Button */}
            <a 
              href={`/arbejdskort/${task.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span className="font-medium">Arbejdskort PDF</span>
            </a>
            {user?.role === 'admin' && (
              <Button
                onClick={() => setShowWeatherReportModal(true)}
                className="w-full justify-center gap-2 text-white"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Opret Vejranalyse</span>
              </Button>
            )}
          </div>
        </div>

        {/* ========== ORDREBEKRÆFTELSE ========== */}
        {user?.role === 'admin' && (
          <div className="border rounded-lg mt-4 p-4 space-y-3 col-span-full">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: BRAND_BLUE }} />
              <span className="font-medium">Ordrebekræftelse</span>
            </div>
            {loadingOrderConfirmation && (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />Henter...
              </div>
            )}
            {!loadingOrderConfirmation && !orderConfirmation && task.status === 'awaiting_confirmation' && (
              <div>
                <p className="text-sm text-gray-600 mb-3">Send ordrebekræftelse til kundekontakten (B2B). Kontakten modtager email og SMS med link til at acceptere eller afvise elementer.</p>
                <Button onClick={() => setShowOrderConfirmationModal(true)} style={{ backgroundColor: BRAND_BLUE }}>
                  <Send className="w-4 h-4 mr-2" />Send ordrebekræftelse
                </Button>
              </div>
            )}
            {!loadingOrderConfirmation && !orderConfirmation && task.status !== 'awaiting_confirmation' && (
              <p className="text-sm text-gray-500">Ingen ordrebekræftelse for denne opgave.</p>
            )}
            {!loadingOrderConfirmation && orderConfirmation && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge className={orderConfirmation.status === 'sent' ? 'bg-amber-100 text-amber-800' : orderConfirmation.status === 'response_received' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                    {orderConfirmation.status === 'sent' && 'Afventer svar'}
                    {orderConfirmation.status === 'response_received' && 'Svar modtaget'}
                    {orderConfirmation.status === 'activated' && 'Aktiveret'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {orderConfirmation.sentAt && <p>Sendt: {format(new Date(orderConfirmation.sentAt), 'dd. MMM yyyy HH:mm', { locale: da })}</p>}
                  {orderConfirmation.respondedAt && <p>Besvaret: {format(new Date(orderConfirmation.respondedAt), 'dd. MMM yyyy HH:mm', { locale: da })}</p>}
                </div>
                {(orderConfirmation.status === 'response_received' || orderConfirmation.status === 'activated') && orderConfirmation.items?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Kundens svar</p>
                    <div className="space-y-2">
                      {orderConfirmation.items.map((item, idx) => (
                        <div key={idx} className={`p-2 rounded border text-sm ${item.accepted === true ? 'bg-green-50 border-green-200' : item.accepted === false ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                          <span className="font-medium">
                            {item.type === 'standard' && 'Ordrebekræftelse (standard)'}
                            {item.type === 'extended_zone' && 'Udvidet serviceområde'}
                            {item.type === 'glass_risk' && 'Glaspolering – særlige vilkår'}
                            {item.type === 'chemical_cleaning' && 'Kemisk afrensning – særlige vilkår'}
                          </span>
                          <span className="ml-2">
                            {item.accepted === true && '✓ Accepteret'}
                            {item.accepted === false && '✗ Afvist'}
                          </span>
                          {item.customNote && <p className="text-xs text-gray-600 mt-1">Note: {item.customNote}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`${typeof window !== 'undefined' ? window.location.origin : ''}/confirm/${orderConfirmation.token}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />Se sendt ordrebekræftelse
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={openResendOrderConfirmation} disabled={updating}>
                    <Send className="w-4 h-4 mr-1" />
                    Genfremsend ordrebekræftelse
                  </Button>
                  {orderConfirmation.status === 'response_received' && (
                    <>
                      <p className="text-xs text-gray-500 mt-1">Kunden har behandlet ordrebekræftelsen. Bekræft her og flyt opgaven til Aktive.</p>
                      <Button size="sm" onClick={handleActivateOrderConfirmation} disabled={updating} style={{ backgroundColor: BRAND_BLUE }}>
                        {updating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Godkend og flyt til Aktive
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== COLLAPSIBLE SECTIONS ========== */}
        
        {/* Kommunikation Section */}
        <TaskCommunicationSection task={task} user={user} />
        
        {/* Faktura Section - Admin only */}
        {user?.role === 'admin' && <TaskInvoiceSection task={task} />}
        
        {/* Log Section */}
        <TaskLogSection task={task} />
        
        {/* Order confirmation send modal */}
        {task && (
          <OrderConfirmationSendModal
            task={task}
            user={user}
            open={showOrderConfirmationModal}
            onClose={() => setShowOrderConfirmationModal(false)}
            onSent={handleOrderConfirmationSent}
          />
        )}
        {/* Vejranalyse modal */}
        {task && (
          <WeatherReportModal
            task={task}
            user={user}
            open={showWeatherReportModal}
            onClose={() => setShowWeatherReportModal(false)}
            onGenerated={() => {}}
          />
        )}

        {/* Genfremsend ordrebekræftelse – med mulighed for anden email/telefon (fx lg@smartrep.nu) */}
        <Dialog open={showResendOrderConfirmation} onOpenChange={(open) => !open && closeResendOrderConfirmation()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Genfremsend ordrebekræftelse</DialogTitle>
              <DialogDescription>
                Nuværende modtager: {task?.contactEmail || '(ingen email)'} / {task?.contactPhone || '(ingen telefon)'}. Du kan sende til anden email/telefon nedenfor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Linket virker kun</strong> hvis portalen kører på det URL. Har I deployet på Vercel? Indsæt jeres Vercel-URL nedenfor under &quot;URL i linket&quot; – så bruges det i test, og hun kan åbne linket.
              </div>
              <div>
                <Label htmlFor="resend-email"><strong>Email (påkrævet for test)</strong> – fx lg@smartrep.nu</Label>
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="lg@smartrep.nu"
                  value={resendOverrideEmail}
                  onChange={(e) => setResendOverrideEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="resend-phone">Telefon (valgfrit)</Label>
                <PhoneInput
                  id="resend-phone"
                  value={resendOverridePhone}
                  onChange={(e) => setResendOverridePhone(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="resend-baseurl">URL i linket (valgfrit – indsæt jeres Vercel-URL så linket kan åbnes)</Label>
                <Input
                  id="resend-baseurl"
                  type="url"
                  placeholder="https://jeres-app.vercel.app"
                  value={resendTestBaseUrl}
                  onChange={(e) => setResendTestBaseUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">F.eks. https://smartrep-portal-xxx.vercel.app (uden / i slutningen)</p>
              </div>
              {resendResult && (
                <div className="rounded-lg border bg-gray-50 p-3 text-sm space-y-2">
                  {resendResult._error && <p className="text-red-600">{resendResult._error}</p>}
                  {resendResult._test && resendResult.message && (
                    <p className="text-amber-800 bg-amber-100 p-2 rounded text-xs">{resendResult.message}</p>
                  )}
                  {resendResult.portalPublicUrl && <p><strong>Brugt link-URL:</strong> {resendResult.portalPublicUrl}</p>}
                  <p><strong>Sendt til:</strong> {resendResult.recipientEmail || '-'} / {resendResult.recipientPhone || '-'}</p>
                  {resendResult.emailResult && (
                    resendResult.emailResult.success
                      ? <p className="text-green-700 font-medium">Email: ✓ Sendt til {resendResult.recipientEmail}</p>
                      : (
                        <div className="rounded border-2 border-red-400 bg-red-50 p-3">
                          <p className="font-bold text-red-800">Email: ✗ Ikke modtaget</p>
                          <p className="text-red-700 text-sm mt-1 break-words">{resendResult.emailResult.error}</p>
                          <p className="text-xs text-red-600 mt-2">SendGrid: Verificer afsender (info@smartrep.nu) under Settings → Sender Authentication. Tjek at SENDGRID_API_KEY er korrekt.</p>
                        </div>
                      )
                  )}
                  {resendResult.smsResult && (
                    resendResult.smsResult.success
                      ? <p className="text-green-700 font-medium">SMS: ✓ Sendt</p>
                      : <p className="text-red-600">SMS: ✗ {resendResult.smsResult.error}</p>
                  )}
                  {resendResult.confirmUrl && (
                    <p className="break-all text-xs">Link i besked: <a href={resendResult.confirmUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{resendResult.confirmUrl}</a></p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeResendOrderConfirmation}>Luk</Button>
              <Button variant="outline" onClick={handleTestDelivery} disabled={updating}>
                {testDeliveryLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Test afsendelse
              </Button>
              <Button onClick={handleResendOrderConfirmation} disabled={updating} style={{ backgroundColor: BRAND_BLUE }}>
                {updating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Genfremsend
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Contact Dialog */}
        <Dialog open={showChangeContact} onOpenChange={setShowChangeContact}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Skift kontakt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Vælg en ny kontakt fra {task.companyName}:</p>
              {loadingContacts ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : availableContacts.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Ingen kontakter fundet for denne virksomhed</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableContacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => handleChangeContact(contact.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        contact.id === task.contactId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                      disabled={updating}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          {contact.position && <p className="text-xs text-gray-500">{contact.position}</p>}
                          {contact.phone && <p className="text-xs text-gray-500">{contact.phone}</p>}
                        </div>
                        {contact.id === task.contactId && (
                          <Badge className="bg-blue-100 text-blue-700">Nuværende</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChangeContact(false)}>Annuller</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Luk</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


export default TaskDetailDialog
