import { numeric, yahooSymbol } from '@/lib/stock-data';
import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
export type YahooStats = { enterpriseValue: number | null; evSales: number | null; evEbitda: number | null; forwardPe: number | null; peg: number | null; beta5y: number | null; roe: number | null; roa: number | null; dividendYield: number | null; currency: string | null; marketCap: number | null; trailingPe?: number | null; ps?: number | null; netMargin?: number | null; operatingMargin?: number | null; revenue?: number | null; netIncome?: number | null; financialCurrency?: string | null; change1y?: number | null; spyChange1y?: number | null; change1d?: number | null; price?: number | null; priceDate?: string | null; retrievedAt?: string; };
const memo=new Map<string,{at:number;v:YahooStats|null}>();
/** Currencies quoted in minor units (pence, cents): Yahoo's price-based ratios mix units, so they are withheld. */
export const MINOR_UNIT=new Set(['GBp','GBX','ZAc','ILA']);
let session: { cookie: string; crumb: string; at: number } | null = null;
const UA = { 'User-Agent': 'Mozilla/5.0' };
async function auth(): Promise<typeof session> {
  if (session && Date.now() - session.at < 30 * 60 * 1000) return session;
  const r = await fetch('https://fc.yahoo.com', { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(6000) }).catch(() => null);
  const set = r ? (r.headers.getSetCookie?.() ?? [r.headers.get('set-cookie') ?? '']) : [];
  const cookie = set.map(c => c.split(';')[0]).filter(Boolean).join('; ');
  if (!cookie) return null;
  const c = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { ...UA, Cookie: cookie }, signal: AbortSignal.timeout(6000) }).catch(() => null);
  const crumb = c && c.ok ? (await c.text()).trim() : '';
  if (!crumb || crumb.length > 40) return null;
  session = { cookie, crumb, at: Date.now() };
  return session;
}
const raw = (o: unknown, k: string) => { const v = (o as Record<string, unknown> | undefined)?.[k]; return numeric(typeof v === 'object' && v ? (v as Record<string, unknown>)['raw'] : v); };
const percent = (value: number | null) => value === null ? null : value * 100;
/** Separate quote and financial currencies; never combine pence quotes with USD filing inputs. */
export function parseYahooStats(res: Record<string, unknown>): YahooStats {
  const k = res['defaultKeyStatistics'], f = res['financialData'], d = res['summaryDetail'], p = res['price'] as Record<string, unknown> | undefined;
  const cur = typeof p?.['currency'] === 'string' ? p['currency'] : null;
  const minor = cur !== null && MINOR_UNIT.has(cur);
  const marketTime = raw(p, 'regularMarketTime');
  return {
    enterpriseValue: raw(k, 'enterpriseValue'), evSales: minor ? null : raw(k, 'enterpriseToRevenue'), evEbitda: minor ? null : raw(k, 'enterpriseToEbitda'),
    forwardPe: minor ? null : raw(k, 'forwardPE') ?? raw(d, 'forwardPE'), peg: minor ? null : raw(k, 'pegRatio'),
    beta5y: raw(d, 'beta') ?? raw(k, 'beta'), roe: percent(raw(f, 'returnOnEquity')), roa: percent(raw(f, 'returnOnAssets')), dividendYield: percent(raw(d, 'dividendYield')),
    currency: cur, financialCurrency: typeof (f as Record<string, unknown> | undefined)?.['financialCurrency'] === 'string' ? String((f as Record<string, unknown>)['financialCurrency']) : null,
    marketCap: raw(p, 'marketCap') ?? raw(d, 'marketCap'), trailingPe: minor ? null : raw(d, 'trailingPE'), ps: minor ? null : raw(d, 'priceToSalesTrailing12Months'),
    netMargin: percent(raw(f, 'profitMargins')), operatingMargin: percent(raw(f, 'operatingMargins')), revenue: raw(f, 'totalRevenue'), netIncome: raw(k, 'netIncomeToCommon'),
    change1y: percent(raw(k, '52WeekChange')), spyChange1y: percent(raw(k, 'SandP52WeekChange')), change1d: percent(raw(p, 'regularMarketChangePercent')), price: raw(p, 'regularMarketPrice'),
    priceDate: marketTime === null ? null : new Date(marketTime * 1000).toISOString().slice(0,10), retrievedAt: new Date().toISOString(),
  };
}
/** Shared owner-scoped durable statistics cache across stocks, comparables and valuation rates. */
export async function cachedYahooStats(sb: EvidenceClient, userId: string, ticker: string): Promise<YahooStats | null> {
  const key = `v2:${ticker}`;
  const cached = await readDataCache(sb, userId, 'yahoo-stats', key);
  if (cached?.fresh) return cached.payload as YahooStats | null;
  const value = await yahooStats(ticker);
  await writeDataCache(sb, userId, 'yahoo-stats', key, value, value ? 30 * 60 * 1000 : 60 * 1000);
  return value;
}
/** Provider-reported key statistics (Yahoo's own definitions and periods); null when unavailable, never estimated. */
export async function yahooStats(ticker: string): Promise<YahooStats | null> {
  const hit=memo.get(ticker); if(hit&&Date.now()-hit.at<30*60*1000) return hit.v;
  const v=await loadStats(ticker); if(memo.size>200) memo.clear(); memo.set(ticker,{at:Date.now(),v}); return v;
}
async function loadStats(ticker: string): Promise<YahooStats | null> {
  const s = await auth(); if (!s) return null;
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol(ticker))}?modules=defaultKeyStatistics,financialData,summaryDetail,price&crumb=${encodeURIComponent(s.crumb)}`;
  const r = await fetch(url, { headers: { ...UA, Cookie: s.cookie }, signal: AbortSignal.timeout(6000) }).catch(() => null);
  if (!r || !r.ok) { if (r?.status === 401) session = null; return null; }
  const res = ((await r.json().catch(() => null)) as { quoteSummary?: { result?: Record<string, unknown>[] } } | null)?.quoteSummary?.result?.[0];
  if (!res) return null;
  return parseYahooStats(res);
}
/** Flags a computed ratio that differs from the provider's by more than the tolerance (definitions/periods differ). */
export function ratioMismatch(ours: number | null | undefined, theirs: number | null, tol = 0.15): boolean {
  return typeof ours === 'number' && theirs !== null && theirs !== 0 && Math.abs(ours / theirs - 1) > tol;
}
