'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Building2, FileImage, CheckCircle, Loader2 } from 'lucide-react'
import { api, BRAND_BLUE, STATUS_CONFIG } from '@/lib/constants'

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard')
      .then((d) => setStats(d && typeof d === 'object' ? d : null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, #0022cc 100%)` }}>
        <h2 className="text-2xl font-bold">Velkommen, {(user?.name || '').split(' ')[0] || 'bruger'}!</h2>
        <p className="text-blue-100 mt-1">Her er din oversigt for i dag</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Aktive opgaver</p><p className="text-3xl font-bold">{stats?.activeTasks || 0}</p></div><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><ClipboardList className="w-6 h-6" style={{ color: BRAND_BLUE }} /></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Udførte</p><p className="text-3xl font-bold">{stats?.completedTasks || 0}</p></div><div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
        {user?.role === 'admin' && <>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Kunder</p><p className="text-3xl font-bold">{stats?.totalCompanies || 0}</p></div><div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Building2 className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Rapporter</p><p className="text-3xl font-bold">{stats?.pendingReports || 0}</p></div><div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center"><FileImage className="w-6 h-6 text-orange-600" /></div></div></CardContent></Card>
        </>}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Seneste opgaver</CardTitle></CardHeader>
        <CardContent>
          {Array.isArray(stats?.recentTasks) && stats.recentTasks.length > 0 ? (
            <div className="space-y-3">
              {stats.recentTasks.map((task) => {
                if (!task?.id) return null
                const cfg = STATUS_CONFIG[task.status] || {}
                return (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${cfg.color || 'bg-gray-400'}`} />
                    <div><p className="font-medium text-sm">#{task.taskNumber} - {task.address}</p><p className="text-xs text-gray-500">{task.companyName}</p></div>
                  </div>
                  <Badge variant="outline" className={cfg.textColor || 'text-gray-600'}>{cfg.label || task.status || '—'}</Badge>
                </div>
              )})}
            </div>
          ) : <p className="text-gray-500 text-center py-8">Ingen opgaver endnu</p>}
        </CardContent>
      </Card>
    </div>
  )
}
