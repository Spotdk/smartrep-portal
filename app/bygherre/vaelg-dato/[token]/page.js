'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Calendar, MapPin, Clock, Send, Loader2, Key, Home, Lock } from 'lucide-react'

const BRAND_BLUE = '#0133ff'
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d53681bc-c820-4c8d-b1f0-b0733d8a656e/artifacts/fi97k95c_SMARTREP_Cirkel_2_sort.png'

export default function VaelgDatoPage() {
  const params = useParams()
  const token = params.token

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDates, setSelectedDates] = useState([])
  const [noDatesWork, setNoDatesWork] = useState(false)
  const [accessMethod, setAccessMethod] = useState(null)
  const [keyLocation, setKeyLocation] = useState('')
  const [alternativeDates, setAlternativeDates] = useState('')
  const [phone, setPhone] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      fetch(`/api/bygherre/public/${token}`)
        .then(res => res.json())
        .then(result => {
          if (result.error) {
            setError(result.error)
          } else {
            setData(result)
            if (result.hasResponded) {
              setIsSubmitted(true)
            }
          }
        })
        .catch(() => setError('Kunne ikke indlæse data'))
        .finally(() => setLoading(false))
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!noDatesWork && selectedDates.length === 0) {
      alert('Vælg venligst mindst én dato eller marker at ingen datoer passer')
      return
    }
    if (!noDatesWork && !accessMethod) {
      alert('Angiv venligst hvordan vi får adgang til huset')
      return
    }
    if (accessMethod === 'key' && !keyLocation.trim()) {
      alert('Angiv venligst hvor nøglen placeres')
      return
    }

    setIsSubmitting(true)
    
    try {
      const res = await fetch(`/api/bygherre/public/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed: !noDatesWork,
          selectedDates: noDatesWork ? [] : selectedDates,
          accessMethod: noDatesWork ? null : accessMethod,
          keyLocation: accessMethod === 'key' ? keyLocation : null,
          alternativeDates: noDatesWork ? alternativeDates : null,
          phone,
          remarks
        })
      })
      
      const result = await res.json()
      if (result.success) {
        setIsSubmitted(true)
      } else {
        alert(result.error || 'Der opstod en fejl')
      }
    } catch (err) {
      alert('Der opstod en fejl ved afsendelse')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleDateSelection = (index) => {
    if (noDatesWork) return
    setSelectedDates(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  // Format date nicely in Danish
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']
    const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']
    return `${days[date.getDay()]} d. ${date.getDate()}. ${months[date.getMonth()]}`
  }

  const formatTimeSlot = (slot) => {
    switch(slot) {
      case '08-10': return '08:00 - 10:00'
      case '10-12': return '10:00 - 12:00'
      case '12-14': return '12:00 - 14:00'
      case '08-14': return '08:00 - 14:00'
      default: return slot
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
          <img src={LOGO_URL} alt="SMARTREP" className="h-12 w-auto mx-auto mb-8" />
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Linket er ugyldigt</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
          <img src={LOGO_URL} alt="SMARTREP" className="h-12 w-auto mx-auto mb-8" />
          
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tak – vi har modtaget jeres svar</h1>
          <p className="text-gray-600">Vi planlægger nu den endelige udførsel og vender tilbage snarest.</p>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">Mvh. SMARTREP</p>
            <p className="text-sm text-gray-400">Finish til byggebranchen</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <img src={LOGO_URL} alt="SMARTREP" className="h-10 w-auto" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Title Card */}
        <div className="rounded-2xl p-6 mb-6 text-white" style={{ backgroundColor: BRAND_BLUE }}>
          <h1 className="text-2xl font-bold mb-2">Udførsel af opgave</h1>
          <div className="flex items-center gap-2 text-white/90">
            <MapPin className="w-5 h-5" />
            <span>{data?.taskInfo?.address}, {data?.taskInfo?.postalCode} {data?.taskInfo?.city}</span>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <p className="text-gray-700 mb-4">
            Hej <span className="font-semibold">{data?.taskInfo?.owner1Name || 'Husejer'}</span>
          </p>
          <p className="text-gray-600 mb-4">
            Vedrørende sagen fra <span className="font-semibold">{data?.taskInfo?.companyName}</span> har vi nu mulighed for at planlægge udførsel.
          </p>
          {data?.taskInfo?.taskSummary && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Opgave opsummering</p>
              <p className="text-gray-700 whitespace-pre-wrap">{data.taskInfo.taskSummary}</p>
            </div>
          )}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-gray-600 text-sm">
              Da dele af opgaven <span className="font-medium">kræver adgang til huset</span>, er det nødvendigt, at der enten er nogen hjemme, eller at der lægges en nøgle.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Date Selection Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: BRAND_BLUE }} />
              Vælg én eller flere datoer der passer jer
            </h2>
            
            <div className="space-y-3 mb-4">
              {data?.proposedDates?.map((dateItem, index) => (
                <label 
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    noDatesWork 
                      ? 'opacity-50 cursor-not-allowed border-gray-200' 
                      : selectedDates.includes(index) 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDates.includes(index)}
                    onChange={() => toggleDateSelection(index)}
                    disabled={noDatesWork}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    selectedDates.includes(index) ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {selectedDates.includes(index) && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{formatDate(dateItem.date)}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>Estimeret ankomst: {formatTimeSlot(dateItem.timeSlot)}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* No dates work */}
            <div className="border-t pt-4">
              <label 
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  noDatesWork 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={noDatesWork}
                  onChange={() => {
                    setNoDatesWork(!noDatesWork)
                    if (!noDatesWork) {
                      setSelectedDates([])
                      setAccessMethod(null)
                    }
                  }}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  noDatesWork ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                }`}>
                  {noDatesWork && <XCircle className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Ingen af ovenstående datoer passer</p>
                  <p className="text-sm text-gray-500">Vi kontakter dig med nye forslag</p>
                </div>
              </label>

              {noDatesWork && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forslag til datoer der passer jer:
                  </label>
                  <textarea
                    value={alternativeDates}
                    onChange={(e) => setAlternativeDates(e.target.value)}
                    placeholder="F.eks. 'Uge 5 passer godt' eller 'Tirsdage og torsdage'"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Access Method Card - only show if dates are selected */}
          {!noDatesWork && selectedDates.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" style={{ color: BRAND_BLUE }} />
                Adgang til huset
              </h2>
              
              <div className="space-y-3">
                {/* Option: Home */}
                <label 
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    accessMethod === 'home' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="access"
                    value="home"
                    checked={accessMethod === 'home'}
                    onChange={() => setAccessMethod('home')}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    accessMethod === 'home' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {accessMethod === 'home' && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <Home className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Vi er hjemme</p>
                    <p className="text-sm text-gray-500">Der vil være nogen til at lukke teknikeren ind</p>
                  </div>
                </label>

                {/* Option: Key */}
                <label 
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    accessMethod === 'key' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="access"
                    value="key"
                    checked={accessMethod === 'key'}
                    onChange={() => setAccessMethod('key')}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    accessMethod === 'key' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {accessMethod === 'key' && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <Key className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Vi lægger en nøgle</p>
                    <p className="text-sm text-gray-500">Angiv hvor nøglen placeres</p>
                  </div>
                </label>

                {accessMethod === 'key' && (
                  <div className="ml-10 p-4 bg-gray-50 rounded-xl">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hvor placeres nøglen?
                    </label>
                    <input
                      type="text"
                      value={keyLocation}
                      onChange={(e) => setKeyLocation(e.target.value)}
                      placeholder="F.eks. 'Bag plantekrukken ved hoveddøren'"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Lock className="w-3 h-3" />
                      <span>Oplysningen sendes krypteret</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Info - Optional */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Kontaktoplysninger <span className="font-normal text-gray-400">(Valgfrit)</span></h2>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefonnummer"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Evt. bemærkninger..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (!noDatesWork && (selectedDates.length === 0 || !accessMethod))}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
              !isSubmitting && (noDatesWork || (selectedDates.length > 0 && accessMethod))
                ? 'text-white hover:opacity-90 shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            style={!isSubmitting && (noDatesWork || (selectedDates.length > 0 && accessMethod)) ? { backgroundColor: BRAND_BLUE } : {}}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sender...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send svar
              </>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <img src={LOGO_URL} alt="SMARTREP" className="h-6 w-auto mx-auto mb-2 opacity-40" />
          <p className="text-sm text-gray-400">Finish til byggebranchen</p>
        </div>
      </footer>
    </div>
  )
}
