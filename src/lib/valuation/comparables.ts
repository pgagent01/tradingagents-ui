export const MULTIPLES = ['pe', 'forwardPe', 'evSales', 'evEbitda', 'pFcf', 'pb'] as const;
export const COMPARABLE_CACHE_TTL = 48 * 60 * 60 * 1000;
export type Multiple = typeof MULTIPLES[number];
export type Peer = { ticker: string; company: string; industry: string; marketCap: number; currency: string; date: string; source: string; multiples: Record<Multiple, number | null> };
export type ComparableEvidence = { status: 'available' | 'unavailable'; industry: string | null; fetchedAt: string; cached: boolean; peers: Peer[]; summaries: { multiple: Multiple; count: number; low: number; median: number; high: number; impliedLow: number | null; impliedBase: number | null; impliedHigh: number | null }[]; note: string };
export function eligiblePeers(peers: Peer[], ticker: string, marketCap: number, industry: string): Peer[] {
  if (!Number.isFinite(marketCap) || marketCap <= 0 || !industry) return [];
  const seen = new Set<string>();
  return peers.filter(p => {
    if (p.ticker === ticker || seen.has(p.ticker) || p.industry !== industry || p.currency !== 'USD' || !Number.isFinite(p.marketCap) || p.marketCap < marketCap * .25 || p.marketCap > marketCap * 4) return false;
    seen.add(p.ticker); return true;
  }).sort((a, b) => Math.abs(Math.log(a.marketCap / marketCap)) - Math.abs(Math.log(b.marketCap / marketCap)) || a.ticker.localeCompare(b.ticker)).slice(0, 8);
}
export function quantile(values: number[], fraction: number): number | null {
  const sorted = values.filter(v => Number.isFinite(v) && v > 0).sort((a,b) => a-b);
  if (!sorted.length || !Number.isFinite(fraction) || fraction < 0 || fraction > 1) return null;
  const index = (sorted.length - 1) * fraction, lower = sorted[Math.floor(index)], upper = sorted[Math.ceil(index)];
  return lower === undefined || upper === undefined ? null : lower + (upper - lower) * (index % 1);
}
/** Provider trailing ratios stay distinct from filing-derived subject denominators. */
export function summarizePeers(peers: Peer[], bases: Partial<Record<Multiple, number | null>>, shares: number | null, netDebt: number | null): ComparableEvidence['summaries'] {
  return MULTIPLES.flatMap(multiple => {
    const values = peers.map(p => p.multiples[multiple]).filter((v): v is number => v !== null && Number.isFinite(v) && v > 0);
    if (values.length < 3) return [];
    const low = quantile(values, .25), median = quantile(values, .5), high = quantile(values, .75);
    if (low === null || median === null || high === null) return [];
    const base = bases[multiple];
    const implied = (m: number) => {
      if (base === null || base === undefined || !Number.isFinite(base) || base <= 0 || shares === null || !Number.isFinite(shares) || shares <= 0) return null;
      const ev = multiple === 'evSales' || multiple === 'evEbitda';
      if (ev && (netDebt === null || !Number.isFinite(netDebt))) return null;
      const value = (base * m - (ev ? netDebt ?? 0 : 0)) / shares;
      return Number.isFinite(value) && value > 0 ? value : null;
    };
    return [{ multiple, count: values.length, low, median, high, impliedLow: implied(low), impliedBase: implied(median), impliedHigh: implied(high) }];
  });
}