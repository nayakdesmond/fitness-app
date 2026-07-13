/* Train with Dara service worker — app-shell + read caching for offline use.
   Writes are handled by the in-app IndexedDB queue, not here. */
const VERSION = 'twd-v1'
const STATIC_CACHE = `${VERSION}-static`
const PAGE_CACHE = `${VERSION}-pages`
const DATA_CACHE = `${VERSION}-data`

const PRECACHE = ['/offline', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

function isSupabaseRead(url) {
  return url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/')
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return // writes go through the app's own queue

  const url = new URL(request.url)

  // Supabase table reads: network-first, fall back to last cached response.
  if (isSupabaseRead(url)) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone()
          caches.open(DATA_CACHE).then(c => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  if (url.origin !== self.location.origin) return

  // Page navigations: network-first, fall back to cached page, then /offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone()
          caches.open(PAGE_CACHE).then(c => c.put(request, copy))
          return res
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/offline')))
    )
    return
  }

  // Static assets (_next/static, icons, etc.): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(res => {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then(c => c.put(request, copy))
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
