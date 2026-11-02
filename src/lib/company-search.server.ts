import { findCompanies, type Company } from './companies';

type SearchResult = { companies: Company[]; source: string; fetchedAt: string; cached: boolean };
const cache = new Map<string, { expires: number; result: SearchResult }>();
export async function lookupCompanyFallback(query: string, upstream: typeof fetch = fetch): Promise<SearchResult> {
  const q = query.trim();
  const key = q.toLowerCase();
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now() && upstream === fetch) return { ...saved.result, cached: true };
  let companies: Company[] = [], source = 'SEC saved catalog';
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      const response = await upstream(`https://${host}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const body = await response.json() as { quotes?: { symbol?: string; shortname?: string; longname?: string; exchDisp?: string; quoteType?: string }[] };
      companies = (body.quotes ?? []).filter(r => r.quoteType === 'EQUITY' && typeof r.symbol === 'string' && /^[A-Z][A-Z0-9.\-]{0,9}$/.test(r.symbol)).slice(0, 8).map(r => ({ ticker: r.symbol ?? '', name: (r.longname ?? r.shortname ?? r.symbol ?? '').slice(0, 200), exchange: (r.exchDisp ?? 'Yahoo Finance').slice(0, 50), aliases: [] }));
      if (companies.length) { source = 'Yahoo Finance'; break; }
    } catch { /* The next free endpoint or saved catalog remains available. */ }
  }
  if (!companies.length) companies = findCompanies(q);
  const result = { companies, source, fetchedAt: new Date().toISOString(), cached: false };
  if (upstream === fetch) {
    if (cache.size >= 100) cache.delete(cache.keys().next().value ?? '');
    cache.set(key, { expires: Date.now() + 300000, result });
  }
  return result;
}