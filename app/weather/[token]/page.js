'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

const BRAND_BLUE = '#0052FF'
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d53681bc-c820-4c8d-b1f0-b0733d8a656e/artifacts/fi97k95c_SMARTREP_Cirkel_2_sort.png'

export default function WeatherReportPage() {
  const params = useParams()
  const token = params.token
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [firmainfo, setFirmainfo] = useState(null)

  useEffect(() => {
    fetch('/api/firmainfo/public').then(r => r.json()).then(setFirmainfo).catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) return
    fetch(`/api/weather-report/public/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setReport(data)
      })
      .catch(() => setError('Kunne ikke indlæse rapport'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: BRAND_BLUE }} />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Rapport ikke fundet</h1>
          <p className="text-gray-600">{error || 'Ugyldigt link'}</p>
        </div>
      </div>
    )
  }

  const addressStr = [report.address, report.postalCode, report.city].filter(Boolean).join(', ') || '–'
  const periodStr = report.periodStart && report.periodEnd
    ? `${format(new Date(report.periodStart), 'd. MMM', { locale: da })} – ${format(new Date(report.periodEnd), 'd. MMM yyyy', { locale: da })}`
    : '–'
  const createdStr = report.createdAt ? format(new Date(report.createdAt), 'd. MMM yyyy', { locale: da }) : '–'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] py-10 px-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-[700px] mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="py-8 px-10 text-center" style={{ background: BRAND_BLUE }}>
          <img src={LOGO_URL} alt="SMARTREP" className="h-12 mx-auto mb-2 invert brightness-0 invert" style={{ filter: 'brightness(0) invert(1)' }} />
          <div className="text-white/90 text-sm font-medium mt-2">Vejranalyse</div>
        </div>

        <div className="p-10">
          <span className="inline-block bg-[#E3F2FD] text-[#0052FF] px-3.5 py-1.5 rounded-full text-sm font-semibold mb-5">
            📊 Baseret på DMI-data
          </span>

          <p className="text-[15px] text-[#495057] mb-6 leading-relaxed">
            Denne vejranalyse viser de faktiske vejrforhold på opgaveadressen i den valgte periode. Udendørs lakering af aluminiumsprofiler kræver specifikke vejrforhold for at sikre holdbar kvalitet.
          </p>

          {/* Opgaveoplysninger */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-[#0052FF] uppercase tracking-wider border-b-2 border-[#E3F2FD] pb-2 mb-4">Opgaveoplysninger</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#f8f9fa] p-4 rounded-lg">
                <div className="text-xs text-[#6c757d] font-medium mb-1">Kunde</div>
                <div className="font-semibold text-[#1a1a2e]">{report.companyName || '–'}</div>
              </div>
              <div className="bg-[#f8f9fa] p-4 rounded-lg">
                <div className="text-xs text-[#6c757d] font-medium mb-1">Kontakt</div>
                <div className="font-semibold text-[#1a1a2e]">{report.contactName || '–'}</div>
                {report.contactEmail && (
                  <a href={`mailto:${report.contactEmail}`} className="text-sm text-[#0052FF] hover:underline">{report.contactEmail}</a>
                )}
              </div>
              <div className="col-span-2 bg-[#f8f9fa] p-4 rounded-lg">
                <div className="text-xs text-[#6c757d] font-medium mb-1">Opgaveadresse</div>
                <div className="font-semibold text-[#1a1a2e]">{addressStr}</div>
              </div>
              <div className="bg-[#f8f9fa] p-4 rounded-lg">
                <div className="text-xs text-[#6c757d] font-medium mb-1">Sagsnr.</div>
                <div className="font-semibold text-[#1a1a2e]">{report.taskNumber || '–'}</div>
              </div>
              <div className="bg-[#f8f9fa] p-4 rounded-lg">
                <div className="text-xs text-[#6c757d] font-medium mb-1">Opgave oprettet</div>
                <div className="font-semibold text-[#1a1a2e]">{createdStr}</div>
              </div>
              <div className="col-span-2 bg-[#f8f9fa] p-4 rounded-lg">
                <div className="text-xs text-[#6c757d] font-medium mb-1">Rapportperiode</div>
                <div className="font-semibold text-[#1a1a2e]">{periodStr} <span className="text-[#495057] font-normal">({report.total_days} arbejdsdage)</span></div>
              </div>
            </div>
          </div>

          {/* Opsummering */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-[#0052FF] uppercase tracking-wider border-b-2 border-[#E3F2FD] pb-2 mb-4">Opsummering</h3>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-[#f8f9fa] rounded-lg p-4 text-center border border-[#e9ecef]">
                <div className="text-2xl font-bold text-[#1a1a2e]">{report.total_days}</div>
                <div className="text-[11px] text-[#6c757d] font-medium leading-tight">Arbejdsdage i alt</div>
              </div>
              <div className="bg-[#E8F5E9] rounded-lg p-4 text-center border border-[#C8E6C9]">
                <div className="text-2xl font-bold text-[#43A047]">{report.green_days}</div>
                <div className="text-[11px] text-[#6c757d] font-medium leading-tight">Mulige dage</div>
              </div>
              <div className="bg-[#FFF8E1] rounded-lg p-4 text-center border border-[#FFF0B3]">
                <div className="text-2xl font-bold text-[#F9A825]">{report.yellow_days}</div>
                <div className="text-[11px] text-[#6c757d] font-medium leading-tight">Marginale dage</div>
              </div>
              <div className="bg-[#FFEBEE] rounded-lg p-4 text-center border border-[#FFCDD2]">
                <div className="text-2xl font-bold text-[#C62828]">{report.red_days}</div>
                <div className="text-[11px] text-[#6c757d] font-medium leading-tight">Umulige dage</div>
              </div>
            </div>

            <div className="bg-[#f8f9fa] rounded-lg p-5">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-sm font-semibold text-[#1a1a2e]">Succesrate for udendørs lakering</span>
                <span className="text-2xl font-bold text-[#C62828]">{report.success_rate}%</span>
              </div>
              <div className="h-2.5 bg-[#e9ecef] rounded-full overflow-hidden mb-5">
                <div className="h-full rounded-full bg-[#0052FF]" style={{ width: `${report.success_rate}%` }} />
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-5">
                {(report.days || []).map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] text-[#6c757d] font-medium">
                      {day.date ? format(new Date(day.date), 'd/M', { locale: da }) : ''}
                    </span>
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{
                        background: day.status === 'GREEN' ? '#43A047' : day.status === 'YELLOW' ? '#F9A825' : day.status === 'RED' ? '#C62828' : '#9e9e9e'
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2.5">
                {report.rain_days > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C62828] flex-shrink-0" />
                    <span className="text-[#495057] flex-1">Regn (nedbør &gt; 5 mm)</span>
                    <span className="font-semibold text-[#1a1a2e]">{report.rain_days} dage</span>
                  </div>
                )}
                {report.wind_days > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C62828] flex-shrink-0" />
                    <span className="text-[#495057] flex-1">Hård vind (&gt; 5 m/s)</span>
                    <span className="font-semibold text-[#1a1a2e]">{report.wind_days} dage</span>
                  </div>
                )}
                {report.frost_days > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C62828] flex-shrink-0" />
                    <span className="text-[#495057] flex-1">Frost (temperatur &lt; 5°C)</span>
                    <span className="font-semibold text-[#1a1a2e]">{report.frost_days} dage</span>
                  </div>
                )}
                {report.yellow_days > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F9A825] flex-shrink-0" />
                    <span className="text-[#495057] flex-1">Marginal (byger / vind i grænseområde)</span>
                    <span className="font-semibold text-[#1a1a2e]">{report.yellow_days} dage</span>
                  </div>
                )}
                {report.green_days > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#43A047] flex-shrink-0" />
                    <span className="text-[#495057] flex-1">Mulig – alle kriterier opfyldt</span>
                    <span className="font-semibold text-[#1a1a2e]">{report.green_days} dage</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dagsoversigt */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-[#0052FF] uppercase tracking-wider border-b-2 border-[#E3F2FD] pb-2 mb-4">Dagsoversigt</h3>
            <div className="bg-[#f8f9fa] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8f9fa]">
                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#6c757d] uppercase">Dag</th>
                    <th className="text-center py-3.5 px-4 text-xs font-semibold text-[#6c757d] uppercase w-11">Vejr</th>
                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#6c757d] uppercase">Temp</th>
                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#6c757d] uppercase">Vind</th>
                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#6c757d] uppercase">Nedbør</th>
                    <th className="text-center py-3.5 px-4 text-xs font-semibold text-[#6c757d] uppercase w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.days || []).map((day, i) => (
                    <tr key={i} className="border-b border-[#e9ecef] bg-white" style={{ borderLeft: `3px solid ${day.status === 'GREEN' ? '#43A047' : day.status === 'YELLOW' ? '#F9A825' : day.status === 'RED' ? '#C62828' : '#9e9e9e'}` }}>
                      <td className="py-3 px-4 font-semibold text-[#1a1a2e] whitespace-nowrap">
                        {day.day_name} {day.date ? format(new Date(day.date), 'd. MMM', { locale: da }) : ''}
                      </td>
                      <td className="py-3 px-4 text-center text-xl">{day.weather_icon || '–'}</td>
                      <td className="py-3 px-4 font-medium">{day.temp_avg != null ? `${day.temp_avg}°C` : '–'}</td>
                      <td className="py-3 px-4 text-[#495057] text-[13px]">
                        {day.wind_max != null ? `${day.wind_max} m/s` : '–'}
                        {day.wind_gust != null && <span className="text-[#adb5bd] text-[11px] ml-1">({day.wind_gust})</span>}
                      </td>
                      <td className="py-3 px-4 text-[13px] text-[#495057]">{day.precipitation_mm != null ? `${day.precipitation_mm} mm` : '–'}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: day.status === 'GREEN' ? '#E8F5E9' : day.status === 'YELLOW' ? '#FFF8E1' : day.status === 'RED' ? '#FFEBEE' : '#f5f5f5',
                            color: day.status === 'GREEN' ? '#2E7D32' : day.status === 'YELLOW' ? '#E68900' : day.status === 'RED' ? '#C62828' : '#616161'
                          }}
                        >
                          {day.status === 'GREEN' ? '🟢' : day.status === 'YELLOW' ? '🟡' : day.status === 'RED' ? '🔴' : '⚪'} {day.status_reason || day.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 text-xs text-[#6c757d] bg-[#f8f9fa]">Vinddata viser gennemsnit med (vindstød) i parentes.</div>
            </div>
          </div>

          {/* Sådan læses rapporten */}
          <div>
            <h3 className="text-xs font-semibold text-[#0052FF] uppercase tracking-wider border-b-2 border-[#E3F2FD] pb-2 mb-4">Sådan læses rapporten</h3>
            <div className="bg-[#f8f9fa] rounded-lg p-6">
              <p className="text-[13px] text-[#6c757d] leading-relaxed mb-4">
                Udendørs lakering af aluminiumsprofiler kræver at følgende vejrkriterier er opfyldt samtidig for at sikre holdbar kvalitet:
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="text-[13px] text-[#495057]"><strong className="block text-[#1a1a2e] mb-0.5">🌡️ Temperatur</strong>Min. 5°C – lak hærder ikke under 5°C</div>
                <div className="text-[13px] text-[#495057]"><strong className="block text-[#1a1a2e] mb-0.5">💨 Vindstyrke</strong>Max 5 m/s – sprøjtelakering kræver stille forhold</div>
                <div className="text-[13px] text-[#495057]"><strong className="block text-[#1a1a2e] mb-0.5">🌧 Nedbør</strong>Tørvejr – fugt ødelægger lakoverfladen</div>
                <div className="text-[13px] text-[#495057]"><strong className="block text-[#1a1a2e] mb-0.5">💧 Luftfugtighed</strong>Max 85% – påvirker lakkens hærdning</div>
              </div>
              <div className="space-y-2 p-4 bg-white rounded-lg mb-4">
                <div className="flex items-center gap-2.5 text-[13px] text-[#495057]">
                  <span className="w-3 h-3 rounded-full bg-[#43A047] flex-shrink-0" />
                  <span>Alle kriterier opfyldt – fuld arbejdsdag mulig</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px] text-[#495057]">
                  <span className="w-3 h-3 rounded-full bg-[#F9A825] flex-shrink-0" />
                  <span>Marginalt – arbejde muligt men med risiko for forsinkelse</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px] text-[#495057]">
                  <span className="w-3 h-3 rounded-full bg-[#C62828] flex-shrink-0" />
                  <span>Et eller flere kriterier udenfor grænse – lakering ikke mulig</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white border border-[#e9ecef] px-3.5 py-2 rounded-lg text-xs text-[#6c757d]">
                🏛️ Data leveret af Danmarks Meteorologiske Institut (DMI)
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-6 px-10 border-t border-[#e9ecef] text-center">
          <p className="text-sm text-[#495057] mb-2">
            Spørgsmål? Kontakt os på <a href={`tel:${firmainfo?.phone || '82822572'}`} className="text-[#0052FF] font-medium hover:underline">{firmainfo?.phone || '82 82 25 72'}</a> eller <a href={`mailto:${firmainfo?.email || 'info@smartrep.nu'}`} className="text-[#0052FF] font-medium hover:underline">{firmainfo?.email || 'info@smartrep.nu'}</a>
          </p>
          <p className="text-[13px] text-[#6c757d]">{firmainfo?.companyName || 'SMARTREP'} · Finish til byggebranchen · CVR {firmainfo?.cvr || '25808436'}</p>
        </div>

        {/* Brand banner */}
        <div className="bg-[#1a1a2e] py-5 px-10 text-center rounded-b-2xl">
          <span className="block text-[11px] text-white/60 uppercase tracking-wider mb-3">Øvrige brands under SMARTREP</span>
          <div className="flex justify-center gap-3 text-[13px] font-medium">
            <a href="https://www.alupleje.dk" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white">Alupleje</a>
            <span className="text-white/30">•</span>
            <a href="https://www.colorup.dk" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white">COLOR:UP</a>
            <span className="text-white/30">•</span>
            <a href="https://www.coating.dk" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white">Coating.dk</a>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-[#adb5bd] mt-4">
        Rapport genereret {report.createdAt ? format(new Date(report.createdAt), "d. MMMM yyyy 'kl.' HH:mm", { locale: da }) : ''} · portal.smartrep.nu/weather/{token}
      </p>
    </div>
  )
}
