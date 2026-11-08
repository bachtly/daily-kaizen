import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const pub = (p: string) => resolve(__dirname, '../public', p)
const read = (p: string) => readFileSync(pub(p), 'utf8')

describe('manifest', () => {
  const m = JSON.parse(read('manifest.webmanifest'))

  it('is an installable standalone app at scope /', () => {
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
    expect(m.scope).toBe('/')
    expect(m.name).toBeTruthy()
  })

  it('lists icons that exist, including a maskable one', () => {
    const sizes = m.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
    for (const i of m.icons) expect(existsSync(pub(i.src.slice(1)))).toBe(true)
  })
})

describe('index.html', () => {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8')

  it('links the manifest and the iOS home-screen meta', () => {
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"')
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"')
    expect(existsSync(pub('icons/apple-touch-icon.png'))).toBe(true)
  })
})

describe('_headers', () => {
  const headers = read('_headers')
  const rule = (path: string) =>
    headers.split(/\r?\n(?=\S)/).find((b) => b.split(/\r?\n/)[0].trim() === path) ?? ''

  it('serves the entry points no-cache and hashed assets immutable', () => {
    for (const p of ['/', '/index.html', '/sw.js', '/manifest.webmanifest']) {
      expect(rule(p)).toContain('Cache-Control: no-cache')
    }
    expect(rule('/assets/*')).toContain('max-age=31536000, immutable')
  })
})

describe('sw-register', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  async function run(prod: boolean) {
    vi.stubEnv('PROD', prod)
    const register = vi.fn().mockResolvedValue({})
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { register } })
    const { registerServiceWorker } = await import('./sw-register.ts')
    const add = vi.spyOn(window, 'addEventListener').mockImplementation((_t, h) => {
      ;(h as () => void)()
    })
    registerServiceWorker()
    add.mockRestore()
    return register
  }

  it('registers /sw.js at scope / in production', async () => {
    expect(await run(true)).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('does nothing in development', async () => {
    expect(await run(false)).not.toHaveBeenCalled()
  })
})

describe('sw.js', () => {
  type Handler = (e: Record<string, unknown>) => void

  function load(opts: { online: boolean; hang?: boolean }) {
    const store = new Map<string, Response>()
    const handlers: Record<string, Handler> = {}
    const key = (r: string | Request) => (typeof r === 'string' ? r : new URL(r.url).pathname)
    const cache = {
      put: (r: string | Request, res: Response) => {
        store.set(key(r), res)
        return Promise.resolve()
      },
    }
    const caches = {
      open: () => Promise.resolve(cache),
      match: (r: string | Request) => Promise.resolve(store.get(key(r))?.clone()),
      keys: () => Promise.resolve(['dk-shell-v1', 'old']),
      delete: vi.fn().mockResolvedValue(true),
    }
    const net: Record<string, string> = {
      '/': '<script src="/assets/index-abc.js"></script><link href="/assets/index-abc.css">',
      '/assets/index-abc.js': 'js',
      '/assets/index-abc.css': 'css',
    }
    const fetched: string[] = []
    const fetchFn = (r: string | Request) => {
      const path = key(r)
      fetched.push(path)
      if (opts.hang) return new Promise<Response>(() => {})
      if (!opts.online || !(path in net)) return Promise.reject(new TypeError('offline'))
      return Promise.resolve(new Response(net[path]))
    }
    const self = {
      location: { origin: 'https://app.example' },
      addEventListener: (t: string, h: Handler) => (handlers[t] = h),
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() },
    }
    new Function('self', 'caches', 'fetch', read('sw.js'))(self, caches, fetchFn)
    return { handlers, store, fetched, caches, self }
  }

  const waitUntil = () => {
    let p: Promise<unknown> = Promise.resolve()
    return { fn: (x: Promise<unknown>) => (p = x), done: () => p }
  }

  it('precaches the shell and the hashed assets it references on install', async () => {
    const sw = load({ online: true })
    const w = waitUntil()
    sw.handlers.install({ waitUntil: w.fn })
    await w.done()
    expect([...sw.store.keys()].sort()).toEqual(['/', '/assets/index-abc.css', '/assets/index-abc.js'])
    expect(sw.self.skipWaiting).toHaveBeenCalled()
  })

  it('deletes old caches and claims clients on activate', async () => {
    const sw = load({ online: true })
    const w = waitUntil()
    sw.handlers.activate({ waitUntil: w.fn })
    await w.done()
    expect(sw.caches.delete).toHaveBeenCalledWith('old')
    expect(sw.caches.delete).not.toHaveBeenCalledWith('dk-shell-v1')
    expect(sw.self.clients.claim).toHaveBeenCalled()
  })

  async function respond(sw: ReturnType<typeof load>, req: Record<string, unknown>) {
    let out: Promise<Response> | undefined
    sw.handlers.fetch({ request: req, respondWith: (p: Promise<Response>) => (out = p) })
    return out
  }

  it('opens offline from the cached shell on navigation', async () => {
    const sw = load({ online: true })
    const w = waitUntil()
    sw.handlers.install({ waitUntil: w.fn })
    await w.done()
    const off = load({ online: false })
    for (const [k, v] of sw.store) off.store.set(k, v)
    const res = await respond(off, { method: 'GET', url: 'https://app.example/week', mode: 'navigate' })
    expect(await res!.text()).toContain('/assets/index-abc.js')
  })

  it('falls back to the cached shell when the network hangs past 3 s', async () => {
    vi.useFakeTimers()
    try {
      const sw = load({ online: true, hang: true })
      sw.store.set('/', new Response('cached shell'))
      const p = respond(sw, { method: 'GET', url: 'https://app.example/', mode: 'navigate' })
      await vi.advanceTimersByTimeAsync(2900)
      let settled = false
      void p.then(() => (settled = true))
      await vi.advanceTimersByTimeAsync(0)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(200)
      expect(await (await p)!.text()).toBe('cached shell')
    } finally {
      vi.useRealTimers()
    }
  })

  it('serves hashed assets from the cache first', async () => {
    const sw = load({ online: true })
    sw.store.set('/assets/index-abc.js', new Response('cached'))
    const res = await respond(sw, { method: 'GET', url: 'https://app.example/assets/index-abc.js', mode: 'no-cors' })
    expect(await res!.text()).toBe('cached')
    expect(sw.fetched).toEqual([])
  })

  it('ignores other origins and non-GET requests', async () => {
    const sw = load({ online: true })
    expect(await respond(sw, { method: 'GET', url: 'https://x.supabase.co/rest/v1/entries', mode: 'cors' })).toBeUndefined()
    expect(await respond(sw, { method: 'POST', url: 'https://app.example/assets/a.js', mode: 'cors' })).toBeUndefined()
  })
})
