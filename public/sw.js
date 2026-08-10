const CACHE_NAME = 'budget-bro-v3';
const SHARE_CACHE = 'budget-bro-share';
const SHARE_KEY = '/__shared-receipt';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== SHARE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function redirectTo(path) {
  return new Response('', {
    status: 303,
    headers: { Location: new URL(path, self.location.origin).href }
  });
}

async function handleShare(request) {
  try {
    const formData = await request.formData();
    let file = formData.get('receipt');
    if (!file || typeof file === 'string') {
      // Some apps use a different field name — take the first file we find.
      for (const value of formData.values()) {
        if (value && typeof value !== 'string') { file = value; break; }
      }
    }
    if (file && typeof file !== 'string') {
      const cache = await caches.open(SHARE_CACHE);
      await cache.put(
        SHARE_KEY,
        new Response(file, {
          headers: {
            'content-type': file.type || 'image/jpeg',
            'x-file-name': (file.name || 'receipt').replace(/[^\w.\-]/g, '_')
          }
        })
      );
      return redirectTo('/expenses?shared=1');
    }
  } catch (e) {
    // fall through
  }
  return redirectTo('/expenses?shared=error');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/share-target') {
    if (event.request.method === 'POST') {
      event.respondWith(handleShare(event.request));
      return;
    }
    event.respondWith(redirectTo('/expenses?shared=1'));
    return;
  }
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
