import { afterEach, describe, expect, it, vi } from 'vitest';
import { ownAlphaCredential, parseAlphaOverview, validateAlphaKey, cachedAlphaOverview } from '@/lib/alphavantage.server';
import { normalizeCredentialProvider, normalizeProvider, maskKey } from '@/lib/access-rules';
import { encryptSecret, decryptSecret } from '@/lib/crypto.server';
import { getStockData } from '@/lib/stock-data.server';
afterEach(() => vi.unstubAllGlobals());
describe('account-owned Alpha Vantage enrichment', () => {
  it('supports encrypted masked data credentials but never AI selection', async () => {
    expect(normalizeCredentialProvider('ALPHAVANTAGE')).toBe('alphavantage');
    expect(() => normalizeProvider('alphavantage')).toThrow();
    const key = 'synthetic-alpha-test-only';
    const encrypted = await encryptSecret(key, 'synthetic-encryption-material');
    expect(encrypted).not.toContain(key);
    expect(await decryptSecret(encrypted, 'synthetic-encryption-material')).toBe(key);
    expect(maskKey(key)).toBe('•••••••• (configured)');
  });
  it('loads credentials only for the requesting account', async () => {
    const eq = vi.fn().mockReturnThis();
    const query = { select: vi.fn().mockReturnThis(), eq, maybeSingle: async () => ({ data: null, error: null }) };
    expect(await ownAlphaCredential({ from: () => query } as unknown as Parameters<typeof ownAlphaCredential>[0], 'owner-alpha')).toBeNull();
    expect(eq.mock.calls).toEqual([['user_id', 'owner-alpha'], ['provider', 'alphavantage']]);
  });
  it('preserves missing fundamentals and distinguishes TTM ratios', () => {
    const parsed = parseAlphaOverview({ Symbol: 'LITE', LatestQuarter: '2026-09-30', PERatio: '20', ProfitMargin: '0.15', EVToEBITDA: 'None', ReturnOnEquityTTM: '' }, 'LITE');
    expect(parsed?.date).toBe('2026-09-30');
    expect(parsed?.ratios.map(r => r.value)).toEqual([20, null, null, 15, null]);
    expect(parseAlphaOverview({ Symbol: 'MSFT' }, 'LITE')).toBeNull();
  });
  it('does not treat quota messages as success or expose echoed keys', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ Information: 'synthetic-alpha-test-only' })));
    const result = await validateAlphaKey('synthetic-alpha-test-only');
    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).not.toContain('synthetic-alpha-test-only');
  });
  it('reuses owner/version scoped cached overview without a provider call', async () => {
    const eq = vi.fn().mockReturnThis();
    const query = { select: vi.fn().mockReturnThis(), eq, maybeSingle: async () => ({ data: { payload: { symbol: 'LITE', ratios: [], date: '2026-09-30' }, expires_at: '2099-01-01' }, error: null }) };
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const result = await cachedAlphaOverview({ from: () => query } as unknown as Parameters<typeof cachedAlphaOverview>[0], 'owner-alpha', 'LITE', { key: 'synthetic', version: 'v2' });
    expect(result?.symbol).toBe('LITE'); expect(fetcher).not.toHaveBeenCalled();
    expect(eq.mock.calls).toEqual([['user_id', 'owner-alpha'], ['provider', 'alphavantage'], ['cache_key', 'overview-v1:LITE:v2']]);
  });
  it('falls back from Yahoo to the owner Alpha Vantage key and attaches overview evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.hostname.includes('yahoo')) return new Response('', { status: 503 });
      if (url.searchParams.get('function') === 'TIME_SERIES_DAILY') return Response.json({ 'Time Series (Daily)': { '2026-11-02': { '1. open': '10', '2. high': '12', '3. low': '9', '4. close': '11', '5. volume': '100' } } });
      if (url.searchParams.get('function') === 'GLOBAL_QUOTE') return Response.json({ 'Global Quote': { '05. price': '11', '07. latest trading day': '2026-11-02' } });
      return Response.json({});
    }));
    const overview = vi.fn(async () => parseAlphaOverview({ Symbol: 'ZZALPHA', PERatio: '20', LatestQuarter: '2026-09-30' }, 'ZZALPHA'));
    const result = await getStockData('ZZALPHA', '1M', 'owner-alpha-test', null, 'annual', { key: 'synthetic-alpha', version: 'v1', overview });
    expect(result.price).toBe(11); expect(result.chartSource).toBe('Alpha Vantage · daily');
    expect(result.ratios[0]?.value).toBe(20); expect(overview).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain('synthetic-alpha');
  });
  it('does not apply current TTM enrichment to quarterly statements', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({})));
    const overview = vi.fn(async () => null);
    await getStockData('ZZQUARTER', '1D', 'owner-quarter', null, 'quarter', { key: 'synthetic', version: 'v1', overview });
    expect(overview).not.toHaveBeenCalled();
  });
});