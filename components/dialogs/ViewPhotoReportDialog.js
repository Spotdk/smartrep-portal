'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatAddress, taskAddressString } from '@/lib/utils'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { Check, X, ExternalLink } from 'lucide-react'

const BRAND_BLUE = '#0133ff'

export default function ViewPhotoReportDialog({ report, task, open, onClose, user, onUpdate, onSend, onReset }) {
  if (!report) return null
  const addr = task ? (formatAddress(report.address) || formatAddress(task.address) || taskAddressString(task)) : (report.address ? [report.address, report.postalCode, report.city].filter(Boolean).join(', ') : '')
  const damages = report.damages || []
  const approved = damages.filter(d => d.status === 'approved').length
  const rejected = damages.filter(d => d.status === 'rejected').length
  const pending = damages.filter(d => d.status === 'pending' || !d.status).length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fotorapport – {addr || 'Ingen adresse'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rapport-info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Kunde</p>
                  <p className="font-medium">{report.companyId && task?.companyName ? task.companyName : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Kontakt</p>
                  <p className="font-medium">{report.contactName || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Oprettet</p>
                  <p className="font-medium">{report.createdAt ? format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm', { locale: da }) : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge className={report.status === 'reviewed' ? 'bg-green-100 text-green-700' : report.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>
                    {report.status === 'reviewed' ? 'Gennemgået' : report.status === 'sent' ? 'Sendt' : report.status === 'draft' ? 'Kladde' : report.status || '-'}
                  </Badge>
                </div>
                {report.reviewedAt && (
                  <div>
                    <p className="text-gray-500">Gennemgået</p>
                    <p className="font-medium">{format(new Date(report.reviewedAt), 'dd/MM/yyyy HH:mm', { locale: da })}</p>
                  </div>
                )}
                {report.reviewerName && (
                  <div>
                    <p className="text-gray-500">Af</p>
                    <p className="font-medium">{report.reviewerName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Opsummering */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Opsummering</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{approved}</p>
                  <p className="text-xs text-green-700">Accepteret</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{rejected}</p>
                  <p className="text-xs text-red-700">Afvist</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{pending}</p>
                  <p className="text-xs text-yellow-700">Afventer</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skader med fotos */}
          <div>
            <h3 className="font-medium mb-3">Skader ({damages.length})</h3>
            <div className="space-y-4">
              {damages.map((damage, idx) => (
                <Card key={damage.id || idx} className="overflow-hidden">
                  <CardHeader className="p-4" style={{ backgroundColor: `${BRAND_BLUE}08` }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center" style={{ backgroundColor: BRAND_BLUE }}>
                          {idx + 1}
                        </span>
                        {damage.item || 'Skade'}
                        {damage.location && <span className="text-gray-500 font-normal">– {damage.location}</span>}
                      </CardTitle>
                      {damage.status === 'approved' && (
                        <Badge className="bg-green-100 text-green-700"><Check className="w-3 h-3 mr-1" />Accepteret</Badge>
                      )}
                      {damage.status === 'rejected' && (
                        <Badge className="bg-red-100 text-red-700"><X className="w-3 h-3 mr-1" />Afvist</Badge>
                      )}
                      {(!damage.status || damage.status === 'pending') && (
                        <Badge className="bg-yellow-100 text-yellow-700">Afventer</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Type</p>
                        <p className="font-medium">{damage.type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Placering</p>
                        <p className="font-medium">{damage.location || '-'}</p>
                      </div>
                    </div>
                    {damage.notes && (
                      <div className="text-sm">
                        <p className="text-gray-500">Beskrivelse</p>
                        <p className="italic bg-gray-50 p-2 rounded">{damage.notes}</p>
                      </div>
                    )}
                    {(damage.closeupPhoto || damage.locationPhoto) && (
                      <div className="grid grid-cols-2 gap-3">
                        {damage.closeupPhoto && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Nærbillede</p>
                            <img
                              src={damage.closeupPhoto}
                              alt="Nærbillede"
                              className="w-full h-36 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        {damage.locationPhoto && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Lokationsbillede</p>
                            <img
                              src={damage.locationPhoto}
                              alt="Lokation"
                              className="w-full h-36 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {(report.reviewUrl || report.reviewToken) && (
            <div className="text-sm text-gray-600">
              <a 
                href={report.reviewUrl || (typeof window !== 'undefined' ? `${window.location.origin}/fotorapport/${report.reviewToken}` : '#')} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Åbn kundens gennemsynslink
              </a>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Luk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}