const SHARE_CACHE = 'budget-bro-share';

self.addEventListener('install', () => self.skipWaiting());

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
    headers: { Location: new URL(path, self.location.origin).href },
  });
}

function createShareId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeFileName(name, type) {
  const extension = type === 'application/pdf' ? 'pdf' : type.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
  const fallback = `receipt.${extension}`;
  return (name || fallback).replace(/[^\w.\-]/g, '_').slice(0, 180);
}

function inferType(name, bytes) {
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (bytes?.length >= 4) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
    if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
    if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(4, 12)).startsWith('ftyp')) {
      const brand = new TextDecoder().decode(bytes.slice(8, 12));
      if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
      if (['avif', 'avis'].includes(brand)) return 'image/avif';
    }
  }
  return '';
}

function isSupportedType(type) {
  return type === 'image/jpeg' || type === 'image/png' || type === 'image/webp' || type === 'application/pdf';
}

async function storePayload(payload) {
  const shareId = createShareId();
  const key = `/__shared-receipt-${shareId}`;
  const cache = await caches.open(SHARE_CACHE);
  const headers = { 'x-share-kind': payload.kind };

  if (payload.kind === 'file') {
    headers['content-type'] = payload.type;
    headers['x-file-name'] = safeFileName(payload.name, payload.type);
  } else {
    headers['content-type'] = 'text/plain; charset=utf-8';
  }

  await cache.put(key, new Response(payload.body, { headers }));
  return shareId;
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

async function parseRawMultipart(request) {
  const contentType = request.headers.get('content-type') || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch && (boundaryMatch[1] || boundaryMatch[2]);
  if (!boundary) return null;

  const bytes = new Uint8Array(await request.arrayBuffer());
  const encoder = new TextEncoder();
  const headerEndMarker = encoder.encode('\r\n\r\n');
  const boundaryMarker = encoder.encode(`\r\n--${boundary}`);
  const textParts = [];
  let cursor = 0;

  while (cursor < bytes.length) {
    const headerEnd = findBytes(bytes, headerEndMarker, cursor);
    if (headerEnd < 0) break;
    const headers = new TextDecoder().decode(bytes.slice(cursor, headerEnd));
    const bodyStart = headerEnd + headerEndMarker.length;
    const bodyEnd = findBytes(bytes, boundaryMarker, bodyStart);
    if (bodyEnd < 0) break;

    const disposition = headers.match(/content-disposition:[^\r\n]+/i)?.[0] || '';
    const fieldName = disposition.match(/(?:^|;\s*)name="?([^";\r\n]+)"?/i)?.[1] || '';
    const encodedName = disposition.match(/filename\*=UTF-8''([^;\r\n]+)/i)?.[1];
    const plainName = disposition.match(/(?:^|;\s*)filename="?([^";\r\n]+)"?/i)?.[1];
    let fileName = encodedName || plainName || '';
    try { fileName = decodeURIComponent(fileName); } catch { /* retain original */ }

    const body = bytes.slice(bodyStart, bodyEnd);
    const declaredType = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() || '';
    const inferredType = inferType(fileName, body);
    const type = isSupportedType(declaredType)
      ? declaredType
      : inferredType || (/^image\/[a-z0-9.+-]+$/i.test(declaredType) && declaredType !== 'image/*' ? declaredType : '');

    if (body.byteLength > 0 && type) {
      return { kind: 'file', body, name: safeFileName(fileName, type), type };
    }

    if (body.byteLength > 0 && ['title', 'text', 'url'].includes(fieldName)) {
      const value = new TextDecoder().decode(body).trim();
      if (value) textParts.push(value);
    }
    cursor = bodyEnd + boundaryMarker.length;
  }

  const text = [...new Set(textParts)].join('\n').trim();
  return text ? { kind: 'text', body: text } : null;
}

async function parseFormData(request) {
  const formData = await request.formData();
  const files = Array.from(formData.values()).filter(
    (value) => value && typeof value !== 'string' && typeof value.arrayBuffer === 'function' && value.size > 0
  );

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const declaredType = (file.type || '').split(';')[0].trim().toLowerCase();
    const inferredType = inferType(file.name, bytes);
    const type = isSupportedType(declaredType)
      ? declaredType
      : inferredType || (/^image\/[a-z0-9.+-]+$/i.test(declaredType) && declaredType !== 'image/*' ? declaredType : '');
    if (type) return { kind: 'file', body: bytes, name: safeFileName(file.name, type), type };
  }

  const text = ['title', 'text', 'url']
    .flatMap((key) => formData.getAll(key))
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());
  const uniqueText = [...new Set(text)].join('\n').trim();
  return uniqueText ? { kind: 'text', body: uniqueText } : null;
}

async function handleShare(request) {
  const rawRequest = request.clone();
  let payload = null;
  try {
    payload = await parseFormData(request);
  } catch {
    // Fall through to byte-level multipart parsing for nonstandard Android shares.
  }

  if (!payload) {
    try {
      payload = await parseRawMultipart(rawRequest);
    } catch {
      return redirectTo('/expenses?shared=raw-error');
    }
  }

  if (!payload) return redirectTo('/expenses?shared=no-file');
  const shareId = await storePayload(payload);
  return redirectTo(`/expenses?shared=${encodeURIComponent(shareId)}`);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== '/share-target' && url.pathname !== '/share-target-v2') return;
  event.respondWith(
    event.request.method === 'POST'
      ? handleShare(event.request)
      : Promise.resolve(redirectTo('/expenses?shared=missing'))
  );
});