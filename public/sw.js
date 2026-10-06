const CACHE_NAME = 'mojastavba-pwa-v3';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon-only.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Externé zdroje (napríklad Google Fonts) necháva service worker na
  // prehliadač. Ne patria do lokálnej aplikačnej cache a ich zachytenie
  // spôsobovalo CSP chybu aj neplatný fallback bez Response objektu.
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(async () => (await caches.match('/')) || Response.error())
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || Response.error())
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'MojaStavba';
  const options = {
    body: payload.body || 'Máte nové upozornenie.',
    icon: '/pwa-icon-192.png',
    badge: '/icon-only.png',
    tag: payload.tag || 'mojastavba-notification',
    renotify: Boolean(payload.renotify),
    data: {
      url: payload.url || '/#/kalendar',
      taskId: payload.taskId || null
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/#/kalendar', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ('navigate' in client) await client.navigate(targetUrl);
        return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    })
  );
});
