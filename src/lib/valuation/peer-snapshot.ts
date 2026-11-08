import type { Candle } from '@/lib/stock-data';
export type PeerSnapshotRow = { ticker: string; company: string; role: 'subject' | 'peer'; price: number | null; change1d: number | null; change30d: number | null; change1y: number | null; marketCap: number | null; ttmRevenue: number | null; ttmNetIncome: number | null; pe: number | null; ps: number | null; netMargin: number | null; evSales?: number | null; evEbit?: number | null; operatingMargin?: number | null; fcfMargin?: number | null; revenueGrowth?: number | null; offHigh?: number | null; revenuePeriodEnd: string | null; priceDate: string | null; note: string | null };
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

/** EV ratios need same-filing debt and cash; a missing debt figure is never treated as zero. Negative EBIT gives no EV/EBIT. */
export function extendedRatios(marketCap: number | null, debt: number | null, cash: number | null, revenue: number | null, operatingIncome: number | null, fcf: number | null) {
  const ev=marketCap!==null&&debt!==null&&cash!==null?marketCap+debt-cash:null;
  const pos=(n:number|null)=>n!==null&&n>0;
  return { evSales: ev!==null&&pos(revenue)?ev/revenue!:null, evEbit: ev!==null&&ev>0&&pos(operatingIncome)?ev/operatingIncome!:null, operatingMargin: pos(revenue)&&operatingIncome!==null?operatingIncome/revenue!*100:null, fcfMargin: pos(revenue)&&fcf!==null?fcf/revenue!*100:null };
}
/** Year-over-year growth between the two latest fiscal-year revenues; null when either is missing or the earlier is not positive. */
export function annualGrowth(latest: number | null | undefined, prior: number | null | undefined): number | null {
  return typeof latest==='number'&&typeof prior==='number'&&prior>0?(latest/prior-1)*100:null;
}
/** % below the highest close of the last 365 days. */
export function offHigh(candles: Candle[]): number | null {
  const last=candles.at(-1); if(!last) return null;
  const hi=Math.max(...candles.filter(c=>c.time>=last.time-365*DAY).map(c=>c.close));
  return hi>0?(last.close/hi-1)*100:null;
}
