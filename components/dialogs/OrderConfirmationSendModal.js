'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, MapPin, AlertTriangle } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

const ORIGIN_FREDERICIA = 'Fredericia, Denmark'

const OrderConfirmationSendModal = ({ task, user, open, onClose, onSent }) => {
  const [step, setStep] = useState(0)
  const [screening, setScreening] = useState({ loading: true, error: null, km: null, minutes: null })
  const [serviceZone, setServiceZone] = useState('standard')
  const [taskType, setTaskType] = useState('mixed')
  const [addGlassRisk, setAddGlassRisk] = useState(false)
  const [addChemicalCleaning, setAddChemicalCleaning] = useState(false)
  const [glassNote, setGlassNote] = useState('')
  const [chemicalNote, setChemicalNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [sentConfirmUrl, setSentConfirmUrl] = useState(null)

  const destination = task ? `${task.address || ''}, ${task.postalCode || ''} ${task.city || ''}, Denmark`.replace(/\s*,\s*,/g, ',').replace(/^,\s*/, '').trim() : ''

  // Step 0: Hent afstand/køretid ved åbning; nulstil send-state
  useEffect(() => {
    if (!open || !task || !destination) return
    setStep(0)
    setSentConfirmUrl(null)
    setSendError(null)
    setScreening({ loading: true, error: null, km: null, minutes: null })
    const fetchDistance = async () => {
      try {
        const res = await fetch('/api/travel-distance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: ORIGIN_FREDERICIA, destination })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Kunne ikke beregne rute')
        const minutes = data.minutes ?? Math.round((data.km || 0) * 1.2) // fallback ca. 50 km/t
        setScreening({ loading: false, error: null, km: data.km, minutes })
        const extended = minutes > 60
        setServiceZone(extended ? 'extended' : 'standard')
      } catch (e) {
        setScreening({ loading: false, error: e.message, km: null, minutes: null })
      }
    }
    fetchDistance()
  }, [open, task?.id, destination])

  const driveTimeLabel = screening.minutes != null
    ? screening.minutes >= 60
      ? `${Math.floor(screening.minutes / 60)}t ${screening.minutes % 60}min`
      : `${screening.minutes} min`
    : '–'
  const isExtendedByTime = (screening.minutes || 0) > 60

  const canGoNextFromScreening = !screening.loading && (screening.error == null || screening.km != null)
  const handleNextFromScreening = () => {
    if (screening.error && screening.km == null) return
    setStep(1)
  }

  const handleNextFromZone = () => setStep(2)
  const handleNextFromTaskType = () => {
    if (taskType === 'mixed') setStep(3)
    else setStep(4)
  }
  const handleNextFromAddons = () => setStep(4)

  const handleSend = async () => {
    setSending(true)
    setSendError(null)
    setSentConfirmUrl(null)
    try {
      const result = await api.post('/order-confirmation/send', {
        taskId: task.id,
        serviceZone,
        taskType,
        addGlassRisk: taskType === 'mixed' ? addGlassRisk : taskType === 'solo_glass',
        addChemicalCleaning: taskType === 'mixed' ? addChemicalCleaning : taskType === 'solo_chemical',
        glassNote: (taskType === 'mixed' && addGlassRisk) || taskType === 'solo_glass' ? glassNote : '',
        chemicalNote: (taskType === 'mixed' && addChemicalCleaning) || taskType === 'solo_chemical' ? chemicalNote : '',
        distance_km: screening.km ?? null,
        drive_time_minutes: screening.minutes ?? null
      })
      setSentConfirmUrl(result.confirmUrl || null)
      onSent?.()
      if (result.confirmUrl) {
        setTimeout(() => {
          onClose()
        }, 8000)
      } else {
        onClose()
      }
    } catch (e) {
      setSendError(e.message || 'Kunne ikke sende ordrebekræftelse')
    } finally {
      setSending(false)
    }
  }

  // B2B: Ordrebekræftelse går til kundekontakt (aldrig bygherre)
  const recipientName = task?.contactName || 'Kunde'
  const recipientEmail = task?.contactEmail || ''

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send ordrebekræftelse</DialogTitle>
        </DialogHeader>

        {/* TRIN 0: Screening */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-gray-50">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4" />
                Afstandsberegning
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Destination: {task?.address}, {task?.postalCode} {task?.city}
              </p>
              {screening.loading && (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: BRAND_BLUE }} />
                  <span className="text-sm text-gray-500">Beregner afstand og køretid...</span>
                </div>
              )}
              {!screening.loading && screening.error && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800">{screening.error}</p>
                    <p className="text-xs text-amber-700 mt-1">Du kan fortsætte og angive zone manuelt.</p>
                  </div>
                </div>
              )}
              {!screening.loading && (screening.km != null || screening.minutes != null) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded border text-center">
                    <p className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>{screening.km ?? '–'} km</p>
                    <p className="text-xs text-gray-500">Afstand</p>
                  </div>
                  <div className="p-3 bg-white rounded border text-center">
                    <p className="text-2xl font-bold" style={{ color: BRAND_BLUE }}>{driveTimeLabel}</p>
                    <p className="text-xs text-gray-500">Køretid</p>
                  </div>
                </div>
              )}
              {!screening.loading && (screening.minutes || 0) > 60 && (
                <p className="mt-3 text-sm text-amber-700 font-medium">
                  Zone: Udvidet serviceområde (køretid over 1 time)
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Annuller</Button>
              <Button onClick={handleNextFromScreening} disabled={!canGoNextFromScreening} style={{ backgroundColor: BRAND_BLUE }}>
                Næste
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* TRIN 1: Serviceområde */}
        {step === 1 && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Trin 1: Serviceområde</Label>
            <p className="text-sm text-gray-600">
              Beregnet køretid: {driveTimeLabel} {screening.km != null && `(${screening.km} km)`}
            </p>
            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${serviceZone === 'extended' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="zone" checked={serviceZone === 'extended'} onChange={() => setServiceZone('extended')} className="mt-1" />
                <div>
                  <span className="font-medium">Udvidet serviceområde</span>
                  <p className="text-xs text-gray-600 mt-0.5">Inkluderer transporttillæg (køretid &gt; 1 time)</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${serviceZone === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="zone" checked={serviceZone === 'standard'} onChange={() => setServiceZone('standard')} className="mt-1" />
                <div>
                  <span className="font-medium">Standard serviceområde</span>
                  {isExtendedByTime && (
                    <p className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Køretid overstiger 1 time!
                    </p>
                  )}
                </div>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(0)}>Tilbage</Button>
              <Button onClick={handleNextFromZone} style={{ backgroundColor: BRAND_BLUE }}>Næste</Button>
            </DialogFooter>
          </div>
        )}

        {/* TRIN 2: Opgavetype */}
        {step === 2 && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Trin 2: Opgavetype</Label>
            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${taskType === 'mixed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="taskType" checked={taskType === 'mixed'} onChange={() => setTaskType('mixed')} className="mt-1" />
                <div>
                  <span className="font-medium">Blandet opgave (flere skadetyper)</span>
                  <p className="text-xs text-gray-600 mt-0.5">Standard ordrebekræftelse med mulighed for tillæg</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${taskType === 'solo_glass' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="taskType" checked={taskType === 'solo_glass'} onChange={() => setTaskType('solo_glass')} className="mt-1" />
                <div>
                  <span className="font-medium">Kun glaspolering (solo)</span>
                  <p className="text-xs text-gray-600 mt-0.5">Opgaven indeholder kun glaspolering med risiko</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${taskType === 'solo_chemical' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="taskType" checked={taskType === 'solo_chemical'} onChange={() => setTaskType('solo_chemical')} className="mt-1" />
                <div>
                  <span className="font-medium">Kun kemisk afrensning (solo)</span>
                  <p className="text-xs text-gray-600 mt-0.5">Opgaven indeholder kun kemisk afrensning</p>
                </div>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Tilbage</Button>
              <Button onClick={handleNextFromTaskType} style={{ backgroundColor: BRAND_BLUE }}>Næste</Button>
            </DialogFooter>
          </div>
        )}

        {/* TRIN 3: Tillæg (kun ved blandet) */}
        {step === 3 && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Tillæg særlige vilkår (valgfrit)</Label>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox id="glass" checked={addGlassRisk} onCheckedChange={(c) => setAddGlassRisk(!!c)} />
                <div className="flex-1">
                  <Label htmlFor="glass" className="font-medium cursor-pointer">Tilføj Glasrisiko-vilkår</Label>
                  <p className="text-xs text-gray-600 mt-0.5">Til glaspolering med lav succesrate</p>
                  {addGlassRisk && (
                    <div className="mt-2">
                      <Label className="text-xs font-semibold">Glaspolering:</Label>
                      <Textarea
                        className="mt-1 bg-white"
                        rows={2}
                        placeholder="Valgfri note..."
                        value={glassNote}
                        onChange={(e) => setGlassNote(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="chemical" checked={addChemicalCleaning} onCheckedChange={(c) => setAddChemicalCleaning(!!c)} />
                <div className="flex-1">
                  <Label htmlFor="chemical" className="font-medium cursor-pointer">Tilføj Kemisk afrensning-vilkår</Label>
                  <p className="text-xs text-gray-600 mt-0.5">Til afrensning af cement/mørtel</p>
                  {addChemicalCleaning && (
                    <div className="mt-2">
                      <Label className="text-xs font-semibold">Kemisk afrensning:</Label>
                      <Textarea
                        className="mt-1 bg-white"
                        rows={2}
                        placeholder="Valgfri note..."
                        value={chemicalNote}
                        onChange={(e) => setChemicalNote(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Tilbage</Button>
              <Button onClick={handleNextFromAddons} style={{ backgroundColor: BRAND_BLUE }}>Næste</Button>
            </DialogFooter>
          </div>
        )}

        {/* Efter send: vis link så I kan teste */}
        {sentConfirmUrl && (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800 mb-2">Ordrebekræftelse sendt</p>
              <p className="text-sm text-gray-700 mb-2">Test at linket virker (det er det samme, kunden får):</p>
              <a href={sentConfirmUrl} target="_blank" rel="noopener noreferrer" className="text-sm break-all text-blue-600 hover:underline block mb-2">
                {sentConfirmUrl}
              </a>
              <p className="text-xs text-gray-500">Hvis linket ikke åbner, tjek at PORTAL_PUBLIC_URL i .env.local peger på hvor appen kører (fx https://kundeportal.smartrep.nu eller jeres deployment-URL).</p>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Luk</Button>
            </DialogFooter>
          </div>
        )}

        {/* TRIN 4: Forhåndsvisning og send */}
        {step === 4 && !sentConfirmUrl && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Forhåndsvisning og afsendelse</Label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
              <p><span className="text-gray-500">Kontakt:</span> {recipientName}</p>
              <p><span className="text-gray-500">Email:</span> {recipientEmail || '–'}</p>
            </div>
            <p className="text-xs text-gray-500">
              Ordrebekræftelsen sendes til kundekontakten (email + SMS).
            </p>
            {!recipientEmail?.trim() && (
              <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">Opgaven har ingen kontakt-email. Vælg en kontakt med email (Skift kontakt i opgaven) før afsendelse.</p>
            )}
            {sendError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{sendError}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Annuller</Button>
              <Button onClick={handleSend} disabled={sending || !recipientEmail?.trim()} style={{ backgroundColor: BRAND_BLUE }}>
                {sending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sender...</> : 'Send ordrebekræftelse'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default OrderConfirmationSendModal
