import { afterEach, describe, expect, it, vi } from 'vitest';
const cache = vi.hoisted(() => new Map<string, unknown>());
vi.mock('@/lib/data-cache.server', () => ({
  readDataCache: async (_sb: unknown, id: string, provider: string, key: string) => cache.has(`${id}:${provider}:${key}`) ? { payload: cache.get(`${id}:${provider}:${key}`), fresh: true } : null,
  writeDataCache: async (_sb: unknown, id: string, provider: string, key: string, value: unknown) => { cache.set(`${id}:${provider}:${key}`, value); return true; },
}));
import { dataProviderEnabled, saveDataProviderSetting } from '@/lib/data-provider-settings.server';
import { getTiingoEvidence } from '@/lib/tiingo.server';
import { tiingoReferences } from '@/lib/reference-evidence';
import { encryptSecret } from '@/lib/crypto.server';
afterEach(() => { cache.clear(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function client(id: string, email: string, row: unknown = null) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: async () => ({ data: row, error: null }), then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: row ? [{ provider: 'tiingo' }] : [], error: null }).then(resolve) };
  return { auth: { getUser: async () => ({ data: { user: { id, email } }, error: null }) }, from: vi.fn(() => query) } as unknown as Parameters<typeof dataProviderEnabled>[0];
}
describe('optional provider isolation and Tiingo', () => {
  it('defaults all optional providers off for other accounts, even with a saved key', async () => {
    const sb = client('other', 'other@example.com', { key_ciphertext: 'cipher' });
    for (const p of ['fred', 'fmp', 'alphavantage', 'firecrawl', 'tiingo'] as const) expect(await dataProviderEnabled(sb, 'other', p)).toBe(false);
  });
  it('keeps the supplied owner enabled by default but honors explicit off', async () => {
    const sb = client('owner', 'gprithvi@gmail.com');
    expect(await dataProviderEnabled(sb, 'owner', 'tiingo')).toBe(true);
    await saveDataProviderSetting(sb, 'owner', 'tiingo', false);
    expect(await dataProviderEnabled(sb, 'owner', 'tiingo')).toBe(false);
    expect(await dataProviderEnabled(client('other','other@example.com'), 'other', 'tiingo')).toBe(false);
  });
  it('requires own credentials before enabling another account provider', async () => {
    await expect(saveDataProviderSetting(client('other','other@example.com'), 'other', 'tiingo', true)).rejects.toThrow('Save your own');
  });
  it('withholds unrelated, future and undated Tiingo news', () => {
    const article = { title: 'Alphabet earnings', url: 'https://news.example/item', description: 'Dated earnings evidence', publishedDate: '2026-11-15', tickers: ['googl'] };
    expect(tiingoReferences([article, {...article, tickers:['tsla']}, {...article,publishedDate:'2027-01-01'}, {...article,publishedDate:null}], 'GOOGL', '2026-11-01', '2026-11-16')).toHaveLength(1);
  });
  it('does not call Tiingo or expose its supplied connection to an off account', async () => {
    vi.stubEnv('UDC_TIINGO_API_KEY','synthetic-owner-connection');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const result = await getTiingoEvidence(client('other','other@example.com'), 'other', 'GOOGL', new Date().toISOString().slice(0,10), 30);
    expect(result.items).toEqual([]); expect(fetcher).not.toHaveBeenCalled();
  });
  it('enabled personal Tiingo uses own Token, reuses cache, and stops fetching when disabled', async () => {
    vi.stubEnv('API_KEY_ENCRYPTION_SECRET','synthetic-personal-encryption-secret');
    const sb = client('other','other@example.com',{key_ciphertext:await encryptSecret('synthetic-personal-tiingo','synthetic-personal-encryption-secret'),updated_at:'v1'});
    await saveDataProviderSetting(sb,'other','tiingo',true);
    const fetcher=vi.fn(async (_url:unknown, init?:RequestInit) => {
      expect(new Headers(init?.headers).get('Authorization')).toBe('Token synthetic-personal-tiingo');
      return Response.json([{title:'Alphabet earnings',url:'https://news.example/earnings',description:'Tiingo evidence',publishedDate:new Date().toISOString(),tickers:['googl']}]);
    }); vi.stubGlobal('fetch',fetcher);
    const date=new Date().toISOString().slice(0,10);
    expect((await getTiingoEvidence(sb,'other','GOOGL',date,30)).items).toHaveLength(1);
    expect((await getTiingoEvidence(sb,'other','GOOGL',date,30)).cached).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.stringify([...cache.values()])).not.toContain('synthetic-personal-tiingo');
    await saveDataProviderSetting(sb,'other','tiingo',false);
    expect((await getTiingoEvidence(sb,'other','GOOGL',date,30)).items).toEqual([]);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});