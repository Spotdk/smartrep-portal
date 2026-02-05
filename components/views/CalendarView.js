'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings, RefreshCw } from 'lucide-react'
import { api, BRAND_BLUE, getIdDaysColor } from '@/lib/constants'
import { formatAddress } from '@/lib/utils'
import WeatherIcon from '@/components/shared/WeatherIcon'
import { registerLicense } from '@syncfusion/ej2-base'
import dynamic from 'next/dynamic'
import '@/styles/scheduler-overrides.css'

// Register Syncfusion license
registerLicense('Ngo9BigBOggjHTQxAR8/V1JGaF5cXGpCfEx0Qnxbf1x2ZFNMY1lbRH5PIiBoS35RcEViW3ZfdXBTRmZeVkd3VEFf')

// Dynamic import
const SyncfusionScheduler = dynamic(() => import('@/components/SyncfusionScheduler'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[600px]">Loading...</div>
})

// JobPool component (Syncfusion AI version)
function JobPool({ tasks, onStartDrag, onRemove }) {
  return (
    <aside className="job-pool">
      <div className="job-pool-header">
        <h4>Job Pool <span className="badge">{tasks.length}</span></h4>
        <div className="hint">Træk opgaver til kalenderen →</div>
      </div>
      <div className="job-pool-list">
        {tasks.map(t => (
          <div
            key={t.id}
            className="job-pool-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({ taskId: t.id }))
              e.dataTransfer.effectAllowed = 'move'
              onStartDrag?.(t.id)
            }}
          >
            <div className="job-pool-left">
              <div className="task-number">#{t.taskNumber}</div>
              <div className="task-company">{t.companyName}</div>
              <div className="task-city">{t.postalCode} {t.city}</div>
            </div>
            <div className="job-pool-right">
              <div className="days" style={{ color: getIdDaysColor(t.idDays) }}>{t.idDays} dage</div>
              <div className="weather"><WeatherIcon type={t.weatherType} /></div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default function CalendarView() {
  const [tasks, setTasks] = useState([])
  const [techs, setTechs] = useState([])
  const [resourceData, setResourceData] = useState([])
  const [travelEvents, setTravelEvents] = useState([])
  const [routePopover, setRoutePopover] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [calendarSettings, setCalendarSettings] = useState({
    activeTechnicians: [],
    viewType: 'work_week'
  })

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [tRes, sRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/staff-users')
        ])
        if (!mounted) return
        setTasks(tRes || [])
        
        const techList = (sRes || []).filter(user => 
          user.roles?.includes('technician_admin') || user.roles?.includes('technician_standard')
        )
        setTechs(techList)
        setResourceData(techList.map((u, i) => ({ 
          Id: u.id, 
          Text: u.name, 
          Color: (i===0 ? BRAND_BLUE : (i===1 ? '#10B981' : '#8B5CF6'))
        })))
      } catch (err) {
        console.error(err)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // Basic travel calc: create travel events between consecutive tasks per tech (Syncfusion AI)
  useEffect(() => {
    const computeTravel = () => {
      const events = []
      const tasksByTechDate = {}
      
      tasks
        .filter(t => t.plannedDate && t.assignedTechnicianId)
        .forEach(t => {
          const key = `${t.assignedTechnicianId}::${new Date(t.plannedDate).toDateString()}`
          tasksByTechDate[key] = tasksByTechDate[key] || []
          tasksByTechDate[key].push(t)
        })

      Object.values(tasksByTechDate).forEach(list => {
        list.sort((a,b) => new Date(a.plannedDate) - new Date(b.plannedDate))
        for (let i = 0; i < list.length - 1; i++) {
          const a = list[i]
          const b = list[i+1]
          const aEnd = new Date(a.plannedDate)
          aEnd.setMinutes(0,0,0)
          aEnd.setHours(aEnd.getHours() + 2) // visual 2h block end
          
          // Basic heuristic travel: 30 min + 1 min per 5km (placeholder)
          const travelMin = (a._computedTravelToNextMin || 30)
          const travelKm = Math.round(a._computedTravelKmToNext || 20)
          const start = new Date(aEnd)
          const end = new Date(start.getTime() + travelMin * 60 * 1000)
          
          events.push({
            Id: `travel-${a.id}-${b.id}`,
            Subject: `🚗 ${travelMin} min • ${travelKm} km`,
            StartTime: start,
            EndTime: end,
            IsAllDay: false,
            IsBlock: true,
            IsReadonly: true,
            status: 'TRAVEL',
            cssClass: 'travel-event',
            CategoryColor: '#F5F5DC',
            TechnicianId: a.assignedTechnicianId,
            Duration: travelMin,
            Distance: travelKm,
            TravelData: { 
              from: a.address, 
              to: b.address, 
              fromAddress: a.address + ', ' + a.postalCode + ' ' + a.city,
              toAddress: b.address + ', ' + b.postalCode + ' ' + b.city
            }
          })
        }
      })

      setTravelEvents(events)
    }

    computeTravel()
  }, [tasks])

  // Load calendar settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await api.get('/calendar-settings')
        if (settings && settings.activeTechnicians) {
          setCalendarSettings(settings)
          // Update resourceData based on active technicians
          setResourceData(techs
            .filter(t => settings.activeTechnicians.includes(t.id))
            .map((u, i) => ({ 
              Id: u.id, 
              Text: u.name, 
              Color: (i===0 ? BRAND_BLUE : (i===1 ? '#10B981' : '#8B5CF6'))
            }))
          )
        }
      } catch (err) {
        console.error('Fejl ved indlæsning af indstillinger:', err)
      }
    }
    if (techs.length > 0) {
      loadSettings()
    }
  }, [techs])

  // Save calendar settings
  const saveSettings = async () => {
    try {
      await api.post('/calendar-settings', calendarSettings)
      alert('✅ Kalender indstillinger gemt!')
      setShowSettings(false)
      // Reload to apply settings
      window.location.reload()
    } catch (err) {
      console.error('Fejl ved gemning af indstillinger:', err)
      alert('❌ Fejl ved gemning: ' + err.message)
    }
  }

  const applyDrop = async (taskId, dateObj, technicianId) => {
    try {
      await api.put(`/tasks/${taskId}`, {
        plannedDate: dateObj.toISOString(),
        assignedTechnicianId: technicianId,
        status: 'under_planning'
      })
      setTasks(prev => prev.map(t => t.id === taskId ? { 
        ...t, 
        plannedDate: dateObj.toISOString(), 
        assignedTechnicianId: technicianId, 
        status: 'under_planning' 
      } : t))
    } catch (err) {
      console.error(err)
    }
  }

  const onTaskUpdate = useCallback(async (taskId, newDate) => {
    try {
      await api.put(`/tasks/${taskId}`, { 
        plannedDate: newDate.toISOString(), 
        status: 'under_planning' 
      })
      setTasks(prev => prev.map(t => t.id === taskId ? { 
        ...t, 
        plannedDate: newDate.toISOString(), 
        status: 'under_planning' 
      } : t))
    } catch (err) { console.error(err) }
  }, [])

  const onStatusChange = useCallback(async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (err) { console.error(err) }
  }, [])

  const onTaskRemove = useCallback(async (taskId) => {
    try {
      await api.put(`/tasks/${taskId}`, { 
        plannedDate: null, 
        assignedTechnicianId: null, 
        status: 'under_planning' 
      })
      setTasks(prev => prev.map(t => t.id === taskId ? { 
        ...t, 
        plannedDate: null, 
        assignedTechnicianId: null, 
        status: 'under_planning' 
      } : t))
    } catch (err) { console.error(err) }
  }, [])

  // External drop handler (Syncfusion AI version)
  const handleDropOnCalendar = async (e) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('application/json')
    if (!data) return
    
    const { taskId } = JSON.parse(data)
    const content = document.querySelector('.syncfusion-scheduler-wrapper .e-content-wrap')
    const rect = content?.getBoundingClientRect()
    
    let dropDate = new Date()
    let techId = techs[0]?.id || null
    
    if (rect) {
      const y = e.clientY - rect.top
      const hourHeight = rect.height / 10
      let hourIndex = Math.floor(y / hourHeight)
      hourIndex = Math.max(0, Math.min(9, hourIndex))
      const hour = 7 + hourIndex
      dropDate.setHours(hour, 0, 0, 0)
      
      // try detect technician column
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const res = el?.closest('[data-resource-id]') || el?.closest('[data-resource-index]')
      if (res) {
        const rid = res.getAttribute('data-resource-id') || res.getAttribute('data-resource-index')
        if (rid) techId = rid
      }
    } else {
      dropDate.setHours(9, 0, 0, 0)
    }
    
    await applyDrop(taskId, dropDate, techId)
  }

  const poolTasks = tasks.filter(t => !t.plannedDate)
  const plannedTasks = tasks.filter(t => t.plannedDate)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Planlægning</h2>
          <p className="text-gray-500">Træk opgaver til kalenderen • 🔓 = Kladde (lyseblå) • 🔒 = Låst (lysegrøn)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />Indstillinger
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />Opdater
          </Button>
        </div>
      </div>

      <div className="planner-page">
        <div className="left-col">
          <JobPool tasks={poolTasks} onStartDrag={() => {}} onRemove={onTaskRemove} />
        </div>

        <div className="main-col" onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnCalendar}>
          <SyncfusionScheduler
            localTasks={plannedTasks}
            travelEvents={travelEvents}
            resourceData={resourceData}
            onTaskUpdate={onTaskUpdate}
            onTaskRemove={onTaskRemove}
            onTaskDrop={applyDrop}
            onStatusChange={onStatusChange}
            height="720px"
          />
        </div>
      </div>

      {/* Route Popover */}
      {routePopover && (
        <div className="route-popover-overlay" onClick={() => setRoutePopover(null)}>
          <div className="route-popover-card" onClick={(e) => e.stopPropagation()}>
            <div className="route-header">
              <h3>{routePopover.title}</h3>
              <button onClick={() => setRoutePopover(null)}>✕</button>
            </div>
            <div className="route-body">
              <div><strong>Fra:</strong> {routePopover.fromAddress}</div>
              <div><strong>Til:</strong> {routePopover.toAddress}</div>
              <div className="route-stats">🚗 {routePopover.duration} min • {routePopover.distance} km</div>
              {routePopover.fromAddress && routePopover.toAddress && (
                <iframe
                  width="100%" 
                  height="300" 
                  style={{ border: 0, borderRadius: 8 }}
                  loading="lazy" 
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY||''}&origin=${encodeURIComponent(routePopover.fromAddress)}&destination=${encodeURIComponent(routePopover.toAddress)}&mode=driving`}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kalender indstillinger</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Visningstype</Label>
              <Select 
                value={calendarSettings.viewType} 
                onValueChange={(value) => setCalendarSettings(prev => ({ ...prev, viewType: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_week">Fuld uge (7 dage)</SelectItem>
                  <SelectItem value="work_week">Arbejdsuge (5 dage)</SelectItem>
                  <SelectItem value="two_weeks">To uger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Aktive teknikere</Label>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {techs.map((tech) => (
                  <div key={tech.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`tech-${tech.id}`}
                      checked={calendarSettings.activeTechnicians.includes(tech.id)}
                      onCheckedChange={() => {
                        setCalendarSettings(prev => ({
                          ...prev,
                          activeTechnicians: prev.activeTechnicians.includes(tech.id)
                            ? prev.activeTechnicians.filter(id => id !== tech.id)
                            : [...prev.activeTechnicians, tech.id]
                        }))
                      }}
                    />
                    <div className="flex-1">
                      <label htmlFor={`tech-${tech.id}`} className="font-medium cursor-pointer">
                        {tech.name}
                      </label>
                      <p className="text-xs text-gray-500">{formatAddress(tech.address) || (typeof tech.address === 'string' ? tech.address : '') || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Annuller</Button>
            <Button onClick={saveSettings} style={{ backgroundColor: BRAND_BLUE, color: 'white' }}>
              Gem indstillinger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .planner-page { 
          display: flex; 
          gap: 16px; 
          box-sizing: border-box;
        }
        .left-col { width: 360px; }
        .main-col { flex: 1; min-width: 600px; }
        
        /* JobPool visuals */
        .job-pool { 
          background: #fff; 
          border-radius: 12px; 
          padding: 12px; 
          box-shadow: 0 8px 30px rgba(2,6,23,0.06); 
          height: 100%; 
          overflow: auto;
        }
        .job-pool-header { 
          display: flex; 
          align-items: center; 
          gap: 8px;
          margin-bottom: 12px;
        }
        .job-pool-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: ${BRAND_BLUE};
        }
        .job-pool-header .badge { 
          background: ${BRAND_BLUE}; 
          color: #fff; 
          padding: 4px 8px; 
          border-radius: 999px; 
          font-size: 12px;
        }
        .job-pool-header .hint {
          font-size: 11px;
          color: #666;
          margin-top: 4px;
        }
        .job-pool-list { 
          display: flex; 
          flex-direction: column; 
          gap: 10px;
        }
        .job-pool-item { 
          display: flex; 
          justify-content: space-between; 
          padding: 12px; 
          background: #f8fafc; 
          border-radius: 10px; 
          border-left: 6px solid ${BRAND_BLUE}; 
          cursor: grab;
          transition: transform 0.2s;
        }
        .job-pool-item:hover { 
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .job-pool-item:active {
          cursor: grabbing;
        }
        .task-number {
          font-weight: 700;
          font-size: 14px;
        }
        .task-company {
          font-size: 12px;
          color: #444;
          margin-top: 4px;
        }
        .task-city {
          font-size: 11px;
          color: #666;
          margin-top: 2px;
        }
        .days {
          font-size: 12px;
          font-weight: 600;
        }
        
        /* Route popover */
        .route-popover-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(0,0,0,0.4); 
          z-index: 10001; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        }
        .route-popover-card { 
          width: 90%; 
          max-width: 720px; 
          background: #fff; 
          border-radius: 12px; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }
        .route-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 12px 16px; 
          background: ${BRAND_BLUE}; 
          color: #fff; 
          border-radius: 12px 12px 0 0;
        }
        .route-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .route-header button {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .route-body { 
          padding: 16px;
        }
        .route-stats {
          margin: 12px 0;
          padding: 8px 12px;
          background: #f3f4f6;
          border-radius: 6px;
          font-weight: 600;
          color: ${BRAND_BLUE};
        }
      `}</style>
    </div>
  )
}
