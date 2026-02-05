/**
 * Vejranalyse – klassifikation for udendørs lakering (SMARTREP).
 * Kriterier: temp ≥ 5°C, vind ≤ 5 m/s, nedbør nuanceret, fugtighed ≤ 85%.
 */

/**
 * Nedbør-klassifikation (mm/dag)
 * 0 = DRY, 0.1–1 = LIGHT, 1.1–5 = SHOWERS, >5 = RAIN
 */
export function classifyRain(precipitationMm) {
  const mm = Number(precipitationMm) ?? 0
  if (mm === 0) return { code: 'DRY', label: 'Tørt', icon: '🟢' }
  if (mm <= 1.0) return { code: 'LIGHT', label: 'Let byge', icon: '🟡' }
  if (mm <= 5.0) return { code: 'SHOWERS', label: 'Byger', icon: '🟠' }
  return { code: 'RAIN', label: 'Regn', icon: '🔴' }
}

/**
 * Samlet dagsvurdering for lakering.
 * @param {{ temp_avg?: number, wind_max?: number, precipitation_mm?: number, humidity_avg?: number }} weather
 * @returns {{ status: 'GREEN'|'YELLOW'|'RED', icon: string, reason: string }}
 */
export function classifyDay(weather) {
  const temp_avg = Number(weather?.temp_avg) ?? 10
  const wind_max = Number(weather?.wind_max) ?? 0
  const precipitation_mm = Number(weather?.precipitation_mm) ?? 0
  const humidity_avg = Number(weather?.humidity_avg) ?? 70

  // 🔴 RØD – umuligt
  if (temp_avg < 5) return { status: 'RED', icon: '🔴', reason: 'Frost/kulde' }
  if (wind_max > 8) return { status: 'RED', icon: '🔴', reason: 'Storm' }
  if (precipitation_mm > 5) return { status: 'RED', icon: '🔴', reason: 'Regn' }
  if (humidity_avg > 85) return { status: 'RED', icon: '🔴', reason: 'Høj luftfugtighed' }

  // 🟡 GUL – marginalt
  if (wind_max > 5) return { status: 'YELLOW', icon: '🟡', reason: 'Hård vind' }
  if (temp_avg < 8) return { status: 'YELLOW', icon: '🟡', reason: 'Lav temperatur' }
  if (precipitation_mm > 1) return { status: 'YELLOW', icon: '🟡', reason: 'Byger' }
  if (precipitation_mm > 0) return { status: 'YELLOW', icon: '🟡', reason: 'Let nedbør' }
  if (humidity_avg > 75) return { status: 'YELLOW', icon: '🟡', reason: 'Høj fugtighed' }

  // 🟢 GRØN
  return { status: 'GREEN', icon: '🟢', reason: 'Gode forhold' }
}

/** Succesrate = (antal grønne dage / arbejdsdage) * 100. Kun 🟢 tælles. */
export function successRate(greenCount, totalWorkdays) {
  if (!totalWorkdays) return 0
  return Math.round((greenCount / totalWorkdays) * 100)
}
