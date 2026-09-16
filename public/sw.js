const SHARE_CACHE = 'budget-bro-share';
const SHARE_KEY = '/__shared-receipt';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('budget-bro-v'))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
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
      const cache = await caches.open(SHARE_CACHE);
      await cache.delete(SHARE_KEY);
      await cache.put(
        SHARE_KEY,
        new Response(file, {
          headers: {
            'content-type': file.type || 'application/octet-stream',
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
  }
});
