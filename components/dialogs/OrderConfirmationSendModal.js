'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Loader2, MapPin, AlertTriangle, Percent, Clock, Calendar } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'
import { taskAddressString } from '@/lib/utils'

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
  const [taskSummary, setTaskSummary] = useState('')
  const [transportRates, setTransportRates] = useState(null)
  const [discountKmPercent, setDiscountKmPercent] = useState(0)
  const [discountTimePercent, setDiscountTimePercent] = useState(0)
  const [showDiscountKm, setShowDiscountKm] = useState(false)
  const [showDiscountTime, setShowDiscountTime] = useState(false)
  const [deliveryTimeType, setDeliveryTimeType] = useState('2-3_weeks')
  const [deliveryTimeDate, setDeliveryTimeDate] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [sentConfirmUrl, setSentConfirmUrl] = useState(null)

  const destination = task ? [taskAddressString(task), task.postalCode, task.city, 'Denmark'].filter(Boolean).join(', ').trim() : ''

  // Step 0: Hent afstand/køretid ved åbning; nulstil send-state
  useEffect(() => {
    if (!open || !task || !destination) return
    setStep(0)
    setSentConfirmUrl(null)
    setSendError(null)
    setTaskSummary('')
    setTransportRates(null)
    setShowDiscountKm(false)
    setShowDiscountTime(false)
    setDiscountKmPercent(0)
    setDiscountTimePercent(0)
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

  // Hent KØR + TIM2 priser når vi er i step 4 og udvidet zone
  useEffect(() => {
    if (!open || step !== 4 || serviceZone !== 'extended') return
    let cancelled = false
    setTransportRates(null)
    api.get('/order-confirmation/transport-rates')
      .then((r) => {
        if (!cancelled && r?.kmRate != null && r?.timeRate != null) setTransportRates({ kmRate: r.kmRate, timeRate: r.timeRate })
      })
      .catch(() => { if (!cancelled) setTransportRates({ kmRate: 4.75, timeRate: 825 }) })
    return () => { cancelled = true }
  }, [open, step, serviceZone])

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
        drive_time_minutes: screening.minutes ?? null,
        taskSummary: taskSummary?.trim() || '',
        deliveryTimeType,
        deliveryTimeDate: deliveryTimeType === 'by_date' && deliveryTimeDate ? deliveryTimeDate : null,
        ...(serviceZone === 'extended' && transportRates && {
          transport_km_rate: transportRates.kmRate,
          transport_time_rate: transportRates.timeRate,
          transport_km_discount_percent: showDiscountKm ? Math.min(100, Math.max(0, Number(discountKmPercent) || 0)) : 0,
          transport_time_discount_percent: showDiscountTime ? Math.min(100, Math.max(0, Number(discountTimePercent) || 0)) : 0
        })
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
                Destination: {task ? [taskAddressString(task), task.postalCode, task.city].filter(Boolean).join(', ') : ''}
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
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4" /> Leveringstid</Label>
              <div className="space-y-2 pl-1">
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${deliveryTimeType === '2-3_weeks' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="deliveryTime" checked={deliveryTimeType === '2-3_weeks'} onChange={() => setDeliveryTimeType('2-3_weeks')} className="mt-1" />
                  <div>
                    <span className="font-medium">Forventet udførsel inden for 2-3 uger</span>
                    <p className="text-xs text-gray-600 mt-0.5">Vejrforhold kan påvirke planlægning. Vi kontakter dig med konkret dato. (God til vinter)</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${deliveryTimeType === '10_workdays' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="deliveryTime" checked={deliveryTimeType === '10_workdays'} onChange={() => setDeliveryTimeType('10_workdays')} className="mt-1" />
                  <div>
                    <span className="font-medium">Forventet udførsel indenfor 10 arbejdsdage</span>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${deliveryTimeType === 'by_date' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="deliveryTime" checked={deliveryTimeType === 'by_date'} onChange={() => setDeliveryTimeType('by_date')} className="mt-1" />
                  <div className="flex-1">
                    <span className="font-medium">Efter aftale udført senest</span>
                    <p className="text-xs text-gray-600 mt-1">Vælg dato i kalenderen</p>
                    {deliveryTimeType === 'by_date' && (
                      <div className="mt-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <Input
                          type="date"
                          value={deliveryTimeDate}
                          onChange={(e) => setDeliveryTimeDate(e.target.value)}
                          className="w-40"
                          min={new Date().toISOString().slice(0, 10)}
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Opgave opsummering (valgfri)</Label>
              <Textarea
                className="min-h-[100px] border-2 border-gray-200 rounded-lg bg-white"
                placeholder="Tilpas evt. opsummeringstekst, som kunden ser i ordrebekræftelsen..."
                value={taskSummary}
                onChange={(e) => setTaskSummary(e.target.value)}
              />
            </div>

            {serviceZone === 'extended' && screening.km != null && screening.minutes != null && (
              <div className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50/50">
                <div className="px-3 py-2 bg-amber-100/80 border-b border-amber-200 text-sm font-semibold text-gray-800">Transporttillæg (udvidet serviceområde)</div>
                {transportRates ? (() => {
                  const kmTotal = screening.km * 2
                  const excessMinPerWay = Math.max(0, screening.minutes - 60)
                  const excessHoursTotal = (excessMinPerWay * 2) / 60
                  const dKm = showDiscountKm ? Math.min(100, Math.max(0, Number(discountKmPercent) || 0)) : 0
                  const dTime = showDiscountTime ? Math.min(100, Math.max(0, Number(discountTimePercent) || 0)) : 0
                  const kmAmount = Math.round(kmTotal * transportRates.kmRate * (1 - dKm / 100))
                  const timeAmount = Math.round(excessHoursTotal * transportRates.timeRate * (1 - dTime / 100))
                  const totalAmount = kmAmount + timeAmount
                  const destLabel = task?.city ? `Fredericia – ${task.city}` : 'Fredericia – adressen'
                  return (
                    <div className="p-3 space-y-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-amber-200">
                            <th className="text-left py-1.5 font-medium text-gray-700">Post</th>
                            <th className="text-right py-1.5 font-medium text-gray-700 w-20">Beløb</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          <tr className="border-b border-amber-100">
                            <td className="py-1.5">
                              <span>{destLabel} t/r: {kmTotal} km á {Number(transportRates.kmRate).toFixed(2).replace('.', ',')} kr.</span>
                              {dKm > 0 && <span className="text-amber-700 ml-1">(Rabat {dKm}%)</span>}
                            </td>
                            <td className="py-1.5 text-right font-medium">{kmAmount.toLocaleString('da-DK')},-</td>
                          </tr>
                          <tr className="border-b border-amber-100">
                            <td className="py-1.5">
                              <span>Tid udover 1 time pr. vej: {excessHoursTotal.toFixed(1).replace('.', ',')} timer á {transportRates.timeRate} kr.</span>
                              {dTime > 0 && <span className="text-amber-700 ml-1">(Rabat {dTime}%)</span>}
                            </td>
                            <td className="py-1.5 text-right font-medium">{timeAmount.toLocaleString('da-DK')},-</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowDiscountKm(!showDiscountKm)} className="text-xs">
                          {showDiscountKm ? 'Fjern rabat (km)' : 'Tilføj rabat (km)'}
                        </Button>
                        {showDiscountKm && (
                          <span className="flex items-center gap-1 text-sm">
                            <Percent className="w-3.5 h-3.5" />
                            <Input type="number" min={0} max={100} step={1} className="w-16 h-8 text-sm" placeholder="%" value={discountKmPercent || ''} onChange={(e) => setDiscountKmPercent(e.target.value)} />
                            <span>% ekstraordinær rabat</span>
                          </span>
                        )}
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowDiscountTime(!showDiscountTime)} className="text-xs">
                          {showDiscountTime ? 'Fjern rabat (køretid)' : 'Tilføj rabat (køretid)'}
                        </Button>
                        {showDiscountTime && (
                          <span className="flex items-center gap-1 text-sm">
                            <Percent className="w-3.5 h-3.5" />
                            <Input type="number" min={0} max={100} step={1} className="w-16 h-8 text-sm" placeholder="%" value={discountTimePercent || ''} onChange={(e) => setDiscountTimePercent(e.target.value)} />
                            <span>% ekstraordinær rabat</span>
                          </span>
                        )}
                      </div>
                      <div className="bg-blue-50 border-t border-amber-200 px-3 py-2 rounded-b">
                        <span className="font-semibold text-gray-900">Transporttillæg i alt: {totalAmount.toLocaleString('da-DK')},-</span>
                        <span className="text-gray-600 ml-1 text-sm">ex. moms</span>
                      </div>
                    </div>
                  )
                })() : (
                  <div className="p-3 flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Henter priser fra prisliste (KØR, TIM2)...
                  </div>
                )}
              </div>
            )}

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
              <Button variant="outline" onClick={() => setStep(taskType === 'mixed' ? 3 : 2)}>Tilbage</Button>
              <Button variant="outline" onClick={onClose}>Annuller</Button>
              <Button onClick={handleSend} disabled={sending || !recipientEmail?.trim() || (deliveryTimeType === 'by_date' && !deliveryTimeDate)} style={{ backgroundColor: BRAND_BLUE }}>
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
