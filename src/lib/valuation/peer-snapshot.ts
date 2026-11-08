import type { Candle } from '@/lib/stock-data';
export type PeerSnapshotRow = { ticker: string; company: string; role: 'subject' | 'peer'; price: number | null; change1d: number | null; change30d: number | null; change1y: number | null; marketCap: number | null; ttmRevenue: number | null; ttmNetIncome: number | null; pe: number | null; ps: number | null; netMargin: number | null; revenuePeriodEnd: string | null; priceDate: string | null; note: string | null };
export type PeerSnapshot = { retrievedAt: string; source: string; model: string | null; candidates: string[]; rows: PeerSnapshotRow[]; note: string };
const DAY=86400;
/** % change from the last close on/before `days` calendar days before the latest bar; null when history is too short. */
export function periodChange(candles: Candle[], days: number): number | null {
  if (candles.length < 2) return null;
  const last=candles.at(-1)!; const target=last.time-days*DAY;
  if (candles[0]!.time > target + 4*DAY) return null;
  const base=[...candles].reverse().find(c=>c.time<=target);
  return base && base.close>0 ? (last.close-base.close)/base.close*100 : null;
}
/** Ratios only when the denominator is positive; losses never become negative P/E. */
export function snapshotRatios(marketCap: number | null, revenue: number | null, netIncome: number | null) {
  return { pe: marketCap!==null && netIncome!==null && netIncome>0 ? marketCap/netIncome : null, ps: marketCap!==null && revenue!==null && revenue>0 ? marketCap/revenue : null, netMargin: revenue!==null && revenue>0 && netIncome!==null ? netIncome/revenue*100 : null };
}
