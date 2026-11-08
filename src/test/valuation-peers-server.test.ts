import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/fmp.server', () => ({ ownFmpCredential: vi.fn(), fmpRequest: vi.fn() }));
vi.mock('@/lib/data-cache.server', () => ({ readDataCache: vi.fn(), writeDataCache: vi.fn() }));
import { getComparables } from '@/lib/valuation/comparables.server';
import { COMPARABLE_CACHE_TTL } from '@/lib/valuation/comparables';
import { ownFmpCredential, fmpRequest } from '@/lib/fmp.server';
import { readDataCache, writeDataCache } from '@/lib/data-cache.server';
const sb = {} as Parameters<typeof getComparables>[0];
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(ownFmpCredential).mockResolvedValue({ key: 'test-only-key', version: 'version-one' });
  vi.mocked(readDataCache).mockResolvedValue(null);
  vi.mocked(writeDataCache).mockResolvedValue(true);
});
describe('peer retrieval safety', () => {
  it('excludes all current peer retrieval from historical runs', async () => {
    const result = await getComparables(sb,'owner','AMZN','2025-11-08','2026-11-08');
    expect(result.peers).toEqual([]); expect(ownFmpCredential).not.toHaveBeenCalled(); expect(fmpRequest).not.toHaveBeenCalled();
  });
  it('does not require optional credentials to return an unavailable result', async () => {
    vi.mocked(ownFmpCredential).mockResolvedValue(null);
    expect((await getComparables(sb,'owner','AMZN','2026-11-08','2026-11-08')).status).toBe('unavailable');
    expect(fmpRequest).not.toHaveBeenCalled();
  });
  it('writes sanitized successful peer data with a 48-hour owner/version cache', async () => {
    vi.mocked(fmpRequest).mockImplementation(async (endpoint,_key,params) => {
      if (endpoint === 'profile') return [{ industry:'Software',currency:'USD',marketCap:100,companyName:params['symbol'] }];
      if (endpoint === 'stock-peers') return [{symbol:'A'},{symbol:'B'},{symbol:'C'}];
      return [{ priceToEarningsRatioTTM:20 }];
    });
    const result = await getComparables(sb,'owner','SELF','2026-11-08','2026-11-08');
    expect(result.peers).toHaveLength(3);
    expect(writeDataCache).toHaveBeenCalledWith(sb,'owner','valuation-peers','v2:SELF:version-one',result,COMPARABLE_CACHE_TTL);
    expect(COMPARABLE_CACHE_TTL).toBe(172800000);
    expect(JSON.stringify(result)).not.toContain('test-only-key');
  });
  it('contains provider failures without failing research', async () => {
    vi.mocked(fmpRequest).mockRejectedValue(new Error('provider unavailable'));
    expect((await getComparables(sb,'owner','AMZN','2026-11-08','2026-11-08')).status).toBe('unavailable');
  });
});