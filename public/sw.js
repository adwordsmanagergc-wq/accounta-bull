// Accounta-Bull service worker — handles Web Push while the app is closed.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || '⚡ Charge Call'
  const options = {
    body: data.body || 'Time to charge.',
    icon: data.icon || '/icon-192.png',
    // Android draws the badge from its alpha only, so this must be a transparent
    // silhouette (a solid icon here renders as a white box).
    badge: '/badge-96.png',
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
