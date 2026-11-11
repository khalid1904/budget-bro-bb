import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface NativeSharedFile {
  name: string;
  type: string;
  data: string;
}

interface ReceiptSharePlugin {
  addListener(
    eventName: 'shareReceived',
    listenerFunc: (event: { id: string }) => void,
  ): Promise<PluginListenerHandle>;
  getPendingShares(): Promise<{ shares: Array<{ id: string }> }>;
  consumeSharedImages(options: { id: string }): Promise<{ files: NativeSharedFile[] }>;
  acknowledgeSharedImages(options: { id: string }): Promise<void>;
}

export const ReceiptShare = registerPlugin<ReceiptSharePlugin>('ReceiptShare');

// Keep a small session cache so remounts/repeated delivery reuse the same read,
// even after Android has deleted the acknowledged files.
const receiptReads = new Map<string, Promise<File[]>>();

/** Read the app-private copies Android made while the share permission was valid. */
export async function consumeNativeSharedImages(id: string): Promise<File[]> {
  if (!Capacitor.isNativePlatform()) return [];

  const existing = receiptReads.get(id);
  if (existing) return existing;
  const read = readAndAcknowledge(id);
  receiptReads.set(id, read);
  try {
    return await read;
  } catch (error) {
    receiptReads.delete(id);
    throw error;
  } finally {
    // Bound retained receipt data after completed reads.
    if (receiptReads.size > 5) {
      const oldest = receiptReads.keys().next().value;
      if (oldest !== id) receiptReads.delete(oldest);
    }
  }
}

async function readAndAcknowledge(id: string): Promise<File[]> {
  const { files } = await ReceiptShare.consumeSharedImages({ id });
  try {
    const receipts = files.map((sharedFile) => {
      const binary = atob(sharedFile.data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      if (!bytes.length) throw new Error('The shared receipt was empty.');
      return new File([bytes], sharedFile.name, { type: sharedFile.type });
    });
    await ReceiptShare.acknowledgeSharedImages({ id });
    return receipts;
  } catch (error) {
    throw error instanceof Error ? error : new Error('The shared receipt could not be opened.');
  }
}