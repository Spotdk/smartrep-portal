'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, BarChart3, Mail, MessageSquare, FileDown, Link2, ExternalLink } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

export default function WeatherReportModal({ task, user, open, onClose, onGenerated }) {
  const [periodType, setPeriodType] = useState('14_days')
  const [workdaysOnly, setWorkdaysOnly] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!task?.id) return
    setGenerating(true)
    setError(null)
    setReport(null)
    try {
      const data = await api.post('/weather-report/generate', {
        taskId: task.id,
        periodType,
        workdaysOnly
      })
      setReport(data)
      onGenerated?.()
    } catch (err) {
      setError(err.message || 'Kunne ikke generere rapport')
    } finally {
      setGenerating(false)
    }
  }

  const handleClose = () => {
    setReport(null)
    setError(null)
    setPeriodType('14_days')
    setWorkdaysOnly(true)
    onClose()
  }

  const reportUrl = typeof window !== 'undefined' && report?.publicToken
    ? `${window.location.origin}/weather/${report.publicToken}`
    : ''

  const copyLink = () => {
    if (!reportUrl) return
    navigator.clipboard.writeText(reportUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const openReport = () => {
    if (reportUrl) window.open(reportUrl, '_blank', 'noopener,noreferrer')
  }

  const addressStr = [task?.address, task?.postalCode, task?.city].filter(Boolean).join(', ') || '–'

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: BRAND_BLUE }} />
            Opret Vejranalyse
          </DialogTitle>
        </DialogHeader>

        {!report ? (
          <div className="space-y-6 py-2">
            <p className="text-sm text-gray-600">
              Opgave: {task?.taskNumber || '–'} · {addressStr}
            </p>
            {task?.createdAt && (
              <p className="text-xs text-gray-500">Oprettet: {format(new Date(task.createdAt), 'd. MMM yyyy', { locale: da })}</p>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-medium">Tæl kun arbejdsdage (man-fre)</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="workdays" checked={workdaysOnly} onCheckedChange={(c) => setWorkdaysOnly(!!c)} />
                <label htmlFor="workdays" className="text-sm">Ja</label>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Periode</Label>
              <RadioGroup value={periodType} onValueChange={setPeriodType} className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="7_days" id="p7" />
                  <Label htmlFor="p7" className="font-normal cursor-pointer">Seneste 7 dage</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="14_days" id="p14" />
                  <Label htmlFor="p14" className="font-normal cursor-pointer">Seneste 2 uger</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="21_days" id="p21" />
                  <Label htmlFor="p21" className="font-normal cursor-pointer">Seneste 3 uger</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="28_days" id="p28" />
                  <Label htmlFor="p28" className="font-normal cursor-pointer">Seneste 4 uger</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="pall" />
                  <Label htmlFor="pall" className="font-normal cursor-pointer">Alle dage (fra oprettelse til i dag)</Label>
                </div>
              </RadioGroup>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full text-white"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Generer vejranalyse
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
              <p className="font-semibold text-green-800">✓ Vejranalyse genereret</p>
              <p className="text-sm text-green-700 mt-1">
                Periode: {report.periodStart && format(new Date(report.periodStart), 'd. MMM', { locale: da })} – {report.periodEnd && format(new Date(report.periodEnd), 'd. MMM yyyy', { locale: da })} ({report.total_days} arbejdsdage)
              </p>
              <p className="text-lg font-bold text-green-800 mt-2">Succesrate: {report.success_rate}%</p>
              <div className="flex justify-center gap-1 flex-wrap mt-2">
                {(report.days || []).slice(0, 20).map((day, i) => (
                  <span key={i} className="text-lg" title={day.status_reason}>
                    {day.status === 'GREEN' ? '🟢' : day.status === 'YELLOW' ? '🟡' : day.status === 'RED' ? '🔴' : '⚪'}
                  </span>
                ))}
                {(report.days || []).length > 20 && <span className="text-gray-400">…</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Handlinger</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
                  <Link2 className="w-4 h-4" />
                  {copied ? 'Kopieret!' : 'Kopiér link'}
                </Button>
                <Button variant="outline" size="sm" onClick={openReport} className="gap-2" style={{ borderColor: BRAND_BLUE, color: BRAND_BLUE }}>
                  <ExternalLink className="w-4 h-4" />
                  Se fuld rapport
                </Button>
              </div>
              <p className="text-xs text-gray-500">Send linket til kunden via email eller SMS. PDF-download kan tilføjes senere.</p>
            </div>

            <Button variant="outline" onClick={handleClose} className="w-full">Luk</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
