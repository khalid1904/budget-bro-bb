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

function findBytes(source, target, from = 0) {
  outer: for (let i = from; i <= source.length - target.length; i += 1) {
    for (let j = 0; j < target.length; j += 1) {
      if (source[i + j] !== target[j]) continue outer;
    }
    return i;
  }
  return -1;
}

async function readRawMultipart(request) {
  const contentType = request.headers.get('content-type') || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch && (boundaryMatch[1] || boundaryMatch[2]);
  if (!boundary) return null;

  const bytes = new Uint8Array(await request.arrayBuffer());
  const encoder = new TextEncoder();
  const headerEndMarker = encoder.encode('\r\n\r\n');
  const boundaryMarker = encoder.encode(`\r\n--${boundary}`);
  let cursor = 0;
  let firstNamedPart = null;

  while (cursor < bytes.length) {
    const headerEnd = findBytes(bytes, headerEndMarker, cursor);
    if (headerEnd < 0) break;
    const headers = new TextDecoder().decode(bytes.slice(cursor, headerEnd));
    const bodyStart = headerEnd + headerEndMarker.length;
    const bodyEnd = findBytes(bytes, boundaryMarker, bodyStart);
    if (bodyEnd < 0) break;
    const filenameMatch = headers.match(/filename\*?=(?:UTF-8''|"?)([^";\r\n]+)/i);
    const fieldNameMatch = headers.match(/name="?([^";\r\n]+)"?/i);
    const typeMatch = headers.match(/content-type:\s*([^\r\n]+)/i);
    const body = bytes.slice(bodyStart, bodyEnd);
    const type = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';
    const fieldName = fieldNameMatch ? fieldNameMatch[1] : '';
    const isReceiptPart = fieldName === 'receipt' || fieldName === 'file' || fieldName === 'files';
    const isSupportedFile = type.startsWith('image/') || type === 'application/pdf';

    if (body.byteLength > 0 && (filenameMatch || isSupportedFile || isReceiptPart)) {
      let decodedName = '';
      if (filenameMatch) {
        try {
          decodedName = decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, ''));
        } catch {
          decodedName = filenameMatch[1].replace(/^"|"$/g, '');
        }
      }
      const part = {
        body,
        name: decodedName || defaultNameForType(type),
        type,
      };
      if (isSupportedFile || filenameMatch) return part;
      if (!firstNamedPart) firstNamedPart = part;
    }
    cursor = bodyEnd + boundaryMarker.length;
  }
  return firstNamedPart;
}

function defaultNameForType(type) {
  if (type === 'application/pdf') return 'receipt.pdf';
  if (type === 'image/png') return 'receipt.png';
  if (type === 'image/webp') return 'receipt.webp';
  return 'receipt.jpg';
}

async function storeSharedFile(body, rawName, rawType) {
  const type = rawType || 'application/octet-stream';
  const name = (rawName || defaultNameForType(type)).replace(/[^\w.\-]/g, '_');
  const cache = await caches.open(SHARE_CACHE);
  await cache.delete(SHARE_KEY);
  await cache.put(
    SHARE_KEY,
    new Response(body, {
      headers: {
        'content-type': type,
        'x-file-name': name,
      },
    })
  );
}

async function handleShare(request) {
  const rawRequest = request.clone();
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
      await storeSharedFile(file, file.name, file.type);
      return redirectTo('/expenses?shared=1');
    }
  } catch {
    // Some Android apps send file shares that Chromium cannot expose as FormData.
  }

  try {
    const rawFile = await readRawMultipart(rawRequest);
    if (rawFile) {
      await storeSharedFile(rawFile.body, rawFile.name, rawFile.type);
      return redirectTo('/expenses?shared=1');
    }
  } catch {
    return redirectTo('/expenses?shared=raw-error');
  }
  return redirectTo('/expenses?shared=no-file');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/share-target' || url.pathname === '/share-target-v2') {
    if (event.request.method === 'POST') {
      event.respondWith(handleShare(event.request));
      return;
    }
    event.respondWith(redirectTo('/expenses?shared=1'));
  }
});
