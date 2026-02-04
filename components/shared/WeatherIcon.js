'use client'

import { Sun, CloudRain, CloudSun } from 'lucide-react'

export default function WeatherIcon({ type, className = "w-5 h-5" }) {
  switch (type) {
    case 'rain': return <CloudRain className={className} />
    case 'sun': return <Sun className={className} />
    default: return <CloudSun className={className} />
  }
}
