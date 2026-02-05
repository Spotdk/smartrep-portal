'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatAddress, taskAddressString } from '@/lib/utils'

export default function ViewPhotoReportDialog({ report, task, open, onClose, user, onUpdate, onSend, onReset }) {
  if (!report) return null
  const addr = task ? (formatAddress(report.taskAddress) || taskAddressString(task)) : ''

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fotorapport - {addr || 'Ingen adresse'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Status: <span className="font-medium">{report.status}</span>
            </p>
            <p className="text-sm text-gray-600">
              Skader: <span className="font-medium">{report.damages?.length || 0}</span>
            </p>
          </div>
          
          {/* TODO: Add full photo report display functionality */}
          <div className="text-center py-8 text-gray-500">
            <p>Fotorapport visning kommer snart...</p>
            <p className="text-xs mt-2">Rapport ID: {report.id}</p>
          </div>
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