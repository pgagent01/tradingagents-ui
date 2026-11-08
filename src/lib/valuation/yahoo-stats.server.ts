import { numeric, yahooSymbol } from '@/lib/stock-data';
export type YahooStats = { enterpriseValue: number | null; evSales: number | null; evEbitda: number | null; forwardPe: number | null; peg: number | null; beta5y: number | null; roe: number | null; roa: number | null; dividendYield: number | null; currency: string | null; marketCap: number | null };
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
  const k = res['defaultKeyStatistics'], f = res['financialData'], d = res['summaryDetail'], p = res['price'] as Record<string, unknown> | undefined;
  const cur=typeof p?.['currency']==='string'?p['currency'] as string:null; const minor=cur!==null&&MINOR_UNIT.has(cur);
  return { enterpriseValue: raw(k, 'enterpriseValue'), evSales: raw(k, 'enterpriseToRevenue'), evEbitda: raw(k, 'enterpriseToEbitda'), forwardPe: minor ? null : raw(k, 'forwardPE') ?? raw(d, 'forwardPE'), peg: minor ? null : raw(k, 'pegRatio'), beta5y: raw(d, 'beta') ?? raw(k, 'beta'), roe: (raw(f, 'returnOnEquity') ?? null) === null ? null : raw(f, 'returnOnEquity')! * 100, roa: raw(f, 'returnOnAssets') === null ? null : raw(f, 'returnOnAssets')! * 100, dividendYield: raw(d, 'dividendYield') === null ? null : raw(d, 'dividendYield')! * 100, currency: typeof p?.['currency'] === 'string' ? p['currency'] as string : null, marketCap: raw(p, 'marketCap') ?? raw(d, 'marketCap') };
}
/** Flags a computed ratio that differs from the provider's by more than the tolerance (definitions/periods differ). */
export function ratioMismatch(ours: number | null | undefined, theirs: number | null, tol = 0.15): boolean {
  return typeof ours === 'number' && theirs !== null && theirs !== 0 && Math.abs(ours / theirs - 1) > tol;
}
