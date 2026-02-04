'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { api, BRAND_BLUE } from '@/lib/constants'

export default function WeatherView() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('Fredericia')

  useEffect(() => { 
    setLoading(true)
    api.get(`/weather?city=${city}`)
      .then(setWeather)
      .catch(console.error)
      .finally(() => setLoading(false)) 
  }, [city])

  const cities = ['Fredericia', 'København', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg']

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vejrudsigt</h2>
          <p className="text-gray-500">Plan arbejde baseret på vejret</p>
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weather?.forecast?.map((day, idx) => (
          <Card key={idx} className={idx === 0 ? 'ring-2' : ''} style={idx === 0 ? { borderColor: BRAND_BLUE } : {}}>
            <CardContent className="p-4 text-center">
              <p className="font-medium text-sm">{day.day}</p>
              <div className="text-4xl my-4">{day.icon}</div>
              <p className="text-2xl font-bold">{day.temp}°</p>
              <p className="text-xs text-gray-500 mt-1 capitalize">{day.condition?.replace('_', ' ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}