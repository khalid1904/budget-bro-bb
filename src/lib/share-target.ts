const SHARE_CACHE = 'budget-bro-share';

export type SharedReceipt =
  | { kind: 'file'; file: File }
  | { kind: 'text'; text: string };

/** Read the receipt shared into the app via the OS share sheet, then clear it. */
export async function takeSharedReceipt(shareId: string): Promise<SharedReceipt | null> {
  if (typeof caches === 'undefined') return null;
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(shareId)) return null;
  const shareKey = `/__shared-receipt-${shareId}`;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const res = await cache.match(shareKey);
    if (!res) return null;
    await cache.delete(shareKey);
    if (res.headers.get('x-share-kind') === 'text') {
      const text = (await res.text()).trim();
      return text ? { kind: 'text', text } : null;
    }
    const blob = await res.blob();
    if (!blob.size) return null;
    const storedType = res.headers.get('content-type') || blob.type;
    const name = res.headers.get('x-file-name') || (storedType === 'application/pdf' ? 'receipt.pdf' : 'receipt.jpg');
    const type = storedType && storedType !== 'application/octet-stream' ? storedType : inferReceiptType(name);
    return { kind: 'file', file: new File([blob], name, { type }) };
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
