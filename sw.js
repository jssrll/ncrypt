// ============================================================
//  NCRYPT PWA SERVICE WORKER
//  Version: 1.0.0
// ============================================================

const CACHE_NAME = 'ncrypt-v1.0.0';
const DYNAMIC_CACHE = 'ncrypt-dynamic-v1';
const API_CACHE = 'ncrypt-api-v1';

// At the top of sw.js, update STATIC_ASSETS:
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/messaging.js',
  '/js/qrcode.js',
  '/js/profile.js',
  '/js/settings.js',
  '/js/ui.js',
  '/js/pwa.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![CACHE_NAME, DYNAMIC_CACHE, API_CACHE].includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, then network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip Google Apps Script API calls (don't cache)
  if (url.href.includes('script.google.com')) {
    return;
  }
  
  // Skip Chrome extensions
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // HTML - Network first, then cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, clonedResponse));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/index.html');
            });
        })
    );
    return;
  }
  
  // Static assets - Cache first, then network
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.includes('/icons/')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Update cache in background
            fetch(request)
              .then((response) => {
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(request, response));
              })
              .catch(() => {});
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              const clonedResponse = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, clonedResponse));
              return response;
            });
        })
    );
    return;
  }
  
  // Default - Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clonedResponse = response.clone();
        caches.open(DYNAMIC_CACHE)
          .then((cache) => cache.put(request, clonedResponse));
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'ncrypt',
    body: 'You have a new message',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Open'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ],
      requireInteraction: true,
      renotify: true,
      tag: 'ncrypt-message'
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncOfflineMessages());
  }
});

// Sync offline messages
async function syncOfflineMessages() {
  try {
    const cache = await caches.open('ncrypt-offline-messages');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const data = await response.json();
      
      try {
        await fetch(request.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        await cache.delete(request);
      } catch (err) {
        console.error('[SW] Failed to sync message:', err);
      }
    }
  } catch (err) {
    console.error('[SW] Sync error:', err);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-messages') {
    event.waitUntil(checkForNewMessages());
  }
});

// Check for new messages in background
async function checkForNewMessages() {
  try {
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage({
        type: 'BACKGROUND_CHECK',
        timestamp: Date.now()
      });
    }
  } catch (err) {
    console.error('[SW] Periodic sync error:', err);
  }
}

// Message event from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message from client:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SAVE_OFFLINE_MESSAGE') {
    const { url, data } = event.data;
    
    event.waitUntil(
      caches.open('ncrypt-offline-messages')
        .then((cache) => {
          const request = new Request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const response = new Response(JSON.stringify(data));
          return cache.put(request, response);
        })
        .then(() => {
          // Register background sync
          return self.registration.sync.register('sync-messages');
        })
    );
  }
});