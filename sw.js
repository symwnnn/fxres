/**
 * FX Risk Exposure Simulator - Service Worker
 * 
 * This service worker caches application assets for offline use
 * and provides fallback behavior when the network is unavailable.
 */

const CACHE_NAME = 'fxres-v1';
const CACHE_FILES = [
  // Core files
  '/',
  '/index.html',
  '/input.html',
  '/results.html',
  '/css/styles.css',
  '/js/state.js',
  '/js/simulation.js',
  '/js/export.js',
  
  // External dependencies
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  
  // Icons and images
  '/images/logo-192x192.png',
  '/images/logo-512x512.png',
  '/images/favicon.ico',
  
  // Manifest
  '/manifest.json'
];

// Install event - cache all static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Wait until the cache is populated
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Remove previous cached data if it exists
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, falling back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    // For API requests, try network first, then cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If the response is good, clone it and store it in the cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // If network fails, try to get it from the cache
          return caches.match(event.request)
            .then((response) => {
              // Return cached response or a fallback
              return response || new Response(JSON.stringify({
                error: 'You are offline and no cached data is available.'
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
  } else {
    // For static assets, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached response if found
          if (response) {
            return response;
          }
          
          // Otherwise, fetch from network
          return fetch(event.request)
            .then((response) => {
              // Check if we received a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response
              const responseToCache = response.clone();
              
              // Cache the response for future use
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(() => {
              // If both cache and network fail, return a fallback response
              if (event.request.headers.get('accept').includes('text/html')) {
                // For HTML pages, return the offline page
                return caches.match('/offline.html');
              }
              
              // For other file types, return a generic error
              return new Response('You are offline and this resource is not cached.');
            });
        })
    );
  }
});

// Background sync for offline data sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[Service Worker] Background syncing data...');
    // In a real app, you would implement your sync logic here
    // For example, sync form submissions that were made offline
  }
});

// Push notification event listener
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  
  const title = 'FX Risk Exposure Simulator';
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/images/logo-192x192.png',
    badge: '/images/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.');
  
  event.notification.close();
  
  // Handle the notification click
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Handle app installation prompt
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('👍', 'beforeinstallprompt', event);
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  event.preventDefault();
  // Stash the event so it can be triggered later
  const deferredPrompt = event;
  // Show the install prompt (you would call this from your UI)
  // showInstallPromotion();
  // Wait for the user to respond to the prompt
  // deferredPrompt.userChoice.then((choiceResult) => {
  //   if (choiceResult.outcome === 'accepted') {
  //     console.log('User accepted the install prompt');
  //   } else {
  //     console.log('User dismissed the install prompt');
  //   }
  //   deferredPrompt = null;
  // });
});
