// App-shell service worker. Registered at /sw.js with scope /, which pushManager.subscribe also needs.
// Declarative Web Push (iOS 18.4+) needs no push handler here.
const CACHE = 'dk-shell-v1'
const NAV_TIMEOUT_MS = 3000

// Cache the shell and the hashed assets it references so the app opens offline after one visit.
async function precache() {
  const cache = await caches.open(CACHE)
  const res = await fetch('/', { cache: 'reload' })
  if (!res.ok) throw new Error('shell fetch failed')
  const html = await res.clone().text()
  await cache.put('/', res)
  const assets = [...new Set(html.match(/\/assets\/[^"'\s)]+/g) ?? [])]
  await Promise.all(
    assets.map(async (url) => {
      try {
        const r = await fetch(url)
        if (r.ok) await cache.put(url, r)
      } catch {
        // the runtime cache fills it on first use
      }
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Never touch Supabase or any other origin.
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    // Network first so a deploy shows up, but on a weak signal open the cached shell after 3 s (G2).
    event.respondWith(
      (async () => {
        const cached = await caches.match('/', { ignoreVary: true })
        const net = fetch(req).then(async (res) => {
          if (res.ok) (await caches.open(CACHE)).put('/', res.clone())
          return res
        })
        if (!cached) return net.catch(() => Response.error())
        const slow = new Promise((resolve) => setTimeout(() => resolve(cached), NAV_TIMEOUT_MS))
        return Promise.race([net.catch(() => cached), slow])
      })(),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    // Hashed file names never change, so cache first.
    event.respondWith(
      caches.match(req, { ignoreVary: true }).then(
        (hit) =>
          hit ??
          fetch(req).then(async (res) => {
            if (res.ok) (await caches.open(CACHE)).put(req, res.clone())
            return res
          }),
      ),
    )
  }
})
