import { describe, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({
  consumeSharedImages: vi.fn(),
  acknowledgeSharedImages: vi.fn(async () => {}),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => native,
}));
import { consumeNativeSharedImages } from '@/lib/android-receipt-share';

describe('native receipt delivery', () => {
  it('reads and acknowledges once for concurrent and repeated deliveries', async () => {
    native.consumeSharedImages.mockResolvedValueOnce({ files: [{ name: 'receipt.png', type: 'image/png', data: btoa('receipt') }] });
    const [first, second] = await Promise.all([
      consumeNativeSharedImages('duplicate'), consumeNativeSharedImages('duplicate'),
    ]);
    const repeated = await consumeNativeSharedImages('duplicate');
    expect(first).toBe(second);
    expect(repeated).toBe(first);
    expect(first[0].name).toBe('receipt.png');
    expect(native.consumeSharedImages).toHaveBeenCalledTimes(1);
    expect(native.acknowledgeSharedImages).toHaveBeenCalledTimes(1);
  });

  it('allows a failed native read to be retried', async () => {
    native.consumeSharedImages.mockRejectedValueOnce(new Error('temporarily unavailable'));
    await expect(consumeNativeSharedImages('retry')).rejects.toThrow('temporarily unavailable');
    native.consumeSharedImages.mockResolvedValueOnce({ files: [{ name: 'receipt.png', type: 'image/png', data: btoa('receipt') }] });
    expect(await consumeNativeSharedImages('retry')).toHaveLength(1);
  });
});
