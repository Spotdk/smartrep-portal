'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, ChevronRight, Loader2, History, Plus, RefreshCw, Pencil, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { api, BRAND_BLUE, STATUS_CONFIG } from '@/lib/constants'

const TaskLogSection = ({ task }) => {
  const [expanded, setExpanded] = useState(false)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const loadLogs = async () => {
    if (!expanded) return
    setLoading(true)
    try {
      const data = await api.get(`/logs?entityType=task&entityId=${task.id}`)
      setLogs(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    if (expanded) loadLogs() 
  }, [expanded])

  const getActionIcon = (action) => {
    switch(action) {
      case 'created': return <Plus className="w-4 h-4 text-green-500" />
      case 'status_changed': return <RefreshCw className="w-4 h-4 text-blue-500" />
      case 'updated': return <Pencil className="w-4 h-4 text-yellow-500" />
      case 'damage_added': return <AlertCircle className="w-4 h-4 text-orange-500" />
      default: return <History className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="border rounded-lg mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" style={{ color: BRAND_BLUE }} />
          <span className="font-medium">Log</span>
          {logs.length > 0 && (
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{logs.length}</span>
          )}
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>
      
      {expanded && (
        <div className="p-4 pt-0 border-t max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Ingen log-poster endnu</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded text-sm">
                  <div className="mt-0.5">{getActionIcon(log.action)}</div>
                  <div className="flex-1">
                    <p className="text-gray-800">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {log.createdAt ? format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: da }) : ''}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs font-medium" style={{ color: BRAND_BLUE }}>{log.userName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskLogSection
