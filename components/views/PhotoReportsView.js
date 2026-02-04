'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Eye, Send, Trash2, RefreshCw, Printer, Loader2, FileImage
} from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { api, BRAND_BLUE } from '@/lib/constants'
import dynamic from 'next/dynamic'

// Lazy load the dialog
const ViewPhotoReportDialog = dynamic(() => import('@/components/dialogs/ViewPhotoReportDialog'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div>
})

export default function PhotoReportsView({ user }) {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const statusFilter = activeTab === 'all' ? '' : `?status=${activeTab}`
      const [reportsData, tasksData] = await Promise.all([
        api.get(`/photoreports${statusFilter}`),
        api.get('/tasks')
      ])
      setReports(reportsData)
      setTasks(tasksData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [activeTab])

  const sendReport = async (reportId) => {
    if (!confirm('Send rapporten til kunden via SMS og Email?')) return
    setActionLoading(reportId)
    try {
      const result = await api.post(`/photoreports/${reportId}/send`)
      alert(`✅ Rapport sendt!\n\nSMS: ${result.notifications.sms}\nEmail: ${result.notifications.email}\n\nReview link: ${result.reviewUrl}`)
      loadData()
    } catch (err) {
      alert('Fejl: ' + (err.message || 'Kunne ikke sende'))
    } finally {
      setActionLoading(null)
    }
  }

  const resetReport = async (reportId) => {
    if (!confirm('Nulstil rapporten så den kan sendes igen?')) return
    setActionLoading(reportId)
    try {
      await api.post(`/photoreports/${reportId}/reset`)
      alert('✅ Rapporten er nulstillet')
      loadData()
    } catch (err) {
      alert('Fejl: ' + (err.message || 'Kunne ikke nulstille'))
    } finally {
      setActionLoading(null)
    }
  }

  const deleteReport = async (reportId) => {
    if (!confirm('Er du sikker på at du vil slette denne rapport?')) return
    setActionLoading(reportId)
    try {
      await api.delete(`/photoreports/${reportId}`)
      loadData()
    } catch (err) {
      alert('Fejl: ' + (err.message || 'Kunne ikke slette'))
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'draft': return <Badge className="bg-gray-100 text-gray-700">Kladde</Badge>
      case 'sent': return <Badge className="bg-blue-100 text-blue-700">Sendt</Badge>
      case 'reviewed': return <Badge className="bg-green-100 text-green-700">Gennemgået</Badge>
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700">Afventer (Gammel)</Badge>
      case 'approved': return <Badge className="bg-green-100 text-green-700">Godkendt (Gammel)</Badge>
      case 'rejected': return <Badge className="bg-red-100 text-red-700">Afvist (Gammel)</Badge>
      case 'partially_approved': return <Badge className="bg-orange-100 text-orange-700">Delvis godkendt</Badge>
      default: return <Badge className="bg-gray-100 text-gray-700">{status || 'Ukendt'}</Badge>
    }
  }

  // Map old statuses to new for filtering
  const getFilterableStatus = (status) => {
    if (status === 'pending') return 'draft' // Old pending = new draft
    if (status === 'approved' || status === 'partially_approved' || status === 'rejected') return 'reviewed'
    return status
  }

  const tabs = [
    { id: 'all', label: 'Alle' },
    { id: 'draft', label: 'Kladder' },
    { id: 'sent', label: 'Sendt' },
    { id: 'reviewed', label: 'Gennemgået' }
  ]

  if (loading && reports.length === 0) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fotorapporter</h2>
          <p className="text-gray-500">
            {user?.role === 'technician' 
              ? 'Opret rapport for NYE skader fundet på stedet' 
              : 'Administrer og send fotorapporter til godkendelse'}
          </p>
        </div>
        <Button 
          onClick={() => router.push('/fotorapport/ny')} 
          className="text-white" 
          style={{ backgroundColor: BRAND_BLUE }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ny fotorapport
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              activeTab === tab.id 
                ? 'bg-white border border-b-0 border-gray-200 -mb-[1px]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === tab.id ? { color: BRAND_BLUE } : {}}
          >
            {tab.label}
            {activeTab !== tab.id && (
              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {reports.filter(r => tab.id === 'all' ? true : r.status === tab.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileImage className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Ingen fotorapporter {activeTab !== 'all' ? `med status "${tabs.find(t => t.id === activeTab)?.label}"` : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const task = tasks.find(t => t.id === report.taskId)
            const approvedCount = report.damages?.filter(d => d.status === 'approved').length || 0
            const totalCount = report.damages?.length || 0
            
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(report.status)}
                        <span className="text-sm text-gray-500">
                          {report.createdAt ? format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm', { locale: da }) : '-'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {report.taskAddress || task?.address || 'Ingen adresse'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Opgave #{report.taskNumber || task?.taskNumber || 'N/A'} • {report.companyName || task?.companyName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-600">
                          <strong>{totalCount}</strong> skader
                        </span>
                        {report.status === 'reviewed' && (
                          <>
                            <span className="text-green-600">
                              ✓ {approvedCount} godkendt
                            </span>
                            <span className="text-red-600">
                              ✗ {totalCount - approvedCount} afvist
                            </span>
                          </>
                        )}
                        {report.status === 'sent' && (
                          <span className="text-blue-600">Afventer kundens gennemgang</span>
                        )}
                      </div>
                      {report.reviewedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Gennemgået: {format(new Date(report.reviewedAt), 'dd/MM/yyyy HH:mm', { locale: da })} af {report.reviewerName}
                        </p>
                      )}
                      {report.sentAt && !report.reviewedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Sendt: {format(new Date(report.sentAt), 'dd/MM/yyyy HH:mm', { locale: da })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Button size="sm" variant="outline" onClick={() => setSelectedReport(report)}>
                        <Eye className="w-4 h-4 mr-1" />Vis
                      </Button>
                      {(report.status === 'draft' || report.status === 'pending') && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => sendReport(report.id)}
                            disabled={actionLoading === report.id}
                            className="text-white"
                            style={{ backgroundColor: BRAND_BLUE }}
                          >
                            {actionLoading === report.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                            Send
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteReport(report.id)}
                            disabled={actionLoading === report.id}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />Slet
                          </Button>
                        </>
                      )}
                      {report.status === 'sent' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resetReport(report.id)}
                          disabled={actionLoading === report.id}
                        >
                          {actionLoading === report.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                          Nulstil
                        </Button>
                      )}
                      {(report.status === 'reviewed' || report.status === 'approved' || report.status === 'partially_approved' || report.status === 'rejected') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.print()}
                        >
                          <Printer className="w-4 h-4 mr-1" />PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Report Detail Dialog */}
      <ViewPhotoReportDialog 
        report={selectedReport} 
        task={tasks.find(t => t.id === selectedReport?.taskId)} 
        open={!!selectedReport} 
        onClose={() => setSelectedReport(null)} 
        user={user} 
        onUpdate={loadData}
        onSend={sendReport}
        onReset={resetReport}
      />
    </div>
  )
}