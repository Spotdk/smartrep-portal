// Service Worker for Web Push Notifications
// SMARTREP Portal

const CACHE_NAME = 'smartrep-v1'
const BRAND_COLOR = '#0133ff'

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('SMARTREP Service Worker installed')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('SMARTREP Service Worker activated')
  event.waitUntil(clients.claim())
})

// Push notification received
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)
  
  let data = {
    title: 'SMARTREP',
    body: 'Du har en ny besked',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'smartrep-notification',
    data: { url: '/' }
  }
  
  if (event.data) {
    try {
      const payload = event.data.json()
      data = {
        title: payload.title || 'SMARTREP',
        body: payload.body || 'Du har en ny besked',
        icon: payload.icon || '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: payload.tag || 'smartrep-notification',
        data: { 
          url: payload.url || '/',
          messageId: payload.messageId,
          taskId: payload.taskId
        },
        actions: payload.actions || [
          { action: 'view', title: 'Åbn', icon: '/icons/check.png' },
          { action: 'dismiss', title: 'Afvis', icon: '/icons/close.png' }
        ],
        vibrate: [200, 100, 200],
        requireInteraction: true
      }
    } catch (e) {
      console.error('Error parsing push data:', e)
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      actions: data.actions,
      vibrate: data.vibrate,
      requireInteraction: data.requireInteraction
    })
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()
  
  const url = event.notification.data?.url || '/'
  
  if (event.action === 'dismiss') {
    return
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: url,
              data: event.notification.data
            })
            return
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Background sync for offline message queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-messages') {
    event.waitUntil(sendQueuedMessages())
  }
})

async function sendQueuedMessages() {
  // This would sync any messages that were queued while offline
  console.log('Syncing queued messages...')
}
