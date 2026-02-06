'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Plus, Navigation, Eye, Printer, Loader2, ClipboardList, X, MapPin, User, Phone, Camera, CheckCircle
} from 'lucide-react'
import { api, BRAND_BLUE, STATUS_CONFIG } from '@/lib/constants'
import { taskAddressString } from '@/lib/utils'
import WeatherIcon from '@/components/shared/WeatherIcon'
import dynamic from 'next/dynamic'

// Lazy load the create dialog
const TechnicianCreateTaskDialog = dynamic(() => import('@/components/dialogs/TechnicianCreateTaskDialog'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div>
})

export default function TechnicianTasksView({ user }) {
  const [tasks, setTasks] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState(null)
  const [companies, setCompanies] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [activeTab, setActiveTab] = useState('planned')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [sortByNearest, setSortByNearest] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(null)
  const [savingTask, setSavingTask] = useState(false)
  const fileInputRef = useRef(null)

  // Status tabs for technician (read-only, no status change)
  const technicianTabs = [
    { key: 'planned', label: 'Planlagt', color: 'bg-green-500' },
    { key: 'under_planning', label: 'Under planlægning', color: 'bg-blue-500' },
    { key: 'completed', label: 'Udført', color: 'bg-emerald-500' },
  ]

  const fetchTasks = async () => {
    try {
      const [tasksData, optionsData, companiesData] = await Promise.all([
        api.get('/tasks'),
        api.get('/options'),
        api.get('/companies')
      ])
      setAllTasks(tasksData)
      setOptions(optionsData)
      setCompanies(companiesData)
      filterTasks(tasksData, activeTab)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks() }, [])

  const filterTasks = (taskList, tab) => {
    const filtered = taskList.filter(t => t.status === tab)
    if (sortByNearest && userLocation) {
      // Sort by distance
      const sorted = [...filtered].sort((a, b) => {
        const distA = calculateDistance(userLocation, a)
        const distB = calculateDistance(userLocation, b)
        return distA - distB
      })
      setTasks(sorted)
    } else {
      setTasks(filtered)
    }
  }

  useEffect(() => {
    filterTasks(allTasks, activeTab)
  }, [activeTab, sortByNearest, userLocation, allTasks])

  // Calculate distance between two points (haversine formula)
  const calculateDistance = (loc, task) => {
    if (!loc || !task.latitude || !task.longitude) return Infinity
    const R = 6371 // Earth's radius in km
    const dLat = (task.latitude - loc.lat) * Math.PI / 180
    const dLon = (task.longitude - loc.lng) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc.lat * Math.PI / 180) * Math.cos(task.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const getDistanceText = (task) => {
    if (!userLocation || !task.latitude || !task.longitude) return null
    const dist = calculateDistance(userLocation, task)
    if (dist === Infinity) return null
    return dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`
  }

  const handlePhotoUpload = async (damageIdx, field, e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedTask) return
    setUploadingPhoto({ damageIdx, field })
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
        const damages = (selectedTask.damages || []).map((d, i) =>
          i === damageIdx ? { ...d, id: d.id || `d-${i}`, [field]: url } : d
        )
        setSavingTask(true)
        await api.put(`/tasks/${selectedTask.id}`, { damages })
        const fresh = await api.get(`/tasks/${selectedTask.id}`)
        setSelectedTask(fresh)
        fetchTasks()
      }
    } catch (err) {
      alert('Upload fejl: ' + (err?.message || 'Kunne ikke uploade'))
    } finally {
      setUploadingPhoto(null)
      setSavingTask(false)
      e.target.value = ''
    }
  }

  const triggerPhotoInput = (damageIdx, field) => {
    if (uploadingPhoto || savingTask) return
    fileInputRef.current?.setAttribute('data-damage-idx', damageIdx)
    fileInputRef.current?.setAttribute('data-field', field)
    fileInputRef.current?.click()
  }

  const onFileInputChange = (e) => {
    const idx = parseInt(fileInputRef.current?.getAttribute('data-damage-idx') ?? '-1', 10)
    const field = fileInputRef.current?.getAttribute('data-field') || 'photoBefore'
    if (idx >= 0 && field) handlePhotoUpload(idx, field, e)
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolokation understøttes ikke af din browser')
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setSortByNearest(true)
        setGettingLocation(false)
      },
      (error) => {
        console.error('Location error:', error)
        alert('Kunne ikke hente din lokation. Tjek dine tilladelser.')
        setGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const navigateToAddress = (task) => {
    const fullAddr = [taskAddressString(task), task?.postalCode, task?.city, 'Denmark'].filter(Boolean).join(', ')
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`, '_blank')
  }

  const generateWorkCardPdf = async (task) => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    doc.setFillColor(1, 51, 255)
    doc.rect(0, 0, pageWidth, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('ARBEJDSKORT', 15, 20)
    doc.setFontSize(12)
    doc.text(`#${task.taskNumber}`, 15, 28)
    doc.setTextColor(0, 0, 0)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Kunde:', 15, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(task.companyName || '-', 15, 52)
    doc.setFont('helvetica', 'bold')
    doc.text('Adresse:', 15, 62)
    doc.setFont('helvetica', 'normal')
    doc.text([taskAddressString(task), task?.postalCode, task?.city].filter(Boolean).join(', ') || '-', 15, 69)
    
    if (task.damages?.length > 0) {
      const rows = task.damages.map((d, i) => ['☐', `Skade ${i+1}: ${options?.buildingParts?.find(p=>p.value===d.part)?.label||d.part}`, `Antal: ${d.quantity}`, ''])
      autoTable(doc, { startY: 85, head: [['Udført', 'Beskrivelse', 'Antal', 'Noter']], body: rows, theme: 'grid', headStyles: { fillColor: [1, 51, 255] } })
    }
    doc.save(`Arbejdskort_${task.taskNumber}.pdf`)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  return (
    <div className="space-y-4">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Opgaver</h2>
        <Button 
          size="sm" 
          className="text-white" 
          style={{ backgroundColor: BRAND_BLUE }}
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Opret opgave
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {technicianTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key 
                ? 'bg-white shadow text-gray-900' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${tab.color}`} />
              <span>{tab.label}</span>
              <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                {allTasks.filter(t => t.status === tab.key).length}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Nearest Me Button */}
      <div className="flex items-center gap-2">
        <Button
          variant={sortByNearest ? "default" : "outline"}
          size="sm"
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          className={sortByNearest ? "text-white" : ""}
          style={sortByNearest ? { backgroundColor: BRAND_BLUE } : {}}
        >
          {gettingLocation ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 mr-2" />
          )}
          Nærmest mig
        </Button>
        {sortByNearest && userLocation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSortByNearest(false); setUserLocation(null) }}
          >
            <X className="w-4 h-4 mr-1" />
            Nulstil
          </Button>
        )}
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Ingen opgaver med status "{technicianTabs.find(t => t.key === activeTab)?.label}"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const distance = getDistanceText(task)
            return (
              <Card key={task.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: STATUS_CONFIG[task.status]?.color?.replace('bg-', '#') || BRAND_BLUE }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">#{task.taskNumber}</span>
                        <Badge className={`${STATUS_CONFIG[task.status]?.bgLight} ${STATUS_CONFIG[task.status]?.textColor}`}>
                          {STATUS_CONFIG[task.status]?.label}
                        </Badge>
                        {distance && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Navigation className="w-3 h-3 mr-1" />
                            {distance}
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">{task.companyName}</p>
                    </div>
                    <WeatherIcon type={task.weatherType} className="w-6 h-6 text-gray-400" />
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">{taskAddressString(task) || '—'}</p>
                        <p className="text-sm text-gray-500">{task.postalCode} {task.city}</p>
                      </div>
                    </div>
                  </div>
                  
                  {(task.owner1Name || task.owner2Name) && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Bygherre:</p>
                      {task.owner1Name && (
                        <div className="flex items-center gap-2 mt-1">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-sm">{task.owner1Name}</span>
                          {task.owner1Phone && (
                            <a href={`tel:${task.owner1Phone}`} className="text-blue-600">
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                      {task.owner2Name && (
                        <div className="flex items-center gap-2 mt-1">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-sm">{task.owner2Name}</span>
                          {task.owner2Phone && (
                            <a href={`tel:${task.owner2Phone}`} className="text-blue-600">
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>{task.damages?.length || 0}</strong> skader • <strong>{task.estimatedTime}</strong> timer
                  </div>
                  
                  {/* Action buttons - NO status change buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <Button 
                      size="lg" 
                      className="h-14 text-white" 
                      style={{ backgroundColor: BRAND_BLUE }} 
                      onClick={() => navigateToAddress(task)}
                    >
                      <Navigation className="w-5 h-5 mr-2" />
                      Naviger til
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="h-14" 
                      onClick={() => setSelectedTask(task)}
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      Detaljer
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="w-full h-14" 
                      onClick={() => generateWorkCardPdf(task)}
                    >
                      <Printer className="w-5 h-5 mr-2" />
                      Download arbejdskort
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>Opgave #{selectedTask.taskNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <Badge className={`${STATUS_CONFIG[selectedTask.status]?.bgLight} ${STATUS_CONFIG[selectedTask.status]?.textColor} mt-1`}>
                    {STATUS_CONFIG[selectedTask.status]?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Kunde</Label>
                  <p className="font-medium">{selectedTask.companyName}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Adresse</Label>
                  <p className="font-medium">{taskAddressString(selectedTask) || '—'}</p>
                  <p className="text-sm text-gray-500">{selectedTask.postalCode} {selectedTask.city}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Kontakt</Label>
                  <p className="font-medium">{selectedTask.contactName || '-'}</p>
                  {selectedTask.contactPhone && (
                    <a href={`tel:${selectedTask.contactPhone}`} className="text-sm flex items-center gap-1 mt-1" style={{ color: BRAND_BLUE }}>
                      <Phone className="w-4 h-4" />
                      {selectedTask.contactPhone}
                    </a>
                  )}
                </div>
                {(selectedTask.owner1Name || selectedTask.owner2Name) && (
                  <div>
                    <Label className="text-xs text-gray-500">Bygherre</Label>
                    {selectedTask.owner1Name && (
                      <div className="flex items-center justify-between mt-1">
                        <span>{selectedTask.owner1Name}</span>
                        {selectedTask.owner1Phone && (
                          <a href={`tel:${selectedTask.owner1Phone}`} style={{ color: BRAND_BLUE }}>
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                    {selectedTask.owner2Name && (
                      <div className="flex items-center justify-between mt-1">
                        <span>{selectedTask.owner2Name}</span>
                        {selectedTask.owner2Phone && (
                          <a href={`tel:${selectedTask.owner2Phone}`} style={{ color: BRAND_BLUE }}>
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Kategori</Label>
                    <p className="font-medium capitalize">{selectedTask.category}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Estimeret tid</Label>
                    <p className="font-medium">{selectedTask.estimatedTime} timer</p>
                  </div>
                </div>
                {selectedTask.damages?.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">Skader ({selectedTask.damages.length}) – FØR/EFTER/AFSTAND</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={onFileInputChange}
                    />
                    <div className="space-y-4 mt-2">
                      {selectedTask.damages.map((d, idx) => {
                        const hasFor = !!d.photoBefore
                        const hasEfter = !!d.photoAfter
                        const hasAfstand = !!d.photoDistance
                        const allFilled = hasFor && hasEfter && hasAfstand
                        const hasForEfter = hasFor && hasEfter
                        return (
                          <div key={d.id || idx} className="p-3 border-2 border-gray-200 rounded-lg space-y-3">
                            <div>
                              <p className="font-medium">Skade #{idx + 1}: {options?.buildingParts?.find(p => p.value === d.part)?.label || d.part}</p>
                              <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                <span>Antal: {d.quantity || 1}</span>
                                {d.location && <span>Placering: {options?.locations?.find(l => l.value === d.location)?.label || d.location}</span>}
                              </div>
                              {d.notes && <p className="text-sm text-gray-600 mt-1">{d.notes}</p>}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {['photoBefore', 'photoAfter', 'photoDistance'].map((field, i) => {
                                const labels = ['FØR', 'EFTER', 'AFSTAND']
                                const url = d[field]
                                const isUploading = uploadingPhoto?.damageIdx === idx && uploadingPhoto?.field === field
                                return (
                                  <div key={field} className="flex flex-col items-center">
                                    <p className="text-xs font-medium text-gray-600 mb-1">{labels[i]}</p>
                                    <button
                                      type="button"
                                      onClick={() => triggerPhotoInput(idx, field)}
                                      disabled={!!uploadingPhoto || savingTask}
                                      className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30 transition-colors disabled:opacity-50"
                                    >
                                      {url ? (
                                        <img src={url} alt={labels[i]} className="w-full h-full object-cover" />
                                      ) : isUploading ? (
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                      ) : (
                                        <div className="text-center p-2">
                                          <Camera className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                                          <span className="text-xs text-gray-500">📷 Klik for foto</span>
                                        </div>
                                      )}
                                    </button>
                                    {!url && <span className="text-xs text-amber-600 mt-0.5">Påkrævet</span>}
                                  </div>
                                )
                              })}
                            </div>
                            {allFilled && (
                              <div className="flex items-center gap-2 text-green-700 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Alle fotos udfyldt
                              </div>
                            )}
                            {hasForEfter && !allFilled && (
                              <p className="text-xs text-gray-500">FØR + EFTER udfyldt – afstandsfoto mangler</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {selectedTask.notes && (
                  <div>
                    <Label className="text-xs text-gray-500">Noter</Label>
                    <p className="text-sm mt-1">{selectedTask.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button 
                  className="w-full text-white" 
                  style={{ backgroundColor: BRAND_BLUE }}
                  onClick={() => { navigateToAddress(selectedTask); setSelectedTask(null) }}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Naviger til adresse
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog for Technician */}
      <TechnicianCreateTaskDialog 
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        options={options}
        companies={companies}
        user={user}
        onCreated={() => { setShowCreateDialog(false); fetchTasks() }}
      />
    </div>
  )
}