import { afterEach, expect, it, vi } from 'vitest';
const saved = vi.hoisted(() => new Map<string, unknown>());
vi.mock('@/lib/data-cache.server', () => ({
  readDataCache: async (_: unknown, id: string, provider: string, key: string) => saved.has(`${id}:${provider}:${key}`) ? { payload: saved.get(`${id}:${provider}:${key}`), fresh: true } : null,
  writeDataCache: vi.fn(),
}));
import { ownMassiveCredential, checkMassiveConnection } from '@/lib/massive.server';
import { encryptSecret } from '@/lib/crypto.server';
function client(id: string, email: string, row: unknown = null, error: unknown = null) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: async () => ({ data: row, error }) };
  return { auth: { getUser: async () => ({ data: { user: { id, email } }, error: null }) }, from: vi.fn(() => query) } as unknown as Parameters<typeof ownMassiveCredential>[0];
}
afterEach(() => { saved.clear(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('never exposes the supplied Massive credential to another account', async () => {
  vi.stubEnv('UDC_MASSIVE_API_KEY', 'synthetic-connection');
  saved.set('other:data-provider-settings:massive', { enabled: true });
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect(await ownMassiveCredential(client('other', 'other@example.com'), 'other')).toBeNull();
  expect((await checkMassiveConnection(client('other', 'other@example.com'), 'other', 'GOOGL')).valid).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});
it('honors explicit Massive off for the supplied owner', async () => {
  vi.stubEnv('UDC_MASSIVE_API_KEY', 'synthetic-connection');
  saved.set('owner:data-provider-settings:massive', { enabled: false });
  expect(await ownMassiveCredential(client('owner', 'gprithvi@gmail.com'), 'owner')).toBeNull();
});
it('uses an enabled personal key before the owner connection', async () => {
  vi.stubEnv('API_KEY_ENCRYPTION_SECRET', 'synthetic-encryption');
  vi.stubEnv('UDC_MASSIVE_API_KEY', 'synthetic-connection');
  const sb = client('owner', 'gprithvi@gmail.com', { key_ciphertext: await encryptSecret('synthetic-personal', 'synthetic-encryption') });
  expect(await ownMassiveCredential(sb, 'owner')).toEqual({ key: 'synthetic-personal', gateway: false });
});
it('does not use owner fallback when the credential query fails', async () => {
  vi.stubEnv('UDC_MASSIVE_API_KEY', 'synthetic-connection');
  await expect(ownMassiveCredential(client('owner', 'gprithvi@gmail.com', null, { message: 'outage' }), 'owner')).rejects.toThrow('unavailable');
});
it('checks the owner through the gateway and returns access status without provider facts', async () => {
  vi.stubEnv('UDC_MASSIVE_API_KEY', 'synthetic-connection'); vi.stubEnv('LOVABLE_API_KEY', 'synthetic-gateway');
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toMatch(/^https:\/\/connector-gateway\.lovable\.dev\/udc_massive\//);
    expect(new Headers(init.headers).get('X-Connection-Api-Key')).toBe('synthetic-connection');
    return Response.json(url.includes('/prev') ? { ticker: 'GOOGL', results: [{ T: 'GOOGL', c: 295.77, t: Date.now() - 86400000 }] } : { results: { ticker: 'GOOGL', market_cap: 3636196380000 } });
  }); vi.stubGlobal('fetch', fetcher);
  const result = await checkMassiveConnection(client('owner', 'gprithvi@gmail.com'), 'owner', 'GOOGL');
  expect(result.valid).toBe(true); expect(result.dailyAvailable).toBe(true); expect(fetcher).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(result)).not.toContain('3636196380000'); expect(JSON.stringify(result)).not.toContain('synthetic-connection');
});
it('stops after reference denial without retrying or requesting prices', async () => {
  vi.stubEnv('UDC_MASSIVE_API_KEY', 'synthetic-connection'); vi.stubEnv('LOVABLE_API_KEY', 'synthetic-gateway');
  const fetcher = vi.fn(async () => Response.json({ status: 'NOT_AUTHORIZED' }, { status: 403 })); vi.stubGlobal('fetch', fetcher);
  expect((await checkMassiveConnection(client('owner', 'gprithvi@gmail.com'), 'owner', 'GOOGL')).valid).toBe(false);
  expect(fetcher).toHaveBeenCalledOnce();
});