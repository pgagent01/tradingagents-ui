import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/fmp.server', () => ({ ownFmpCredential: vi.fn(), fmpRequest: vi.fn() }));
vi.mock('@/lib/data-cache.server', () => ({ readDataCache: vi.fn(), writeDataCache: vi.fn() }));
vi.mock('@/lib/valuation/peer-fallback.server', () => ({ secIndustry: vi.fn(), secYahooPeer: vi.fn(), yahooPeerCandidates: vi.fn() }));
import { secIndustry, secYahooPeer, yahooPeerCandidates } from '@/lib/valuation/peer-fallback.server';
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
  vi.mocked(secIndustry).mockResolvedValue(null);
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
    expect(writeDataCache).toHaveBeenCalledWith(sb,'owner','valuation-peers','v3:SELF:version-one',result,COMPARABLE_CACHE_TTL);
    expect(COMPARABLE_CACHE_TTL).toBe(172800000);
    expect(JSON.stringify(result)).not.toContain('test-only-key');
  });
  it('contains provider failures without failing research', async () => {
    vi.mocked(fmpRequest).mockRejectedValue(new Error('provider unavailable'));
    expect((await getComparables(sb,'owner','AMZN','2026-11-08','2026-11-08')).status).toBe('unavailable');
  });
  it('uses bounded SEC-verified free peers when optional FMP access is absent', async () => {
    vi.mocked(ownFmpCredential).mockResolvedValue(null);
    const classification = { sic: '7372', industry: 'SEC SIC 7372 · Software' };
    vi.mocked(secIndustry).mockResolvedValue(classification);
    vi.mocked(yahooPeerCandidates).mockResolvedValue(Array.from({length:20},(_,i)=>`P${i}`));
    vi.mocked(secYahooPeer).mockImplementation(async ticker => ({ ticker, company:ticker,industry:classification.industry,marketCap:100,currency:'USD',date:'2026-11-08',source:`https://finance.yahoo.com/quote/${ticker}/`,multiples:{pe:20,forwardPe:null,pFcf:15,pb:3,evSales:null,evEbitda:null} }));
    const result = await getComparables(sb,'owner','SELF','2026-11-08','2026-11-08');
    expect(result.status).toBe('available');
    expect(result.peers).toHaveLength(8);
    expect(secYahooPeer).toHaveBeenCalledTimes(13);
    expect(fmpRequest).not.toHaveBeenCalled();
    expect(writeDataCache).toHaveBeenCalledWith(sb,'owner','valuation-peers','v3:SELF:public',result,172800000);
  });
  it('reuses only the requesting owner and credential-version cache', async () => {
    vi.mocked(readDataCache).mockResolvedValue({fresh:true,payload:{peers:[],status:'unavailable'}} as never);
    await getComparables(sb,'owner-two','SELF','2026-11-08','2026-11-08');
    expect(readDataCache).toHaveBeenCalledWith(sb,'owner-two','valuation-peers','v3:SELF:version-one');
    expect(fmpRequest).not.toHaveBeenCalled(); expect(secIndustry).not.toHaveBeenCalled();
  });
});