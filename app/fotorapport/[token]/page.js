'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Check, X, Loader2, AlertCircle, CheckCircle, Pen, Printer, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

const BRAND_BLUE = '#0133ff'

export default function FotorapportReviewPage() {
  const params = useParams()
  const token = params.token
  
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [reviewerName, setReviewerName] = useState('')
  const [damages, setDamages] = useState([])
  const [expandedDamages, setExpandedDamages] = useState({})
  
  // Signature canvas
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    if (token) {
      loadReport()
    }
  }, [token])

  useEffect(() => {
    // Setup canvas for signature when report is loaded
    if (report && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [report])

  const loadReport = async () => {
    try {
      const response = await fetch(`/api/photoreports/public/${token}`)
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Kunne ikke hente rapporten')
        setLoading(false)
        return
      }

      setReport(data)
      setDamages(data.damages || [])
      
      // Expand all damages by default
      const expanded = {}
      data.damages?.forEach((d, idx) => { expanded[idx] = true })
      setExpandedDamages(expanded)
      
      // Check if already reviewed
      if (data.status === 'reviewed') {
        setSubmitted(true)
        setResult({
          reviewedAt: data.reviewedAt,
          reviewerName: data.reviewerName,
          approvedCount: data.damages?.filter(d => d.status === 'approved').length || 0,
          totalCount: data.damages?.length || 0
        })
      }
    } catch (err) {
      setError('Fejl ved indlæsning af rapport')
    } finally {
      setLoading(false)
    }
  }

  const updateDamageStatus = (damageId, status) => {
    setDamages(prev => prev.map(d => 
      d.id === damageId ? { ...d, status } : d
    ))
  }

  const toggleDamageExpanded = (idx) => {
    setExpandedDamages(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  // Native HTML5 Canvas signature functions
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const coords = getCanvasCoords(e)
    
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    setIsDrawing(true)
    setHasSignature(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const coords = getCanvasCoords(e)
    
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const getSignatureData = () => {
    const canvas = canvasRef.current
    return canvas ? canvas.toDataURL('image/png') : null
  }

  const handleSubmit = async () => {
    if (!reviewerName.trim()) {
      alert('Indtast venligst dit navn')
      return
    }
    if (!hasSignature) {
      alert('Underskriv venligst i feltet')
      return
    }
    if (damages.some(d => d.status === 'pending')) {
      alert('Du skal acceptere eller afvise alle skader')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/photoreports/public/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          damages,
          signature: getSignatureData(),
          reviewerName: reviewerName.trim()
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        alert(data.error || 'Fejl ved indsendelse')
        return
      }

      setSubmitted(true)
      setResult(data)
    } catch (err) {
      alert('Fejl ved indsendelse')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: BRAND_BLUE }} />
          <p className="mt-4 text-gray-600">Indlæser rapport...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Rapport ikke fundet</h2>
            <p className="text-gray-500 mt-2">{error}</p>
            <p className="text-sm text-gray-400 mt-4">Kontakt SMARTREP hvis du har spørgsmål</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="mt-8">
            <CardContent className="pt-8 text-center">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Tak for din gennemgang!</h2>
              <p className="text-gray-500 mt-2">Rapporten er nu behandlet og gemt.</p>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gennemgået af:</span>
                    <span className="font-medium">{result?.reviewerName || reviewerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dato/tid:</span>
                    <span className="font-medium">
                      {result?.reviewedAt ? format(new Date(result.reviewedAt), 'dd/MM/yyyy HH:mm', { locale: da }) : format(new Date(), 'dd/MM/yyyy HH:mm', { locale: da })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Skader godkendt:</span>
                    <span className="font-medium text-green-600">
                      {result?.approvedCount || damages.filter(d => d.status === 'approved').length} af {result?.totalCount || damages.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Skader afvist:</span>
                    <span className="font-medium text-red-600">
                      {(result?.totalCount || damages.length) - (result?.approvedCount || damages.filter(d => d.status === 'approved').length)} af {result?.totalCount || damages.length}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-6">
                SMARTREP har modtaget din gennemgang og vil fortsætte arbejdet.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Header */}
      <header className="text-white p-4 print:bg-white print:text-black print:border-b" style={{ backgroundColor: BRAND_BLUE }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">📷 Fotorapport</h1>
              <p className="text-blue-100 text-sm print:text-gray-600">
                {report?.address}, {report?.postalCode} {report?.city}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="print:hidden bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Report Info */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Kunde</p>
                <p className="font-medium">{report?.task?.companyName || report?.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Oprettet af</p>
                <p className="font-medium">{report?.createdByName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Dato</p>
                <p className="font-medium">
                  {report?.createdAt ? format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm', { locale: da }) : '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Antal skader</p>
                <p className="font-medium">{damages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50 print:hidden">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              <strong>📋 Instruktion:</strong> Gennemgå hver skade og vælg <span className="text-green-700 font-medium">"Accepter"</span> eller <span className="text-red-700 font-medium">"Afvis"</span>. 
              Afslut med at skrive dit navn, underskriv og tryk "Afslut og send".
            </p>
          </CardContent>
        </Card>

        {/* Damages List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Skader ({damages.length})</h2>
          
          {damages.map((damage, idx) => (
            <Card key={damage.id || idx} className="overflow-hidden">
              <CardHeader 
                className="p-4 cursor-pointer print:cursor-default" 
                style={{ backgroundColor: `${BRAND_BLUE}08` }}
                onClick={() => toggleDamageExpanded(idx)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center" style={{ backgroundColor: BRAND_BLUE }}>
                      {idx + 1}
                    </span>
                    {damage.item || 'Skade'}
                    {damage.location && <span className="text-gray-500 font-normal">- {damage.location}</span>}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {damage.status === 'approved' && (
                      <Badge className="bg-green-100 text-green-700"><Check className="w-3 h-3 mr-1" />Accepteret</Badge>
                    )}
                    {damage.status === 'rejected' && (
                      <Badge className="bg-red-100 text-red-700"><X className="w-3 h-3 mr-1" />Afvist</Badge>
                    )}
                    {damage.status === 'pending' && (
                      <Badge className="bg-yellow-100 text-yellow-700">Afventer</Badge>
                    )}
                    <span className="print:hidden">
                      {expandedDamages[idx] ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              {(expandedDamages[idx] || true) && (
                <CardContent className="p-4 print:block" style={{ display: expandedDamages[idx] ? 'block' : 'none' }}>
                  <div className="space-y-4">
                    {/* Damage Details */}
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
                        <p className="italic bg-gray-50 p-2 rounded">"{damage.notes}"</p>
                      </div>
                    )}

                    {/* Photos */}
                    {(damage.closeupPhoto || damage.locationPhoto) && (
                      <div className="grid grid-cols-2 gap-3">
                        {damage.closeupPhoto && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Nærbillede</p>
                            <img 
                              src={damage.closeupPhoto} 
                              alt="Nærbillede" 
                              className="w-full h-40 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        {damage.locationPhoto && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Lokationsbillede</p>
                            <img 
                              src={damage.locationPhoto} 
                              alt="Lokation" 
                              className="w-full h-40 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Accept/Reject Buttons */}
                    <div className="flex gap-3 pt-2 print:hidden">
                      <Button
                        variant={damage.status === 'approved' ? 'default' : 'outline'}
                        className={`flex-1 h-12 ${damage.status === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50 hover:border-green-300'}`}
                        onClick={(e) => { e.stopPropagation(); updateDamageStatus(damage.id, 'approved') }}
                      >
                        <Check className="w-5 h-5 mr-2" />
                        Accepter
                      </Button>
                      <Button
                        variant={damage.status === 'rejected' ? 'default' : 'outline'}
                        className={`flex-1 h-12 ${damage.status === 'rejected' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50 hover:border-red-300'}`}
                        onClick={(e) => { e.stopPropagation(); updateDamageStatus(damage.id, 'rejected') }}
                      >
                        <X className="w-5 h-5 mr-2" />
                        Afvis
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Opsummering</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{damages.filter(d => d.status === 'approved').length}</p>
                <p className="text-xs text-green-700">Accepteret</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{damages.filter(d => d.status === 'rejected').length}</p>
                <p className="text-xs text-red-700">Afvist</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{damages.filter(d => d.status === 'pending').length}</p>
                <p className="text-xs text-yellow-700">Afventer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card className="print:hidden">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="reviewerName" className="text-base font-medium">Dit navn *</Label>
              <Input
                id="reviewerName"
                placeholder="Indtast dit fulde navn"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="mt-2 h-12"
              />
            </div>

            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <Pen className="w-4 h-4" />
                Underskrift *
              </Label>
              <p className="text-sm text-gray-500 mb-2">Tegn din underskrift i feltet nedenfor</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full touch-none cursor-crosshair"
                  style={{ maxWidth: '100%', height: '150px' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={clearSignature} className="mt-2">
                🗑️ Ryd underskrift
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="print:hidden space-y-3">
          <Button
            className="w-full h-14 text-lg text-white"
            style={{ backgroundColor: BRAND_BLUE }}
            onClick={handleSubmit}
            disabled={submitting || damages.some(d => d.status === 'pending')}
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" />Sender...</>
            ) : (
              <><CheckCircle className="w-5 h-5 mr-2" />Afslut og send</>
            )}
          </Button>

          {damages.some(d => d.status === 'pending') && (
            <p className="text-center text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
              ⚠️ Du skal acceptere eller afvise alle {damages.filter(d => d.status === 'pending').length} resterende skader
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">
            SMARTREP ApS • www.smartrep.nu • +45 8282 2572
          </p>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  )
}
