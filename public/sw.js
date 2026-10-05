/* WatchTrading service worker.
 *
 * Owned by the build: Astro copies this file to /sw.js as-is. It handles the
 * app shell (offline + installability) and web push delivery.
 *
 * API responses are deliberately never cached: they are per-user and
 * authenticated, so serving one from a cache could show another account's data.
 */

const VERSION = 'v1';
const SHELL_CACHE = `wt-shell-${VERSION}`;
const ASSET_CACHE = `wt-assets-${VERSION}`;
const OFFLINE_URL = '/index.html';

const SHELL_URLS = [OFFLINE_URL, '/manifest.webmanifest', '/favicon.svg', '/pwa-192x192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('wt-') && key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isHashedAsset(url) {
  return url.pathname.startsWith('/_astro/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authenticated API traffic: straight to the network, never cached.
  if (isApiRequest(url)) return;

  // Navigations: network first so users always get fresh HTML, with the cached
  // shell as the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // Content-hashed build assets never change, so cache-first is safe.
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else (icons, manifest): cache-first with a network fallback.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached ?? Response.error()),
    ),
  );
});

// ── Web push ────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'WatchTrading';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || 'wt-notification',
    data: { url: payload.url || '/' },
    requireInteraction: !!payload.requireInteraction,
  };

  if (payload.silent) {
    event.waitUntil(
      self.registration.getNotifications().then((existing) =>
        Promise.all(existing.map((n) => n.close())),
      ),
    );
    return;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab of the app rather than opening a new one.
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});