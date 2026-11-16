import { afterEach, describe, expect, it, vi } from 'vitest';
const cache = vi.hoisted(() => new Map<string, unknown>());
vi.mock('@/lib/data-cache.server', () => ({
  readDataCache: async (_sb: unknown, id: string, provider: string, key: string) => cache.has(`${id}:${provider}:${key}`) ? { payload: cache.get(`${id}:${provider}:${key}`), fresh: true } : null,
  writeDataCache: async (_sb: unknown, id: string, provider: string, key: string, value: unknown) => { cache.set(`${id}:${provider}:${key}`, value); return true; },
}));
import { dataProviderEnabled, saveDataProviderSetting } from '@/lib/data-provider-settings.server';
afterEach(() => { cache.clear(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function client(id: string, email: string, row: unknown = null) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: async () => ({ data: row, error: null }), then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: row ? [{ provider: 'firecrawl' }] : [], error: null }).then(resolve) };
  return { auth: { getUser: async () => ({ data: { user: { id, email } }, error: null }) }, from: vi.fn(() => query) } as unknown as Parameters<typeof dataProviderEnabled>[0];
}
describe('optional provider isolation ', () => {
  it('defaults all optional providers off for other accounts, even with a saved key', async () => {
    const sb = client('other', 'other@example.com', { key_ciphertext: 'cipher' });
    for (const p of ['fred', 'fmp', 'alphavantage', 'firecrawl', 'finnhub'] as const) expect(await dataProviderEnabled(sb, 'other', p)).toBe(false);
  });
  it('keeps the supplied owner enabled by default but honors explicit off', async () => {
    const sb = client('owner', 'gprithvi@gmail.com');
    expect(await dataProviderEnabled(sb, 'owner', 'firecrawl')).toBe(true);
    await saveDataProviderSetting(sb, 'owner', 'firecrawl', false);
    expect(await dataProviderEnabled(sb, 'owner', 'firecrawl')).toBe(false);
    expect(await dataProviderEnabled(client('other','other@example.com'), 'other', 'firecrawl')).toBe(false);
  });
  it('requires own credentials before enabling another account provider', async () => {
    await expect(saveDataProviderSetting(client('other','other@example.com'), 'other', 'firecrawl', true)).rejects.toThrow('Save your own');
  });
});