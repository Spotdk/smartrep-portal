'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, MapPin, Clock } from 'lucide-react'

const BRAND_BLUE = '#0052FF'
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d53681bc-c820-4c8d-b1f0-b0733d8a656e/artifacts/fi97k95c_SMARTREP_Cirkel_2_sort.png'

export default function ConfirmOrderPage() {
  const params = useParams()
  const token = params.token
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [itemChoices, setItemChoices] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [firmainfo, setFirmainfo] = useState(null)

  useEffect(() => {
    fetch('/api/firmainfo/public').then(r => r.json()).then(setFirmainfo).catch(() => {})
  }, [])

  useEffect(() => {
    if (token) {
      fetch(`/api/order-confirmation/public/${token}`)
        .then(res => res.json())
        .then(result => {
          if (result.error) setError(result.error)
          else setData(result)
        })
        .catch(() => setError('Kunne ikke indlæse ordrebekræftelse'))
        .finally(() => setLoading(false))
    }
  }, [token])

  const setChoice = (itemType, accepted) => {
    setItemChoices(prev => ({ ...prev, [itemType]: accepted }))
  }

  const riskItems = (data?.items || []).filter(i => i.type === 'glass_risk' || i.type === 'chemical_cleaning')
  const allRiskChosen = riskItems.every(i => itemChoices[i.type] === true || itemChoices[i.type] === false)
  const canConfirm = riskItems.length === 0 || allRiskChosen

  const handleSubmit = async (overallAccepted) => {
    if (!data) return
    setSubmitting(true)
    try {
      const items = (data.items || []).map(item => ({
        type: item.type,
        accepted: riskItems.some(r => r.type === item.type) ? itemChoices[item.type] : true
      }))
      const res = await fetch(`/api/order-confirmation/public/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, overall_accepted: overallAccepted })
      })
      const result = await res.json()
      if (result.success) setSubmitted(true)
      else alert(result.error || 'Der opstod en fejl')
    } catch (err) {
      alert('Der opstod en fejl')
    } finally {
      setSubmitting(false)
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
          <img src={LOGO_URL} alt="SMARTREP" className="h-12 w-auto mx-auto mb-6" />
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Linket er ugyldigt eller udløbet</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const info = data?.taskInfo || {}
  const hasExtended = (data?.items || []).some(i => i.type === 'extended_zone')
  const hasGlass = (data?.items || []).some(i => i.type === 'glass_risk')
  const hasChemical = (data?.items || []).some(i => i.type === 'chemical_cleaning')

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
          <img src={LOGO_URL} alt="SMARTREP" className="h-12 w-auto mx-auto mb-8" />
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tak for din bekræftelse</h1>
          <p className="text-gray-600">Vi har modtaget dit svar og vender tilbage hurtigst muligt.</p>
          <p className="text-sm text-gray-500 mt-6">Mvh. SMARTREP</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <img src={LOGO_URL} alt="SMARTREP" className="h-10 w-auto" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 md:p-8">
            {hasExtended && (
              <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                Udvidet serviceområde
              </span>
            )}
            <p className="text-gray-600 mb-6">
              Hej <strong>{info.contactName || 'Kunde'}</strong>,<br />
              Tak for jeres henvendelse. Vi bekræfter hermed modtagelsen af nedenstående opgave.
            </p>

            <section className="mb-8">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide border-b-2 border-blue-100 pb-2 mb-4">Opgavedetaljer</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 font-medium mb-1">Kunde</div>
                  <div className="font-semibold text-gray-900">{info.companyName || '-'}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 font-medium mb-1">Sagsnummer</div>
                  <div className="font-semibold text-gray-900">{info.taskNumber || '-'}</div>
                </div>
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500 font-medium mb-1">Adresse</div>
                  <div className="font-semibold text-gray-900">{[info.address, info.postalCode, info.city].filter(Boolean).join(', ') || '-'}</div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide border-b-2 border-blue-100 pb-2 mb-4">Reparationer vi har registreret</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                {(info.damages || []).length > 0 ? info.damages.map((d, i) => (
                  <div key={i} className="py-3 border-b border-gray-200 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-gray-900">
                      Skade #{i + 1}: {d.part || 'Skade'}{d.quantity != null && d.quantity !== 1 ? `\tAntal: ${d.quantity}` : ''}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {[d.color && d.color !== 'not_specified' && `Farve: ${d.color}`, d.location && `Placering: ${d.location}`].filter(Boolean).join(' • ')}
                    </p>
                    {d.notes ? <p className="text-sm text-gray-500 mt-1">{d.notes}</p> : null}
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">Opgave uden skadeliste</p>
                )}
              </div>
            </section>

            <section className="mb-8">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide border-b-2 border-blue-100 pb-2 mb-4">Opgave opsummering</h3>
              <div className="border-2 border-gray-200 rounded-lg p-4 min-h-[80px] bg-gray-50/50">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{data?.taskSummary?.trim() || '\u00A0'}</p>
              </div>
            </section>

            {hasExtended && data?.distance_km != null && (
              <section className="mb-8">
                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide border-b-2 border-blue-100 pb-2 mb-4">Vedrørende transport</h3>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-lg space-y-4">
                  <p className="text-sm text-gray-700">
                    Opgaven ligger i vores udvidede serviceområde. Afstand fra vores base i Fredericia til {info.city || 'adressen'} er <strong>{data.distance_km} km</strong> og ca. <strong>{Math.floor((data.drive_time_minutes || 0) / 60)} t {(data.drive_time_minutes || 0) % 60} min</strong> kørsel hver vej.
                  </p>
                  <p className="text-sm text-gray-700">
                    Standardpriser inkluderer op til 1 times kørsel hver vej; længere afstand giver transporttillæg.
                  </p>
                  {(() => {
                    const kmTotal = (data.distance_km || 0) * 2
                    const kmRate = data.transport_km_rate != null ? Number(data.transport_km_rate) : 3.75
                    const timeRate = data.transport_time_rate != null ? Number(data.transport_time_rate) : 850
                    const excessMinutesPerWay = Math.max(0, (data.drive_time_minutes || 0) - 60)
                    const excessHoursTotal = (excessMinutesPerWay * 2) / 60
                    const kmAmount = data.transport_km_amount != null ? data.transport_km_amount : Math.round(kmTotal * kmRate * (1 - (data.transport_km_discount_percent || 0) / 100))
                    const timeAmount = data.transport_time_amount != null ? data.transport_time_amount : Math.round(excessHoursTotal * timeRate * (1 - (data.transport_time_discount_percent || 0) / 100))
                    const totalAmount = data.transport_total_amount != null ? data.transport_total_amount : kmAmount + timeAmount
                    const destinationLabel = info.city ? `Fredericia – ${info.city}` : 'Fredericia – adressen'
                    const discountKm = data.transport_km_discount_percent || 0
                    const discountTime = data.transport_time_discount_percent || 0
                    return (
                      <div className="mt-4 border border-amber-200 rounded-lg overflow-hidden bg-white/60">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-amber-100/80 border-b border-amber-200">
                              <th className="text-left py-2 px-3 font-semibold text-gray-800">Post</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-800 w-24">Beløb</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-700">
                            <tr className="border-b border-amber-100">
                              <td className="py-2 px-3">
                                {destinationLabel} t/r: {kmTotal} km á {Number(kmRate).toFixed(2).replace('.', ',')} kr.
                                {discountKm > 0 && <span className="text-amber-700 ml-1">(Ekstraordinær rabat {discountKm}%)</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-medium">{kmAmount.toLocaleString('da-DK')},-</td>
                            </tr>
                            <tr className="border-b border-amber-100">
                              <td className="py-2 px-3">
                                Tid udover 1 time pr. vej: {excessHoursTotal.toFixed(1).replace('.', ',')} timer á {Number(timeRate)} kr.
                                {discountTime > 0 && <span className="text-amber-700 ml-1">(Ekstraordinær rabat {discountTime}%)</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-medium">{timeAmount.toLocaleString('da-DK')},-</td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="bg-blue-50 border-t border-amber-200 px-3 py-2">
                          <span className="font-semibold text-gray-900">Transporttillæg i alt: {totalAmount.toLocaleString('da-DK')},-</span>
                          <span className="text-gray-600 ml-1">ex. moms</span>
                        </div>
                        <p className="text-xs text-gray-600 px-3 py-2 border-t border-gray-100">
                          Bemærk: Selve reparationsarbejdet afregnes efter vores almindelige prisliste.
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </section>
            )}

            {hasGlass && (
              <section className="mb-8">
                <div className="bg-orange-50 border-2 border-amber-400 rounded-xl p-6">
                  <h4 className="font-bold text-orange-800 mb-2">Særlige vilkår for glaspolering</h4>
                  <p className="text-sm text-gray-700 mb-4">Glaspolering med risiko for begrænset succes kræver jeres accept. Vi kan ikke garantere resultat ved dybe ridser.</p>
                  {(() => {
                    const glassItem = (data?.items || []).find(i => i.type === 'glass_risk')
                    return glassItem?.customNote ? (
                      <>
                        <p className="text-sm font-semibold text-gray-800 mb-1">Glaspolering:</p>
                        <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{glassItem.customNote}</p>
                      </>
                    ) : null
                  })()}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setChoice('glass_risk', true)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${itemChoices.glass_risk === true ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-700'}`}
                    >
                      ✓ Acceptér glasvilkår
                    </button>
                    <button
                      type="button"
                      onClick={() => setChoice('glass_risk', false)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${itemChoices.glass_risk === false ? 'bg-red-600 text-white' : 'bg-white border border-red-600 text-red-700'}`}
                    >
                      Afvis glaspolering
                    </button>
                  </div>
                </div>
              </section>
            )}

            {hasChemical && (
              <section className="mb-8">
                <div className="bg-purple-50 border-2 border-purple-400 rounded-xl p-6">
                  <h4 className="font-bold text-purple-800 mb-2">Særlige vilkår for kemisk afrensning</h4>
                  <p className="text-sm text-gray-700 mb-4">Ved kemisk afrensning kan vi ikke garantere, at hvide aflejringer ikke vender tilbage. Kræver jeres accept.</p>
                  {(() => {
                    const chemItem = (data?.items || []).find(i => i.type === 'chemical_cleaning')
                    return chemItem?.customNote ? (
                      <>
                        <p className="text-sm font-semibold text-gray-800 mb-1">Kemisk afrensning:</p>
                        <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{chemItem.customNote}</p>
                      </>
                    ) : null
                  })()}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setChoice('chemical_cleaning', true)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${itemChoices.chemical_cleaning === true ? 'bg-green-600 text-white' : 'bg-white border border-green-600 text-green-700'}`}
                    >
                      ✓ Acceptér afrensningsvilkår
                    </button>
                    <button
                      type="button"
                      onClick={() => setChoice('chemical_cleaning', false)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${itemChoices.chemical_cleaning === false ? 'bg-red-600 text-white' : 'bg-white border border-red-600 text-red-700'}`}
                    >
                      Afvis afrensning
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section className="mb-8">
              <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide border-b-2 border-blue-100 pb-2 mb-4">Leveringstid</h3>
              <div className="bg-gray-50 rounded-lg p-5 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Forventet udførsel inden for 2-3 uger</h4>
                  <p className="text-sm text-gray-600 mt-1">Vejrforhold kan påvirke planlægning. Vi kontakter dig med konkret dato.</p>
                </div>
              </div>
            </section>

            <div className="text-center py-4 px-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">
                Ved accept accepteres{' '}
                <a href="/vilkaar" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">
                  SMARTREPs standardvilkår for lakeringsydelser og reklamation
                </a>
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 md:p-8 border-t">
            {riskItems.length > 0 && (
              <div className="mb-6 text-sm text-gray-600 space-y-1">
                {hasGlass && (
                  <p>Glaspolering: {itemChoices.glass_risk === true ? '✓ Accepteret' : itemChoices.glass_risk === false ? '✗ Afvist' : '○ Ikke valgt'}</p>
                )}
                {hasChemical && (
                  <p>Kemisk afrensning: {itemChoices.chemical_cleaning === true ? '✓ Accepteret' : itemChoices.chemical_cleaning === false ? '✗ Afvist' : '○ Ikke valgt'}</p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <button
                type="button"
                disabled={!canConfirm || submitting}
                onClick={() => handleSubmit(true)}
                className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '✓ Bekræft opgaven'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="w-full py-3 px-6 rounded-xl font-medium text-gray-600 border border-gray-300 hover:bg-gray-100"
              >
                Annuller hele opgaven
              </button>
            </div>
          </div>

          <footer className="px-6 py-4 border-t text-center text-sm text-gray-500">
            <p>Spørgsmål? Kontakt os på {firmainfo?.phone || '82 82 25 72'} eller {firmainfo?.email || 'info@smartrep.nu'}</p>
            <p className="mt-1">{firmainfo?.companyName || 'SMARTREP'} · CVR {firmainfo?.cvr || '25808436'}</p>
          </footer>

          <div className="bg-[#1a1a2e] py-5 px-6 text-center">
            <span className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Øvrige brands under SMARTREP</span>
            <div className="flex justify-center gap-3 text-sm">
              <a href="https://www.alupleje.dk" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">Alupleje</a>
              <span className="text-gray-500">•</span>
              <a href="https://www.colorup.dk" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">COLOR:UP</a>
              <span className="text-gray-500">•</span>
              <a href="https://www.coating.dk" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">Coating.dk</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
