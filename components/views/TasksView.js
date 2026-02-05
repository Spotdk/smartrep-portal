'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { 
  Plus, Eye, Clock, Lock, AlertCircle, CheckCircle,
  Loader2, X, Check, ClipboardList, Megaphone, Search, Send, Mail
} from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { api, BRAND_BLUE, STATUS_CONFIG, getIdDaysColor } from '@/lib/constants'
import { taskAddressString } from '@/lib/utils'
import WeatherIcon from '@/components/shared/WeatherIcon'

// Lazy load the heavy dialogs
const TaskDetailDialog = dynamic(() => import('@/components/dialogs/TaskDetailDialog'), {
  ssr: false,
  loading: () => null
})
const CreateTaskDialog = dynamic(() => import('@/components/dialogs/CreateTaskDialog'), {
  ssr: false,
  loading: () => null
})

const TasksView = ({ user, tasksWithMessages }) => {
  const safeTasksWithMessages = Array.isArray(tasksWithMessages) ? tasksWithMessages : []
  const [tasks, setTasks] = useState([])
  const [allTasks, setAllTasks] = useState([]) // For search across all tabs
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  // Default tab: 'all_active' for customers, 'active' for admin
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'active' : 'all_active')
  const [selectedTask, setSelectedTask] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [options, setOptions] = useState(null)
  const [companies, setCompanies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  
  // Bulk selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState([])
  const [bulkActionPopup, setBulkActionPopup] = useState(null)
  
  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    checkbox: true,
    createdAt: true,
    taskNumber: true,
    deadline: true,
    idDays: true,
    companyName: true,
    contactName: true,
    address: true,
    postalCode: true,
    city: true,
    status: true,
    types: true,
    weather: true,
    estimatedTime: true
  })
  const [showColumnSettings, setShowColumnSettings] = useState(false)

  // Check if task has customer messages
  const taskHasCustomerMessage = (taskId) => {
    return safeTasksWithMessages.includes(taskId)
  }

  // Toggle task selection
  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    )
  }

  // Select all tasks in current view
  const toggleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([])
    } else {
      setSelectedTaskIds(tasks.map(t => t.id))
    }
  }

  // Bulk move tasks to new status
  const bulkMoveToStatus = async (newStatus) => {
    if (selectedTaskIds.length === 0) return
    
    try {
      await Promise.all(selectedTaskIds.map(taskId => 
        api.patch(`/tasks/${taskId}/status`, { status: newStatus })
      ))
      
      // Log to global log
      await api.post('/activity_logs/global', {
        action: 'bulk_status_change',
        details: {
          taskIds: selectedTaskIds,
          newStatus,
          count: selectedTaskIds.length
        }
      })
      
      setBulkActionPopup(`${selectedTaskIds.length} opgaver flyttet til ${STATUS_CONFIG[newStatus]?.label}`)
      setTimeout(() => setBulkActionPopup(null), 4000)
      
      setSelectedTaskIds([])
      // Reload data
      api.get(`/tasks?tab=${activeTab}`).then(setTasks)
      api.get('/tasks/counts').then(setCounts)
    } catch (err) {
      alert('Fejl ved flytning af opgaver: ' + err.message)
    }
  }

  // Column definitions
  const columnDefs = [
    { key: 'checkbox', label: '☐', sortable: false },
    { key: 'createdAt', label: 'Oprettet', sortable: true },
    { key: 'taskNumber', label: '#', sortable: true },
    { key: 'deadline', label: 'Deadline', sortable: true },
    { key: 'idDays', label: 'ID', sortable: true },
    { key: 'companyName', label: 'Kunde', sortable: true },
    { key: 'contactName', label: 'Kontakt', sortable: true },
    { key: 'address', label: 'Adresse', sortable: true },
    { key: 'postalCode', label: 'Postnr.', sortable: true },
    { key: 'city', label: 'By', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'types', label: 'Type', sortable: false },
    { key: 'weather', label: 'Vejr', sortable: false },
    { key: 'estimatedTime', label: 'ET', sortable: true }
  ]

  // Sort function
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
  }

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    let aVal = a[sortBy]
    let bVal = b[sortBy]
    
    // Handle dates
    if (sortBy === 'createdAt' || sortBy === 'deadline') {
      aVal = aVal ? new Date(aVal).getTime() : 0
      bVal = bVal ? new Date(bVal).getTime() : 0
    }
    
    // Handle numbers
    if (sortBy === 'idDays' || sortBy === 'taskNumber' || sortBy === 'estimatedTime' || sortBy === 'postalCode') {
      aVal = parseInt(aVal) || 0
      bVal = parseInt(bVal) || 0
    }
    
    // Handle strings
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // Toggle column visibility
  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Fuzzy search function - handles typos and partial matches
  const fuzzyMatch = (text, search) => {
    if (!text || !search) return false
    const textLower = text.toString().toLowerCase()
    const searchLower = search.toLowerCase()
    
    // Direct substring match
    if (textLower.includes(searchLower)) return true
    
    // Character substitution map (common typos/alternatives)
    const subs = { 'v': 'w', 'w': 'v', 'c': 'k', 'k': 'c', 'i': 'y', 'y': 'i', 'æ': 'ae', 'ø': 'oe', 'å': 'aa', 'ae': 'æ', 'oe': 'ø', 'aa': 'å' }
    
    // Try with substitutions
    let searchVariant = searchLower
    for (const [from, to] of Object.entries(subs)) {
      searchVariant = searchVariant.replace(new RegExp(from, 'g'), to)
    }
    if (textLower.includes(searchVariant)) return true
    
    // Sequence matching (characters appear in order, allowing gaps)
    let searchIdx = 0
    for (let i = 0; i < textLower.length && searchIdx < searchLower.length; i++) {
      if (textLower[i] === searchLower[searchIdx]) {
        searchIdx++
      }
    }
    if (searchIdx === searchLower.length && searchLower.length >= 3) return true
    
    // Levenshtein distance for short searches (allowing 1-2 typos)
    if (searchLower.length >= 3) {
      const words = textLower.split(/[\s,.-]+/)
      for (const word of words) {
        if (word.length >= searchLower.length - 2) {
          const distance = levenshtein(word.substring(0, searchLower.length + 2), searchLower)
          if (distance <= Math.floor(searchLower.length / 3) + 1) return true
        }
      }
    }
    
    return false
  }
  
  // Simple Levenshtein distance
  const levenshtein = (a, b) => {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length
    const matrix = []
    for (let i = 0; i <= b.length; i++) matrix[i] = [i]
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i-1] === a[j-1] 
          ? matrix[i-1][j-1] 
          : Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1)
      }
    }
    return matrix[b.length][a.length]
  }
  
  // Search function
  const searchTasks = (term) => {
    if (!term || term.length < 2) return allTasks.filter(t => filterByTab(t, activeTab))
    
    return allTasks.filter(task => {
      // Search in task number
      if (task.taskNumber?.toString().includes(term)) return true
      // Search in address
      if (fuzzyMatch(task.address, term)) return true
      // Search in postal code
      if (fuzzyMatch(task.postalCode, term)) return true
      // Search in city
      if (fuzzyMatch(task.city, term)) return true
      // Search in company name
      if (fuzzyMatch(task.companyName, term)) return true
      // Search in contact name
      if (fuzzyMatch(task.contactName, term)) return true
      return false
    })
  }
  
  // Filter by tab
  const filterByTab = (task, tab) => {
    const statusMap = {
      'new': ['awaiting_confirmation'],
      'active': ['under_planning'],
      'all_active': ['awaiting_confirmation', 'under_planning', 'planned'], // For customers - all active states
      'planned': ['planned'],
      'cancelled': ['cancelled'],
      'standby': ['standby'],
      'completed': ['completed'],
      'archived': ['archived']
    }
    return statusMap[tab]?.includes(task.status) || false
  }

  useEffect(() => {
    api.get('/options').then(setOptions).catch(console.error)
    api.get('/tasks/counts').then(setCounts).catch(console.error)
    if (user?.role === 'admin') api.get('/companies').then(setCompanies).catch(console.error)
    // Load all tasks for search
    api.get('/tasks?all=true').then(setAllTasks).catch(console.error)
  }, [])

  useEffect(() => {
    if (searchTerm.length >= 2) {
      setIsSearching(true)
      setTasks(searchTasks(searchTerm))
      setLoading(false)
    } else {
      setIsSearching(false)
      setLoading(true)
      api.get(`/tasks?tab=${activeTab}`).then(setTasks).catch(console.error).finally(() => setLoading(false))
    }
  }, [activeTab, searchTerm, allTasks])

  const updateTaskStatus = async (taskId, newStatus, oldStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus, fromStatus: oldStatus })
      api.get(`/tasks?tab=${activeTab}`).then(setTasks)
      api.get('/tasks/counts').then(setCounts)
      api.get('/tasks?all=true').then(setAllTasks)
    } catch (err) { console.error(err) }
  }

  const navigateToAddress = (task) => {
    const addr = taskAddressString(task)
    const fullAddr = [addr, task?.postalCode, task?.city, 'Denmark'].filter(Boolean).join(', ')
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
    doc.setFontSize(10)
    doc.text('SMARTREP', pageWidth - 50, 15)
    doc.setTextColor(0, 0, 0)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Kunde:', 15, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(task.companyName || '-', 15, 52)
    doc.setFont('helvetica', 'bold')
    doc.text('Adresse:', 15, 62)
    doc.setFont('helvetica', 'normal')
    doc.text([taskAddressString(task), task?.postalCode, task?.city].filter(Boolean).join(', ') || '-', 15, 69)
    doc.setFont('helvetica', 'bold')
    doc.text('Kontakt:', 110, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(task.contactName || '-', 110, 52)
    doc.text(task.contactPhone || '-', 110, 59)
    doc.line(15, 78, pageWidth - 15, 78)
    
    doc.setFont('helvetica', 'bold')
    doc.text('Bygherre 1:', 15, 88)
    doc.setFont('helvetica', 'normal')
    doc.text(task.owner1Name || '-', 15, 95)
    doc.text(task.owner1Phone || '-', 15, 102)
    doc.setFont('helvetica', 'bold')
    doc.text('Bygherre 2:', 70, 88)
    doc.setFont('helvetica', 'normal')
    doc.text(task.owner2Name || '-', 70, 95)
    doc.text(task.owner2Phone || '-', 70, 102)
    
    if (task.damages?.length > 0) {
      const rows = task.damages.map((d, i) => ['☐', `Skade ${i+1}: ${options?.buildingParts?.find(p=>p.value===d.part)?.label||d.part}`, `Antal: ${d.quantity}`, d.notes||''])
      autoTable(doc, { startY: 115, head: [['Udført', 'Beskrivelse', 'Antal', 'Noter']], body: rows, theme: 'grid', headStyles: { fillColor: [1, 51, 255] } })
    }
    
    doc.addPage()
    doc.setFillColor(1, 51, 255)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.text('Bemærkninger', 15, 14)
    doc.setTextColor(0, 0, 0)
    doc.rect(15, 30, pageWidth - 30, 180)
    if (task.notes) doc.text(task.notes, 20, 40, { maxWidth: pageWidth - 40 })
    doc.setFont('helvetica', 'bold')
    doc.text('Underskrift:', 15, 230)
    doc.setFont('helvetica', 'normal')
    doc.text('Dato: _________________', 15, 240)
    doc.text('Signatur: _________________', 15, 250)
    
    doc.save(`Arbejdskort_${task.taskNumber}.pdf`)
  }

  // Render sort indicator
  const SortIndicator = ({ column }) => {
    if (sortBy !== column) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const tabs = user?.role === 'admin' ? [
    { id: 'new', label: 'Nye', count: counts.new },
    { id: 'active', label: 'Aktive', count: counts.active },
    { id: 'planned', label: 'Planlagt', count: counts.planned },
    { id: 'cancelled', label: 'Aflyst', count: counts.cancelled },
    { id: 'standby', label: 'Standby', count: counts.standby },
    { id: 'completed', label: 'Afsluttede', count: counts.completed },
    { id: 'archived', label: 'Arkiv', count: counts.archived },
  ] : [
    { id: 'all_active', label: 'Aktive', count: (counts.new||0)+(counts.active||0)+(counts.planned||0) },
    { id: 'completed', label: 'Afsluttede', count: counts.completed },
  ]

  return (
    <div className="space-y-6">
      {/* Bulk action popup */}
      {bulkActionPopup && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{bulkActionPopup}</span>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">Opgaver</h2><p className="text-gray-500">Administrer og følg dine opgaver</p></div>
        <div className="flex items-center gap-2">
          {/* Bulk Actions Dropdown - only show when tasks are selected */}
          {user?.role === 'admin' && selectedTaskIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-blue-500 text-blue-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Hurtig handling ({selectedTaskIds.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Flyt til</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => bulkMoveToStatus('awaiting_confirmation')} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  Nye
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkMoveToStatus('under_planning')} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Under planlægning
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkMoveToStatus('planned')} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Planlagt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkMoveToStatus('completed')} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Udført
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkMoveToStatus('standby')} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  Standby
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkMoveToStatus('cancelled')} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Aflyst
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedTaskIds([])} className="text-gray-500">
                  <X className="w-4 h-4 mr-2" />
                  Ryd markering
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Column settings dropdown */}
          <DropdownMenu open={showColumnSettings} onOpenChange={setShowColumnSettings}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />Kolonner
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Vis/skjul kolonner</div>
              <DropdownMenuSeparator />
              {columnDefs.filter(c => c.key !== 'checkbox').map(col => (
                <DropdownMenuItem key={col.key} onClick={() => toggleColumn(col.key)} className="flex items-center justify-between">
                  <span>{col.label}</span>
                  {visibleColumns[col.key] ? <Check className="w-4 h-4 text-green-600" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowCreateDialog(true)} className="text-white" style={{ backgroundColor: BRAND_BLUE }}><Plus className="w-4 h-4 mr-2" />Opret opgave</Button>
        </div>
      </div>
      
      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Søg på opgave#, adresse, postnr., by, kunde... (understøtter stavefejl)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-5 text-base"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Search results info */}
      {isSearching && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="px-3 py-1">
            🔍 Søger på tværs af alle faner
          </Badge>
          <span className="text-gray-500">
            {tasks.length} resultat{tasks.length !== 1 ? 'er' : ''} for "{searchTerm}"
          </span>
        </div>
      )}
      
      <div className="border-b">
        <nav className="flex gap-4 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchTerm('') }} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id && !isSearching ? '' : 'border-transparent text-gray-500 hover:text-gray-700'}`} style={activeTab === tab.id && !isSearching ? { borderBottomColor: BRAND_BLUE, color: BRAND_BLUE } : {}}>
              {tab.label}
              {tab.id === 'new' && (counts.awaitingOrderResponse > 0 || counts.orderResponseReceived > 0) && (
                <span className="flex items-center gap-1" title={counts.awaitingOrderResponse > 0 ? 'Ordrebekræftelse afventer svar' : 'Svar modtaget på ordrebekræftelse'}>
                  {counts.awaitingOrderResponse > 0 ? <Send className="w-4 h-4 text-amber-500" /> : null}
                  {counts.orderResponseReceived > 0 ? <Mail className="w-4 h-4 text-blue-600" /> : null}
                </span>
              )}
              {tab.count > 0 && <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id && !isSearching ? 'text-white' : 'bg-gray-100 text-gray-600'}`} style={activeTab === tab.id && !isSearching ? { backgroundColor: BRAND_BLUE } : {}}>{tab.count}</span>}
            </button>
          ))}
        </nav>
      </div>
      {loading ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div> : tasks.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16"><ClipboardList className="w-12 h-12 text-gray-300 mb-4" /><p className="text-gray-500">Ingen opgaver i denne kategori</p></CardContent></Card>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {visibleColumns.checkbox && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={tasks.length > 0 && selectedTaskIds.length === tasks.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  {visibleColumns.createdAt && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('createdAt')}>
                      Oprettet<SortIndicator column="createdAt" />
                    </th>
                  )}
                  {visibleColumns.taskNumber && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('taskNumber')}>
                      #<SortIndicator column="taskNumber" />
                    </th>
                  )}
                  {visibleColumns.deadline && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('deadline')}>
                      Deadline<SortIndicator column="deadline" />
                    </th>
                  )}
                  {visibleColumns.idDays && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('idDays')}>
                      ID<SortIndicator column="idDays" />
                    </th>
                  )}
                  {visibleColumns.companyName && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('companyName')}>
                      Kunde<SortIndicator column="companyName" />
                    </th>
                  )}
                  {visibleColumns.contactName && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('contactName')}>
                      Kontakt<SortIndicator column="contactName" />
                    </th>
                  )}
                  {visibleColumns.address && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('address')}>
                      Adresse<SortIndicator column="address" />
                    </th>
                  )}
                  {visibleColumns.postalCode && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('postalCode')}>
                      Postnr.<SortIndicator column="postalCode" />
                    </th>
                  )}
                  {visibleColumns.city && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('city')}>
                      By<SortIndicator column="city" />
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('status')}>
                      Status<SortIndicator column="status" />
                    </th>
                  )}
                  {visibleColumns.types && (
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-3 py-3">Type</th>
                  )}
                  {visibleColumns.weather && (
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-3 py-3">Vejr</th>
                  )}
                  {visibleColumns.estimatedTime && (
                    <th className="text-center text-xs font-medium text-gray-500 uppercase px-3 py-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('estimatedTime')}>
                      ET<SortIndicator column="estimatedTime" />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedTasks.map((task) => {
                  const displayTypes = task.types?.length ? task.types : (task.taskType ? [task.taskType] : [])
                  return (
                  <tr key={task.id} className={`hover:bg-gray-50 cursor-pointer ${selectedTaskIds.includes(task.id) ? 'bg-blue-50' : ''}`} onClick={() => setSelectedTask(task)}>
                    {visibleColumns.checkbox && (
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300" 
                            checked={selectedTaskIds.includes(task.id)}
                            onChange={() => toggleTaskSelection(task.id)}
                          />
                          {taskHasCustomerMessage(task.id) && (
                            <span title="Kunde har sendt besked vedr. denne opgave" className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full">
                              <AlertCircle className="w-3 h-3 text-white" />
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.createdAt && (
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {task.createdAt ? format(new Date(task.createdAt), 'dd/MM/yyyy', { locale: da }) : '-'}
                      </td>
                    )}
                    {visibleColumns.taskNumber && (
                      <td className="px-3 py-3 text-sm font-medium text-gray-500">
                        <div className="flex items-center gap-1">
                          #{task.taskNumber}
                          {taskHasCustomerMessage(task.id) && !visibleColumns.checkbox && (
                            <span title="Kunde har sendt besked" className="flex items-center justify-center w-4 h-4 bg-red-500 rounded-full ml-1">
                              <AlertCircle className="w-2.5 h-2.5 text-white" />
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.deadline && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {task.status === 'planned' ? (
                            <Lock className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-sm text-gray-600">
                            {task.deadline ? format(new Date(task.deadline), 'd', { locale: da }) : '-'}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.idDays && (
                      <td className="px-3 py-3">
                        <span className={`text-sm font-bold ${getIdDaysColor(task.idDays)}`}>
                          {task.idDays || 0}
                        </span>
                      </td>
                    )}
                    {visibleColumns.companyName && (
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">
                        {task.companyName}
                      </td>
                    )}
                    {visibleColumns.contactName && (
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {task.contactName || '-'}
                      </td>
                    )}
                    {visibleColumns.address && (
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {taskAddressString(task) || '—'}
                      </td>
                    )}
                    {visibleColumns.postalCode && (
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {task.postalCode}
                      </td>
                    )}
                    {visibleColumns.city && (
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {task.city}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`${STATUS_CONFIG[task.status]?.bgLight} ${STATUS_CONFIG[task.status]?.textColor} border-0`}>
                            {STATUS_CONFIG[task.status]?.label}
                          </Badge>
                          {task.orderConfirmationStatus === 'sent' && (
                            <span title="Ordrebekræftelse afventer svar" className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600">
                              <Send className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {task.orderConfirmationStatus === 'response_received' && (
                            <span title="Svar modtaget på ordrebekræftelse" className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600">
                              <Mail className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {task.bygherreCommPending && (
                            <span title="Afventer bygherre-bekræftelse" className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full">
                              <Megaphone className="w-3 h-3 text-white" />
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.types && (
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {displayTypes.length === 0 ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            displayTypes.map((type, idx) => {
                              let shortCode = type
                              if (type?.toLowerCase?.().includes('pla')) shortCode = 'PLA'
                              else if (type?.toLowerCase?.().includes('gla')) shortCode = 'GLA'
                              else if (type?.toLowerCase?.().includes('alu')) shortCode = 'ALU'
                              else if (type?.toLowerCase?.().includes('bun')) shortCode = 'BUN'
                              else if (type?.toLowerCase?.().includes('træ') || type?.toLowerCase?.().includes('tre')) shortCode = 'TRÆ'
                              else shortCode = (type && type.substring(0, 3).toUpperCase()) || type
                              return (
                                <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5">
                                  {shortCode}
                                </Badge>
                              )
                            })
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.weather && (
                      <td className="px-3 py-3 text-center">
                        <WeatherIcon type={task.weatherType} className="w-5 h-5 mx-auto" />
                      </td>
                    )}
                    {visibleColumns.estimatedTime && (
                      <td className="px-3 py-3 text-center text-sm font-medium text-gray-600">
                        {task.estimatedTime || 2}t
                      </td>
                    )}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <TaskDetailDialog task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} options={options} onUpdate={async () => { 
        const [tasksData, countsData] = await Promise.all([api.get(`/tasks?tab=${activeTab}`), api.get('/tasks/counts')])
        setTasks(tasksData)
        setCounts(countsData)
        // Also refresh the selected task
        if (selectedTask?.id) {
          const updatedTask = tasksData.find(t => t.id === selectedTask.id)
          if (updatedTask) setSelectedTask(updatedTask)
        }
      }} user={user} />
      <CreateTaskDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} options={options} companies={companies} user={user} onCreated={() => { api.get(`/tasks?tab=${activeTab}`).then(setTasks); api.get('/tasks/counts').then(setCounts); setShowCreateDialog(false) }} />
    </div>
  )
}


export default TasksView
