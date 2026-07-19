// Service Worker — appDrRogelioSanchez
// Maneja notificaciones de medicamentos y glucosa en segundo plano

const CACHE_NAME = 'apex-dr-v2';
const ASSETS = ['/', '/index.html'];

// ── Instalar SW ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activar y limpiar cachés viejas ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch cache-first ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Recordatorio periódico (alarma cada minuto) ──
self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_REMINDERS') {
    const reminders = event.data.reminders || [];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    reminders.forEach(r => {
      if (!r.active) return;
      if (r.times && r.times.includes(currentTime)) {
        self.registration.showNotification(r.title, {
          body: r.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: `reminder-${r.id}-${currentTime}`,
          renotify: false,
          requireInteraction: true,
          actions: [
            { action: 'done', title: '✓ Registrar' },
            { action: 'snooze', title: '⏰ Posponer 15 min' },
          ],
        });
      }
    });
  }
});

// ── Acciones al tocar notificación ──
// -- Push notifications reales (funcionan con la app cerrada) --
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = { title: 'Dr. Rogelio Sanchez', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Dr. Rogelio Sanchez';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || `push-${Date.now()}`,
    requireInteraction: true,
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'done' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        if (clientList.length > 0) {
          clientList[0].focus();
          clientList[0].postMessage({ type: 'REMINDER_DONE', reminderId: event.notification.tag });
        } else {
          clients.openWindow('/');
        }
      })
    );
  }
});
