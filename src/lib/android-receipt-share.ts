import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface NativeSharedFile {
  path: string;
  name: string;
  type: string;
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

/** Read the app-private copies Android made while the share permission was valid. */
export async function consumeNativeSharedImages(id: string): Promise<File[]> {
  if (!Capacitor.isNativePlatform()) return [];

  const { files } = await ReceiptShare.consumeSharedImages({ id });
  try {
    const receipts = await Promise.all(files.map(async (sharedFile) => {
      const response = await fetch(Capacitor.convertFileSrc(sharedFile.path));
      if (!response.ok) throw new Error('The shared receipt could not be opened on this device.');
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('The shared receipt was empty.');
      return new File([blob], sharedFile.name, { type: sharedFile.type || blob.type });
    }));
    await ReceiptShare.acknowledgeSharedImages({ id });
    return receipts;
  } catch (error) {
    throw error instanceof Error ? error : new Error('The shared receipt could not be opened.');
  }
}