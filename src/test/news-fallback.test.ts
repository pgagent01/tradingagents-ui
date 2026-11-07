import { afterEach, describe, expect, it, vi } from 'vitest';
import { yahooNewsSearch } from '@/lib/stock-data.server';
afterEach(() => vi.unstubAllGlobals());
describe('free headline source fallback', () => {
  it('uses the second Yahoo host when the first fails', async () => {
    const hosts: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const host = new URL(url).hostname; hosts.push(host);
      return host.startsWith('query1') ? new Response('', { status: 503 }) : Response.json({ news: [{ title: 'Dated company headline' }] });
    }));
    expect(await yahooNewsSearch('LITE')).toEqual({ news: [{ title: 'Dated company headline' }] });
    expect(hosts).toEqual(['query1.finance.yahoo.com', 'query2.finance.yahoo.com']);
  });
  it('continues after an empty primary feed and leaves total absence empty', async () => {
    const fetcher = vi.fn(async () => Response.json({ news: [] }));
    vi.stubGlobal('fetch', fetcher);
    expect(await yahooNewsSearch('LITE')).toEqual({ news: [] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});