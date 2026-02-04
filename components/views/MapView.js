'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MapPin, Loader2, X, Sun, CloudRain, CloudSun, Phone, Navigation
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { api, BRAND_BLUE, STATUS_CONFIG } from '@/lib/constants'

// Dynamic import of Leaflet Map (client-side only - uses window)
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[540px] bg-gray-100 rounded-lg"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0133ff' }} /></div>
})

export default function MapView() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState(null)
  const [hoveredTask, setHoveredTask] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const mapContainerRef = useRef(null)

  useEffect(() => { 
    api.get('/tasks?all=true').then(setTasks).catch(console.error).finally(() => setLoading(false)) 
  }, [])

  // Calculate counts
  const counts = {
    all: tasks.length,
    new: tasks.filter(t => t.status === 'awaiting_confirmation').length,
    planning: tasks.filter(t => t.status === 'under_planning').length,
    planned: tasks.filter(t => t.status === 'planned').length
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    switch(filter) {
      case 'new': return task.status === 'awaiting_confirmation'
      case 'planning': return task.status === 'under_planning'
      case 'planned': return task.status === 'planned'
      default: return true
    }
  })

  // ID-dage color helper
  const getIdDaysColor = (idDays) => {
    if (idDays >= 10) return 'bg-red-500 text-white'
    if (idDays >= 5) return 'bg-yellow-400 text-black'
    return 'bg-green-500 text-white'
  }

  // Category label
  const getCategoryLabel = (category) => {
    switch(category) {
      case 'foraflevering': return 'ALU'
      case 'service': return 'SER'
      case 'oevrig': return 'ØVR'
      default: return 'ALU'
    }
  }

  // Weather icon
  const getWeatherIcon = (weatherType) => {
    switch(weatherType) {
      case 'sun': return <Sun className="w-4 h-4 text-yellow-500" />
      case 'rain': return <CloudRain className="w-4 h-4 text-blue-500" />
      case 'both': return <CloudSun className="w-4 h-4 text-orange-500" />
      default: return <Sun className="w-4 h-4 text-yellow-500" />
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (mapContainerRef.current?.requestFullscreen) {
        mapContainerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  // Filter tabs
  const filterTabs = [
    { id: 'all', label: 'Alle opgaver', count: counts.all },
    { id: 'new', label: 'Nye', count: counts.new },
    { id: 'planning', label: 'Under planlægning', count: counts.planning },
    { id: 'planned', label: 'Planlagte', count: counts.planned }
  ]

  return (
    <div ref={mapContainerRef} className={`${isFullscreen ? 'bg-gray-100 p-4' : ''}`}>
      {/* Header with Status Bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kort</h2>
          <p className="text-gray-500">Opgaveoversigt - {filteredTasks.length} opgaver</p>
        </div>
        <Button 
          variant="outline" 
          onClick={toggleFullscreen}
          className="gap-2"
        >
          {isFullscreen ? (
            <><X className="w-4 h-4" />Luk fuldskærm</>
          ) : (
            <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>Fuldskærm</>
          )}
        </Button>
      </div>

      {/* Filter Status Bar */}
      <div className="flex gap-2 mb-4 p-2 bg-gray-100 rounded-lg flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setFilter(tab.id); setSelectedTask(null) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === tab.id 
                ? 'text-white shadow-md' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border'
            }`}
            style={filter === tab.id ? { backgroundColor: BRAND_BLUE } : {}}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              filter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className={`grid ${isFullscreen ? 'grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'} gap-4`}>
        {/* Task List */}
        <Card className={isFullscreen ? 'col-span-1' : ''}>
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Opgaver ({filteredTasks.length})</span>
              {selectedTask && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className={isFullscreen ? 'h-[calc(100vh-220px)]' : 'h-[500px]'}>
              <div className="p-2 space-y-2">
                {filteredTasks.map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    onMouseEnter={() => setHoveredTask(task)}
                    onMouseLeave={() => setHoveredTask(null)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedTask?.id === task.id 
                        ? 'ring-2 shadow-md' 
                        : 'hover:shadow-sm hover:border-gray-300'
                    }`}
                    style={selectedTask?.id === task.id ? { borderColor: BRAND_BLUE, ringColor: BRAND_BLUE } : {}}
                  >
                    {/* Top Row: ID, Category, Weather */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* ID-dage badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getIdDaysColor(task.idDays || 0)}`}>
                          {task.idDays || 0}
                        </span>
                        {/* Task number */}
                        <span className="font-semibold text-gray-900">#{task.taskNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Category */}
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${BRAND_BLUE}15`, color: BRAND_BLUE }}>
                          {getCategoryLabel(task.category)}
                        </span>
                        {/* Weather */}
                        {getWeatherIcon(task.weatherType)}
                      </div>
                    </div>
                    
                    {/* Address */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: BRAND_BLUE }} />
                      <div>
                        <p className="text-sm font-medium">{task.address}</p>
                        <p className="text-xs text-gray-500">{task.postalCode} {task.city}</p>
                      </div>
                    </div>
                    
                    {/* Company */}
                    <p className="text-xs text-gray-500 mt-1 truncate">{task.companyName}</p>
                    
                    {/* Status Badge */}
                    <div className="mt-2">
                      <Badge className={`${STATUS_CONFIG[task.status]?.bgLight} ${STATUS_CONFIG[task.status]?.textColor} text-xs`}>
                        {STATUS_CONFIG[task.status]?.label}
                      </Badge>
                    </div>
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Ingen opgaver med dette filter</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Leaflet Map */}
        <Card className={isFullscreen ? 'col-span-3' : 'lg:col-span-2'}>
          <CardContent className="p-0 relative overflow-hidden rounded-lg">
            {/* Leaflet Map Component */}
            <LeafletMap 
              tasks={filteredTasks}
              selectedTask={selectedTask}
              onTaskSelect={setSelectedTask}
              height={isFullscreen ? 'calc(100vh - 180px)' : '540px'}
            />
            
            {/* Legend Overlay */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs z-[1000]">
              <p className="font-semibold mb-2">Markørfarver:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span>Nye ({counts.new})</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span>Under planlægning ({counts.planning})</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span>Planlagte ({counts.planned})</div>
              </div>
            </div>
            
            {/* Task Count Badge */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 z-[1000]">
              <p className="text-sm font-bold" style={{ color: BRAND_BLUE }}>{filteredTasks.length} opgaver</p>
              <p className="text-xs text-gray-500">på kortet</p>
            </div>
            
            {/* Selected Task Info Overlay */}
            {selectedTask && (
              <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-xl p-4 border-2 z-[1000]" style={{ borderColor: BRAND_BLUE }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getIdDaysColor(selectedTask.idDays || 0)}`}>
                        {selectedTask.idDays || 0} dage
                      </span>
                      <span className="font-bold text-lg">#{selectedTask.taskNumber}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${BRAND_BLUE}15`, color: BRAND_BLUE }}>
                        {getCategoryLabel(selectedTask.category)}
                      </span>
                      {getWeatherIcon(selectedTask.weatherType)}
                    </div>
                    <p className="font-medium">{selectedTask.address}</p>
                    <p className="text-sm text-gray-500">{selectedTask.postalCode} {selectedTask.city}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedTask.companyName}</p>
                    {(selectedTask.owner1Name || selectedTask.contactName) && (
                      <p className="text-sm mt-1">
                        <span className="text-gray-500">Kontakt:</span> {selectedTask.owner1Name || selectedTask.contactName}
                        {selectedTask.owner1Phone && (
                          <a href={`tel:${selectedTask.owner1Phone}`} className="ml-2 text-blue-600 hover:underline">
                            <Phone className="w-3 h-3 inline mr-1" />{selectedTask.owner1Phone}
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className={`${STATUS_CONFIG[selectedTask.status]?.bgLight} ${STATUS_CONFIG[selectedTask.status]?.textColor}`}>
                      {STATUS_CONFIG[selectedTask.status]?.label}
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedTask.address + ', ' + selectedTask.city + ', Denmark')}`, '_blank')}
                      className="text-white"
                      style={{ backgroundColor: BRAND_BLUE }}
                    >
                      <Navigation className="w-4 h-4 mr-1" />Naviger
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}