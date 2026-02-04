// Shared constants and utilities for SMARTREP

export const BRAND_BLUE = '#0133ff'
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

export const STATUS_CONFIG = {
  'awaiting_confirmation': { label: 'Afventer bekræftelse', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  'under_planning': { label: 'Under planlægning', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  'planned': { label: 'Planlagt', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  'cancelled': { label: 'Aflyst', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  'standby': { label: 'Standby', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  'completed': { label: 'Udført', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
  'archived': { label: 'Arkiveret', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50' }
}

export const getIdDaysColor = (days) => {
  if (days <= 10) return 'text-gray-900'
  if (days <= 14) return 'text-orange-600'
  return 'text-red-600'
}

/** Hex farve til baggrund/farve (badges) for ID-dage */
export const getIdDaysBgColor = (days) => {
  if (days <= 10) return '#111827'
  if (days <= 14) return '#ea580c'
  return '#dc2626'
}

// API Helper
export const api = {
  async fetch(endpoint, options = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('smartrep_token') : null
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
    const response = await fetch(`/api${endpoint}`, { ...options, headers })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || data.details || 'API fejl')
    return data
  },
  get: (endpoint) => api.fetch(endpoint),
  post: (endpoint, body) => api.fetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => api.fetch(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => api.fetch(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => api.fetch(endpoint, { method: 'DELETE' })
}

// Web Push Notification Manager
export const pushNotificationManager = {
  async init() {
    if (typeof window === 'undefined') return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported')
      return false
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      return registration
    } catch (err) {
      console.error('Service Worker registration failed:', err)
      return false
    }
  },
  
  async requestPermission() {
    if (typeof window === 'undefined') return false
    if (!('Notification' in window)) {
      console.log('Notifications not supported')
      return false
    }
    
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  },
  
  async subscribe() {
    try {
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      
      if (!subscription) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY || ''
        if (vapidPublicKey) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidPublicKey
          })
        }
      }
      
      return subscription
    } catch (err) {
      console.error('Push subscription failed:', err)
      return null
    }
  },
  
  async sendToServer(subscription, userId) {
    try {
      await api.post('/push-subscriptions', {
        subscription: JSON.stringify(subscription),
        userId
      })
    } catch (err) {
      console.error('Failed to save push subscription:', err)
    }
  }
}
