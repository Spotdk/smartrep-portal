'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, CloudRain, Loader2 } from 'lucide-react'
import { api } from '@/lib/constants'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

const WEEKDAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

function isWorkday(date) {
  const d = new Date(date)
  return d.getDay() >= 1 && d.getDay() <= 5
}

export default function WeatherStatusWidget({ task }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPast, setShowPast] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('weatherWidgetShowPast') === 'true'
  })

  const lat = task?.latitude ?? 55.5
  const lon = task?.longitude ?? 10.4
  const hasCoords = task?.latitude != null && task?.longitude != null
  const created = task?.createdAt ? new Date(task.createdAt) : new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  useEffect(() => {
    if (!task?.id || !hasCoords) {
      setLoading(false)
      return
    }
    const start = new Date(today)
    start.setDate(start.getDate() - 30)
    const end = new Date(today)
    end.setDate(end.getDate() + 30)
    api.get(`/weather/analysis?lat=${lat}&lon=${lon}&start=${start.toISOString().slice(0, 10)}&end=${end.toISOString().slice(0, 10)}&workdaysOnly=true`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [task?.id, lat, lon, hasCoords])

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('weatherWidgetShowPast', showPast ? 'true' : 'false')
  }, [showPast])

  const addressStr = [task?.address, task?.postalCode, task?.city].filter(Boolean).join(', ') || '–'

  if (!hasCoords) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        <span className="inline-flex items-center gap-2 text-gray-500">
          <CloudRain className="w-4 h-4" />
          Vejrstatus · {addressStr}
        </span>
        <p className="mt-2 text-xs">Tilføj adresse med koordinater for at se vejrstatus (geokod opgaven).</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-5 animate-spin" />
        <span className="text-sm">Henter vejrstatus…</span>
      </div>
    )
  }

  if (error || !data?.days?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        <span className="inline-flex items-center gap-2">Vejrstatus · {addressStr}</span>
        <p className="mt-2 text-xs">Vejrdata midlertidigt utilgængelig.</p>
      </div>
    )
  }

  const allDays = data.days || []
  const todayStr = today.toISOString().slice(0, 10)
  const pastDays = allDays.filter(d => d.date < todayStr)
  const futureDays = allDays.filter(d => d.date >= todayStr).slice(0, 10)
  const pastWithData = pastDays.filter(d => d.status !== 'UNKNOWN')
  const futureWithData = futureDays.filter(d => d.status !== 'UNKNOWN')
  const pastSuccessRate = pastWithData.length ? Math.round((pastWithData.filter(d => d.status === 'GREEN').length / pastWithData.length) * 100) : 0
  const futureSuccessRate = futureWithData.length ? Math.round((futureWithData.filter(d => d.status === 'GREEN').length / futureWithData.length) * 100) : 0
  const statusIcon = (d) => (d.status === 'GREEN' ? '🟢' : d.status === 'YELLOW' ? '🟡' : d.status === 'RED' ? '🔴' : '⚪')
  const detailLine = (day) => day.status === 'UNKNOWN' ? day.status_reason : `Temp: ${day.temp_avg != null ? day.temp_avg + '°C' : '–'} · Vind: ${day.wind_max != null ? day.wind_max + ' m/s' : '–'} · Nedbør: ${day.precipitation_mm != null ? day.precipitation_mm + ' mm' : '–'} · Fugt: ${day.humidity_avg != null ? day.humidity_avg + '%' : '–'}`

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <CloudRain className="w-4 h-4 text-blue-600" />
        Vejrstatus · {addressStr}
      </div>

      <TooltipProvider>
        {showPast && pastDays.length > 0 && (
          <>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Forgangne hverdage (siden oprettelse)</span>
              <span className="font-medium text-gray-700">Snit: {pastSuccessRate}%</span>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {pastDays.slice(-14).map((day, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center min-w-[52px] p-1.5 rounded bg-gray-50 hover:bg-gray-100 cursor-default">
                      <span className="text-[10px] text-gray-500">{WEEKDAYS[new Date(day.date).getDay()]}</span>
                      <span className="text-[10px] font-medium">{day.date ? format(new Date(day.date), 'd/M', { locale: da }) : ''}</span>
                      <span className="text-base mt-0.5">{day.weather_icon || '–'}</span>
                      <span className="text-[10px]">{day.temp_avg != null ? `${day.temp_avg}°` : '–'}</span>
                      <span className="text-[10px] text-gray-500">{day.wind_max != null ? `${day.wind_max}m/s` : '–'}</span>
                      <span className="text-sm mt-0.5">{statusIcon(day)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium">{day.date ? format(new Date(day.date), 'EEEE d. MMMM', { locale: da }) : ''}</p>
                    <p>{day.weather_icon} {day.weather_desc || ''}</p>
                    <p>{detailLine(day)}</p>
                    <p className="mt-1 font-medium">{statusIcon(day)} {day.status_reason}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-2 text-center text-xs text-gray-500">—— i dag ——</div>
          </>
        )}

        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Kommende 10 hverdage</span>
          <span className="font-medium text-gray-700">Snit: {futureSuccessRate}%</span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {futureDays.map((day, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center min-w-[52px] p-1.5 rounded bg-gray-50 hover:bg-gray-100 cursor-default">
                  <span className="text-[10px] text-gray-500">{WEEKDAYS[new Date(day.date).getDay()]}</span>
                  <span className="text-[10px] font-medium">{day.date ? format(new Date(day.date), 'd/M', { locale: da }) : ''}</span>
                  <span className="text-base mt-0.5">{day.weather_icon || '–'}</span>
                  <span className="text-[10px]">{day.temp_avg != null ? `${day.temp_avg}°` : '–'}</span>
                  <span className="text-[10px] text-gray-500">{day.wind_max != null ? `${day.wind_max}m/s` : '–'}</span>
                  <span className="text-sm mt-0.5">{statusIcon(day)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{day.date ? format(new Date(day.date), 'EEEE d. MMMM', { locale: da }) : ''}</p>
                <p>{day.weather_icon} {day.weather_desc || ''}</p>
                <p>{detailLine(day)}</p>
                <p className="mt-1 font-medium">{statusIcon(day)} {day.status_reason}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowPast(!showPast)}
          className="w-full text-center text-xs text-blue-600 hover:underline py-1 flex items-center justify-center gap-1"
        >
          {showPast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showPast ? 'Skjul forgangne dage' : 'Vis forgangne dage'}
        </button>
      </TooltipProvider>
    </div>
  )
}
