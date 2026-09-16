const CACHE_NAME = 'budget-bro-v5';
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
    const formData = await request.clone().formData();
    const candidates = [
      ...formData.getAll('receipt'),
      ...formData.getAll('file'),
      ...formData.getAll('files'),
      ...Array.from(formData.values()),
    ];
    const file = candidates.find(
      (value) => value && typeof value !== 'string' && typeof value.size === 'number' && value.size > 0
    );

    if (file && typeof file !== 'string') {
      const name = (file.name || 'receipt.jpg').replace(/[^\w.\-]/g, '_');
      const lowerName = name.toLowerCase();
      const declaredType = String(file.type || '').toLowerCase();
      const type = declaredType === 'application/pdf' || declaredType.startsWith('image/')
        ? declaredType
        : lowerName.endsWith('.pdf')
          ? 'application/pdf'
          : lowerName.endsWith('.png')
            ? 'image/png'
            : lowerName.endsWith('.webp')
              ? 'image/webp'
              : 'image/jpeg';
      const body = typeof file.arrayBuffer === 'function'
        ? await file.arrayBuffer()
        : await new Response(file).arrayBuffer();
      if (!body.byteLength) return redirectTo('/expenses?shared=error');
      const cache = await caches.open(SHARE_CACHE);
      await cache.delete(SHARE_KEY);
      await cache.put(
        SHARE_KEY,
        new Response(body, {
          headers: {
            'content-type': type,
            'x-file-name': name,
          }
        })
      );
      return redirectTo('/expenses?shared=1');
    }
  } catch {
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
