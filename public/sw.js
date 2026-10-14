// Minimal service worker: lets the browser show system notifications (with the device's own sound) and focuses the app on tap.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => (l.length ? l[0].focus() : self.clients.openWindow('/'))))
})
