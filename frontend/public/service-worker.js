// One-release migration worker for visitors controlled by the former CRA PWA.
// The current site does not register a service worker. Replacing the old worker
// at the same URL lets the browser retire its cache-first app shell on update.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim()
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
    await self.registration.unregister()
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    await Promise.allSettled(windows.map(client => client.navigate(client.url)))
  })())
})
