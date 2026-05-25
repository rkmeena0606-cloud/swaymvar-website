const CACHE_NAME = 'swaymvar-v1'
const OFFLINE_URL = '/index.html'

const CACHE_FILES = [
  '/index.html',
  '/discover.html',
  '/profile.html',
  '/verify.html',
  '/create-profile.html',
  '/manifest.json'
]

// Install — cache all pages
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  )
})

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch — serve from cache first, fallback to network
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip Supabase and EmailJS API calls — always go to network
  const url = event.request.url
  if (
    url.includes('supabase.co') ||
    url.includes('emailjs.com') ||
    url.includes('googleapis.com') ||
    url.includes('cdn.jsdelivr')
  ) {
    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached
        return fetch(event.request)
          .then(response => {
            // Cache new HTML pages
            if (response.ok && event.request.url.includes('swaymvar.in')) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
            }
            return response
          })
          .catch(() => caches.match(OFFLINE_URL))
      })
  )
})
