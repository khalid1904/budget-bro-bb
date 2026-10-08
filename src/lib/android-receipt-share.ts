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

/** Read the app-private copies Android made while the share permission was valid. */
export async function consumeNativeSharedImages(id: string): Promise<File[]> {
  if (!Capacitor.isNativePlatform()) return [];

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