import { supabase } from '@/integrations/supabase/client';

export interface ScannedBill {
  title: string;
  amount: number;
  date: string;
  category: string;
  notes: string;
  currency: string;
  confidence: number;
}

const MAX_DIMENSION = 1600;

/** Downscale an image file to keep the upload small. PDFs pass through untouched. */
export async function prepareBillFile(file: File): Promise<{ data: string; mimeType: string }> {
  const mimeType = file.type || inferMimeType(file.name);
  if (mimeType === 'application/pdf') {
    return { data: await fileToBase64(file), mimeType: 'application/pdf' };
  }

  const dataUrl = await fileToDataUrl(file);
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas context');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL('image/jpeg', 0.85);
    return { data: out.split(',')[1], mimeType: 'image/jpeg' };
  } catch {
    return { data: dataUrl.split(',')[1], mimeType };
  }
}

function inferMimeType(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fileToBase64(file: File) {
  const url = await fileToDataUrl(file);
  return url.split(',')[1];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function scanBill(
  file: File,
  categories: string[],
  currency?: string,
): Promise<ScannedBill> {
  const { data: prepared, mimeType } = await prepareBillFile(file);

  const { data, error } = await supabase.functions.invoke('scan-bill', {
    body: { image: prepared, mimeType, categories, currency },
  });

  if (error) {
    let message = 'Could not read this bill. Please enter it manually.';
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json();
        if (typeof body?.error === 'string') message = body.error;
      } catch { /* keep default */ }
    }
    throw new Error(message);
  }

  if (data?.error) throw new Error(String(data.error));
  return data as ScannedBill;
}
