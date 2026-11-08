/** Registers the app-shell service worker at /sw.js with scope /. Production builds only. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => {
      console.error('service worker registration failed', e)
    })
  })
}
