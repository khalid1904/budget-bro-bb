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
    const storedType = res.headers.get('content-type') || blob.type;
    const name = res.headers.get('x-file-name') || (storedType === 'application/pdf' ? 'receipt.pdf' : 'receipt.jpg');
    const type = storedType && storedType !== 'application/octet-stream' ? storedType : inferReceiptType(name);
    return new File([blob], name, { type });
  } catch {
    return null;
  }
}

function inferReceiptType(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}
