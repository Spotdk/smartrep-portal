import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Formatér adresse til visning – håndterer både streng og objekt {street, postalCode, city} */
export function formatAddress(addr) {
  if (addr == null) return ''
  if (typeof addr === 'string') return addr
  if (typeof addr === 'object') {
    const s = addr.street || addr.vejnavn || addr.address || ''
    const p = addr.postalCode || addr.postnr || ''
    const c = addr.city || ''
    return [s, p, c].filter(Boolean).join(', ') || ''
  }
  return ''
}

/** Byg fuld adressestring fra task (address kan være streng eller objekt) */
export function taskAddressString(task) {
  if (!task) return ''
  const addr = formatAddress(task.address) || [task.postalCode, task.city].filter(Boolean).join(' ')
  if (addr) return addr
  return [task.postalCode, task.city].filter(Boolean).join(' ') || '—'
}
