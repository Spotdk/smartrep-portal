'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Building2, ClipboardList, Calendar, Map, Cloud, MessageSquare, FileImage,
  Home, ChevronLeft, List, Receipt, Key, Database, Users
} from 'lucide-react'
import { BRAND_BLUE } from '@/lib/constants'

export default function Sidebar({ user, activeView, setActiveView, collapsed, setCollapsed, notifications = {} }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'customer', 'technician'] },
    { id: 'tasks', label: 'Opgaver', icon: ClipboardList, roles: ['admin', 'customer', 'technician'], badgeKey: 'newTasks' },
    { id: 'messages', label: 'Beskeder', icon: MessageSquare, roles: ['admin', 'customer'], badgeKey: 'unreadMessages' },
    { id: 'customers', label: 'Kundestyring', icon: Building2, roles: ['admin'] },
    { id: 'calendar', label: 'Planlæg', icon: Calendar, roles: ['admin'] },
    { id: 'planlaeg-test', label: 'Planlæg Test', icon: Calendar, roles: ['admin'] },
    { id: 'map', label: 'Kort', icon: Map, roles: ['admin'] },
    { id: 'weather', label: 'Vejr', icon: Cloud, roles: ['admin'] },
    { id: 'communications', label: 'Kommunikation', icon: MessageSquare, roles: ['admin'] },
    { id: 'photoreports', label: 'Fotorapporter', icon: FileImage, roles: ['admin', 'customer', 'technician'] },
    // Økonomi sektion
    { id: 'divider-economy', type: 'divider', label: 'ØKONOMI', roles: ['admin'] },
    { id: 'pricelist', label: 'Prisliste', icon: List, roles: ['admin'] },
    { id: 'invoices', label: 'Fakturering', icon: Receipt, roles: ['admin'] },
    // Indstillinger sektion  
    { id: 'divider-settings', type: 'divider', label: 'INDSTILLINGER', roles: ['admin'] },
    { id: 'users', label: 'Brugere', icon: Users, roles: ['admin'] },
    { id: 'apikeys', label: 'API Keys', icon: Key, roles: ['admin'] },
    { id: 'datafields', label: 'Datafelter', icon: Database, roles: ['admin'] },
  ]
  // Filter menu items - check both user.role (customers) and user.roles (staff)
  const filteredMenu = menuItems.filter(item => {
    // For staff users with multiple roles
    if (user?.roles && Array.isArray(user.roles)) {
      return item.roles.some(role => user.roles.includes(role))
    }
    // For regular users with single role
    return item.roles.includes(user?.role)
  })

  // Get badge count for an item
  const getBadgeCount = (item) => {
    if (!item.badgeKey || !notifications) return 0
    return notifications[item.badgeKey] || 0
  }

  return (
    <aside className={`bg-gray-900 text-white transition-all duration-300 ${collapsed ? 'w-0 overflow-hidden' : 'w-64'} min-h-screen flex flex-col`}>
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        {!collapsed && <img src="https://customer-assets.emergentagent.com/job_clientflow-140/artifacts/13cklo26_SMARTREP_Cirkel_2_bla%CC%8A.png" alt="SMARTREP" className="h-10" />}
        {!collapsed && (
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white hover:bg-gray-800">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {filteredMenu.map((item) => {
            const badgeCount = getBadgeCount(item)
            return item.type === 'divider' ? (
              <li key={item.id} className="pt-4 pb-2">
                <span className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</span>
              </li>
            ) : (
              <li key={item.id}>
                <button 
                  onClick={() => setActiveView(item.id)} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeView === item.id ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`} 
                  style={activeView === item.id ? { backgroundColor: BRAND_BLUE } : {}}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {badgeCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                  )}
                  {!collapsed && badgeCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <Avatar className="w-9 h-9" style={{ backgroundColor: BRAND_BLUE }}>
            <AvatarFallback className="text-white text-sm" style={{ backgroundColor: BRAND_BLUE }}>{user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-400">
                {user?.roles && Array.isArray(user.roles) 
                  ? user.roles.includes('admin') ? 'Administrator' : 'Staff'
                  : user?.role === 'admin' ? 'Administrator' : user?.role === 'customer' ? 'Kunde' : 'Tekniker'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
