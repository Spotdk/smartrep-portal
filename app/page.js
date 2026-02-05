'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ClipboardList, Camera, LogOut, Loader2 } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

// Import shared components
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import LoginPage from '@/components/shared/LoginPage'
import Dashboard from '@/components/shared/Dashboard'
import Header from '@/components/shared/Header'
import Sidebar from '@/components/shared/Sidebar'

// Import view components
import TasksView from '@/components/views/TasksView'
import MessagesView from '@/components/views/MessagesView'
import KundestyringView from '@/components/views/KundestyringView'
import CalendarView from '@/components/views/CalendarView'
import MapView from '@/components/views/MapView'
import WeatherView from '@/components/views/WeatherView'
import CommunicationsView from '@/components/views/CommunicationsView'
import PhotoReportsView from '@/components/views/PhotoReportsView'
import PriceListView from '@/components/views/PriceListView'
import InvoicesView from '@/components/views/InvoicesView'
import ApiKeysView from '@/components/views/ApiKeysView'
import FirmainfoView from '@/components/views/FirmainfoView'
import SkabelonerView from '@/components/views/SkabelonerView'
import DataFieldsView from '@/components/views/DataFieldsView'
import TechnicianTasksView from '@/components/views/TechnicianTasksView'
import UsersView from '@/components/views/UsersView'
import PlanlaegView from '@/components/planlaeg/PlanlaegView'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifications, setNotifications] = useState({ unreadMessages: 0, newTasks: 0, tasksWithMessages: [] })

  // Fetch notification counts – robust mod API-fejl så én fejl ikke bryder portalen
  const fetchNotifications = async () => {
    if (!user) return
    const fallback = { unreadMessages: 0, newTasks: 0, tasksWithMessages: [] }
    try {
      const [messagesData, countsData, messagesWithTasks] = await Promise.allSettled([
        api.get('/messages/unread-count'),
        api.get('/tasks/counts'),
        api.get('/messages')
      ])
      const unread = messagesData.status === 'fulfilled' ? messagesData.value?.count ?? 0 : 0
      const newTasks = countsData.status === 'fulfilled' ? (countsData.value?.awaiting_confirmation ?? 0) : 0
      const list = messagesWithTasks.status === 'fulfilled' && Array.isArray(messagesWithTasks.value)
        ? messagesWithTasks.value
        : []
      const taskIdsWithMessages = [...new Set(
        list
          .filter(m => m?.taskId && m?.fromUserRole === 'customer')
          .map(m => m.taskId)
      )]
      setNotifications({ unreadMessages: unread, newTasks, tasksWithMessages: taskIdsWithMessages })
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setNotifications(fallback)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('smartrep_token')
    if (token) { 
      api.get('/auth/me')
        .then(setUser)
        .catch(() => localStorage.removeItem('smartrep_token'))
        .finally(() => setLoading(false)) 
    }
    else { setLoading(false) }
  }, [])

  // Fetch notifications when user loads and periodically
  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
  }, [user])

  const handleLogin = (userData) => { setUser(userData); setActiveView('dashboard') }
  const handleLogout = () => { localStorage.removeItem('smartrep_token'); setUser(null) }

  const getTitle = () => {
    const titles = { 
      dashboard: 'Dashboard', 
      tasks: 'Opgaver', 
      customers: 'Kundestyring', 
      calendar: 'Planlægning',
      'planlaeg-test': 'Planlæg Test', 
      map: 'Kort', 
      weather: 'Vejr', 
      communications: 'Kommunikation', 
      photoreports: 'Fotorapporter',
      pricelist: 'Prisliste',
      invoices: 'Fakturering',
      users: 'Brugere',
      apikeys: 'API Keys',
      skabeloner: 'Skabeloner',
      firmainfo: 'Firmainfo',
      datafields: 'Datafelter',
      messages: 'Beskeder'
    }
    return titles[activeView] || 'SMARTREP'
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard user={user} />
      case 'tasks': return <TasksView user={user} tasksWithMessages={notifications.tasksWithMessages} />
      case 'messages': return <MessagesView user={user} onMessagesRead={fetchNotifications} />
      case 'customers': return <KundestyringView />
      case 'calendar': return <CalendarView />
      case 'planlaeg-test': return <PlanlaegView user={user} />
      case 'map': return <MapView />
      case 'weather': return <WeatherView />
      case 'communications': return <CommunicationsView />
      case 'photoreports': return <PhotoReportsView user={user} />
      // Økonomi
      case 'pricelist': return <PriceListView />
      case 'invoices': return <InvoicesView />
      // Indstillinger
      case 'users': return <UsersView />
      case 'apikeys': return <ApiKeysView />
      case 'skabeloner': return <SkabelonerView />
      case 'firmainfo': return <FirmainfoView />
      case 'datafields': return <DataFieldsView />
      default: return <Dashboard user={user} />
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>
  if (!user) return <LoginPage onLogin={handleLogin} />

  // Check if user prefers technician mode (for multi-role users)
  const preferredMode = typeof window !== 'undefined' ? localStorage.getItem('smartrep_preferred_mode') : null
  const isTechnicianRole = user.role === 'technician'
  const hasMultipleRoles = user?.roles && Array.isArray(user.roles)
  const canBeTechnician = hasMultipleRoles && (user.roles.includes('technician_admin') || user.roles.includes('technician_standard'))
  
  // Show technician view if:
  // 1. User's primary role is technician, OR
  // 2. User has multiple roles and prefers technician mode
  const showTechnicianView = isTechnicianRole || (canBeTechnician && preferredMode === 'technician')

  // Technician Mobile View
  if (showTechnicianView) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="sticky top-0 z-50 text-white p-4" style={{ backgroundColor: BRAND_BLUE }}>
          <div className="flex items-center justify-between">
            <img src="https://customer-assets.emergentagent.com/job_clientflow-140/artifacts/13cklo26_SMARTREP_Cirkel_2_bla%CC%8A.png" alt="SMARTREP" className="h-10" />
            <div className="flex items-center gap-3">
              <span className="text-sm">{user.name}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/20">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>
        <nav className="sticky top-16 z-40 bg-white border-b">
          <div className="flex">
            <button 
              onClick={() => setActiveView('tasks')} 
              className={`flex-1 py-4 text-center font-medium ${activeView === 'tasks' ? 'border-b-2' : 'text-gray-500'}`} 
              style={activeView === 'tasks' ? { borderColor: BRAND_BLUE, color: BRAND_BLUE } : {}}
            >
              <ClipboardList className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Opgaver</span>
            </button>
            <button 
              onClick={() => setActiveView('photoreports')} 
              className={`flex-1 py-4 text-center font-medium ${activeView === 'photoreports' ? 'border-b-2' : 'text-gray-500'}`} 
              style={activeView === 'photoreports' ? { borderColor: BRAND_BLUE, color: BRAND_BLUE } : {}}
            >
              <Camera className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Rapporter</span>
            </button>
          </div>
        </nav>
        <main className="p-4">
          <ErrorBoundary>
            {activeView === 'tasks' ? <TechnicianTasksView user={user} /> : <PhotoReportsView user={user} />}
          </ErrorBoundary>
        </main>
      </div>
    )
  }

  // Admin/Customer Desktop View
  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar 
        user={user} 
        activeView={activeView} 
        setActiveView={setActiveView} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        notifications={notifications} 
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          user={user} 
          onLogout={handleLogout} 
          title={getTitle()} 
          collapsed={sidebarCollapsed} 
          setCollapsed={setSidebarCollapsed} 
        />
        <main className="flex-1 p-6 overflow-auto">
          <ErrorBoundary>{renderView()}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}