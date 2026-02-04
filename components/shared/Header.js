'use client'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LogOut, ChevronRight, Crown, Wrench, RefreshCw } from 'lucide-react'
import { BRAND_BLUE } from '@/lib/constants'

export default function Header({ user, onLogout, title, collapsed, setCollapsed }) {
  // Check if user has multiple roles (staff user)
  const hasMultipleRoles = user?.roles && Array.isArray(user.roles) && user.roles.length > 1
  const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin'
  const isTechnician = user?.roles?.includes('technician_admin') || user?.roles?.includes('technician_standard')
  
  const switchToTechnicianMode = () => {
    // Store preference and reload
    localStorage.setItem('smartrep_preferred_mode', 'technician')
    window.location.reload()
  }
  
  const switchToAdminMode = () => {
    localStorage.removeItem('smartrep_preferred_mode')
    window.location.reload()
  }
  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {collapsed && (
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} className="text-gray-500 hover:text-gray-900">
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="w-8 h-8" style={{ backgroundColor: BRAND_BLUE }}>
              <AvatarFallback className="text-white text-xs" style={{ backgroundColor: BRAND_BLUE }}>{user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm font-medium">{user?.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            {hasMultipleRoles && (
              <div className="flex gap-1 mt-2">
                {isAdmin && <Badge variant="outline" className="text-xs"><Crown className="w-3 h-3 mr-1" />Admin</Badge>}
                {isTechnician && <Badge variant="outline" className="text-xs"><Wrench className="w-3 h-3 mr-1" />Tekniker</Badge>}
              </div>
            )}
          </div>
          
          {hasMultipleRoles && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1">
                <p className="px-2 text-xs font-semibold text-gray-500 uppercase">Skift Mode</p>
              </div>
              <DropdownMenuItem onClick={switchToAdminMode}>
                <Crown className="w-4 h-4 mr-2" style={{ color: BRAND_BLUE }} />
                Admin Portal (Desktop)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={switchToTechnicianMode}>
                <Wrench className="w-4 h-4 mr-2" style={{ color: '#10B981' }} />
                Tekniker App (Mobil)
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-red-600">
            <LogOut className="w-4 h-4 mr-2" />Log ud
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
