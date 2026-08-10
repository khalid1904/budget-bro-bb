const SHARE_CACHE = 'budget-bro-share';
const SHARE_KEY = '/__shared-receipt';

/** Read the receipt shared into the app via the OS share sheet, then clear it. */
export async function takeSharedReceipt(): Promise<File | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const res = await cache.match(SHARE_KEY);
    if (!res) return null;
    const blob = await res.blob();
    await cache.delete(SHARE_KEY);
    if (!blob.size) return null;
    const type = res.headers.get('content-type') || blob.type || 'image/jpeg';
    const name = res.headers.get('x-file-name') || (type === 'application/pdf' ? 'receipt.pdf' : 'receipt.jpg');
    return new File([blob], name, { type });
  } catch {
    return null;
  }
}
