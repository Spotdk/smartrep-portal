'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Calendar, MapPin, Clock, Send, Loader2 } from 'lucide-react'

const BRAND_BLUE = '#0133ff'
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d53681bc-c820-4c8d-b1f0-b0733d8a656e/artifacts/fi97k95c_SMARTREP_Cirkel_2_sort.png'

export default function BekraeftDatoPage() {
  const params = useParams()
  const token = params.token

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [alternativeDates, setAlternativeDates] = useState('')
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
    if (!selectedOption) return

    setIsSubmitting(true)
    
    try {
      const res = await fetch(`/api/bygherre/public/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed: selectedOption === 'confirm',
          alternativeDates: selectedOption === 'decline' ? alternativeDates : null,
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

  // Format date nicely in Danish
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
    const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']
    return `${days[date.getDay()]} den ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`
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

  const proposedDate = data?.proposedDates?.[0]

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
          <img src={LOGO_URL} alt="SMARTREP" className="h-12 w-auto mx-auto mb-8" />
          
          {selectedOption === 'confirm' || data?.hasResponded ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Tak for din bekræftelse!</h1>
              <p className="text-gray-600 mb-2">Din aftale er nu registreret.</p>
              {proposedDate && (
                <div className="bg-gray-50 rounded-xl p-4 mt-6">
                  <p className="text-sm text-gray-500 mb-1">Bekræftet dato</p>
                  <p className="font-semibold text-gray-900">{formatDate(proposedDate.date)}</p>
                  <p style={{ color: BRAND_BLUE }}>Ankomst: {formatTimeSlot(proposedDate.timeSlot)}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-12 h-12 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Tak for dit svar!</h1>
              <p className="text-gray-600">Vi kontakter dig hurtigst muligt for at finde en ny dato.</p>
            </>
          )}
          
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
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-gray-600 text-sm">
              Opgaven udføres udvendigt på huset, og det er derfor <span className="font-medium">ikke nødvendigt, at der er nogen hjemme</span>.
            </p>
          </div>
        </div>

        {/* Proposed Date Card */}
        {proposedDate && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: BRAND_BLUE }} />
              Foreslået dato
            </h2>
            <div className="rounded-xl p-5 border-2" style={{ backgroundColor: `${BRAND_BLUE}08`, borderColor: `${BRAND_BLUE}30` }}>
              <p className="text-xl font-bold text-gray-900 mb-2">{formatDate(proposedDate.date)}</p>
              <div className="flex items-center gap-2" style={{ color: BRAND_BLUE }}>
                <Clock className="w-5 h-5" />
                <span className="font-medium">Forventet ankomst: {formatTimeSlot(proposedDate.timeSlot)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Response Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dit svar</h2>
            
            {/* Option: Confirm */}
            <label 
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all mb-3 ${
                selectedOption === 'confirm' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
              }`}
            >
              <input
                type="radio"
                name="response"
                value="confirm"
                checked={selectedOption === 'confirm'}
                onChange={() => setSelectedOption('confirm')}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedOption === 'confirm' ? 'border-green-500 bg-green-500' : 'border-gray-300'
              }`}>
                {selectedOption === 'confirm' && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Bekræft dato</p>
                <p className="text-sm text-gray-500">Jeg bekræfter den foreslåede dato</p>
              </div>
              <CheckCircle className={`w-6 h-6 ${selectedOption === 'confirm' ? 'text-green-500' : 'text-gray-300'}`} />
            </label>

            {/* Option: Decline */}
            <label 
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedOption === 'decline' 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
              }`}
            >
              <input
                type="radio"
                name="response"
                value="decline"
                checked={selectedOption === 'decline'}
                onChange={() => setSelectedOption('decline')}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedOption === 'decline' ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
              }`}>
                {selectedOption === 'decline' && <XCircle className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Datoen passer os ikke</p>
                <p className="text-sm text-gray-500">Kontakt os venligst for at finde en ny dato</p>
              </div>
              <XCircle className={`w-6 h-6 ${selectedOption === 'decline' ? 'text-orange-500' : 'text-gray-300'}`} />
            </label>

            {/* Alternative dates field */}
            {selectedOption === 'decline' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notér gerne forslag til datoer, der passer jer:
                </label>
                <textarea
                  value={alternativeDates}
                  onChange={(e) => setAlternativeDates(e.target.value)}
                  placeholder="F.eks. 'Uge 5 passer godt' eller 'Tirsdage og torsdage efter kl. 12'"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Remarks - Optional */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Bemærkninger <span className="font-normal text-gray-400">(Valgfrit)</span></h2>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Skriv evt. en bemærkning til os..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedOption || isSubmitting}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
              selectedOption && !isSubmitting
                ? 'text-white hover:opacity-90 shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            style={selectedOption && !isSubmitting ? { backgroundColor: BRAND_BLUE } : {}}
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

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Bemærk: Aftalen er først gældende, når den er bekræftet via denne side.
        </p>
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
