import type { Candle } from '@/lib/stock-data';
export type PeerSnapshotRow = { ticker: string; company: string; role: 'subject' | 'peer'; price: number | null; change1d: number | null; change30d: number | null; change1y: number | null; marketCap: number | null; ttmRevenue: number | null; ttmNetIncome: number | null; pe: number | null; ps: number | null; netMargin: number | null; evSales?: number | null; evEbit?: number | null; operatingMargin?: number | null; fcfMargin?: number | null; revenueGrowth?: number | null; offHigh?: number | null; roic?: number | null; netDebtEbitda?: number | null; fcfYield?: number | null; shareholderYield?: number | null; grossMarginTrend?: number | null; beta?: number | null; volatility?: number | null; vsSpy1y?: number | null; fiscalYearEnd?: string | null; provider?: { enterpriseValue: number | null; evSales: number | null; evEbitda: number | null; forwardPe: number | null; peg: number | null; beta5y: number | null; roe: number | null; roa: number | null; dividendYield: number | null; currency: string | null; marketCap?: number | null } | null; currency?: string | null; revenuePeriodEnd: string | null; priceDate: string | null; note: string | null };
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

/** Statutory US federal rate used for after-tax operating income in ROIC; labeled in the UI. */
export const ROIC_TAX_RATE = 0.21;
export type QualityInputs = { operatingIncome: number | null; da: number | null; debt: number | null; cash: number | null; equity: number | null; dividends: number | null; buybacks: number | null; ttmFcf: number | null; marketCap: number | null };
/** Latest fiscal-year, same-filing figures. Every ratio needs all of its inputs; missing never becomes zero. */
export function qualityRatios(i: QualityInputs) {
  const invested=i.debt!==null&&i.equity!==null&&i.cash!==null?i.debt+i.equity-i.cash:null;
  const ebitda=i.operatingIncome!==null&&i.da!==null?i.operatingIncome+i.da:null;
  const capOk=i.marketCap!==null&&i.marketCap>0;
  return {
    roic: invested!==null&&invested>0&&i.operatingIncome!==null?i.operatingIncome*(1-ROIC_TAX_RATE)/invested*100:null,
    netDebtEbitda: ebitda!==null&&ebitda>0&&i.debt!==null&&i.cash!==null?(i.debt-i.cash)/ebitda:null,
    fcfYield: capOk&&i.ttmFcf!==null?i.ttmFcf/i.marketCap!*100:null,
    shareholderYield: capOk&&i.dividends!==null&&i.buybacks!==null?(Math.abs(i.dividends)+Math.abs(i.buybacks))/i.marketCap!*100:null,
  };
}
/** Percentage-point change in gross margin between the oldest and newest of the last three fiscal years. */
export function grossMarginTrend(periods: {revenue: number | null; grossProfit: number | null}[]): number | null {
  const last=periods.slice(-3); if(last.length<3) return null;
  const m=(p:{revenue:number|null;grossProfit:number|null})=>p.revenue!==null&&p.revenue>0&&p.grossProfit!==null?p.grossProfit/p.revenue*100:null;
  const a=m(last[0]!),b=m(last[2]!); return a===null||b===null?null:b-a;
}
/** One-year raw beta and annualized volatility from daily closes matched by date to SPY; needs ≥120 shared returns. */
export function riskStats(stock: Candle[], spy: Candle[]): { beta: number | null; volatility: number | null } {
  const last=stock.at(-1); if(!last) return {beta:null,volatility:null};
  const day=(c:Candle)=>Math.floor(c.time/DAY);
  const spyBy=new Map(spy.map(c=>[day(c),c.close]));
  const s=stock.filter(c=>c.time>=last.time-365*DAY&&spyBy.has(day(c)));
  const rs:number[]=[],rm:number[]=[];
  for(let k=1;k<s.length;k++){const a=s[k-1]!,b=s[k]!,ma=spyBy.get(day(a))!,mb=spyBy.get(day(b))!;if(a.close>0&&ma>0){rs.push(b.close/a.close-1);rm.push(mb/ma-1);}}
  if(rs.length<120) return {beta:null,volatility:null};
  const mean=(x:number[])=>x.reduce((p,v)=>p+v,0)/x.length; const ms=mean(rs),mm=mean(rm);
  let cov=0,vm=0,vs=0; rs.forEach((r,k)=>{cov+=(r-ms)*(rm[k]!-mm);vm+=(rm[k]!-mm)**2;vs+=(r-ms)**2;});
  return {beta:vm>0?cov/vm:null,volatility:Math.sqrt(vs/(rs.length-1))*Math.sqrt(252)*100};
}
/** Snapshot-only debt fallback when the strict valuation total is missing:
 *  total long-term debt (incl. current portion) + short-term remainder of DebtCurrent; or total long-term debt
 *  alone when the same filing tags no short-term borrowing concept at all (labeled). Never used by valuation math. */
export function snapshotDebt(strict: number | null, f: { longTermDebt: number | null; debtCurrent: number | null; ltdCurrent: number | null; shortTerm: number | null; shortTagged?: boolean }): { value: number | null; note: string | null } {
  if (strict!==null) return {value:strict,note:null};
  if (f.longTermDebt===null) return {value:null,note:null};
  if (f.debtCurrent!==null&&f.ltdCurrent!==null&&f.debtCurrent>=f.ltdCurrent) return {value:f.longTermDebt+f.debtCurrent-f.ltdCurrent,note:'Debt = total long-term debt + short-term borrowings.'};
  if (f.debtCurrent===null&&f.shortTerm!==null) return {value:f.longTermDebt+f.shortTerm,note:'Debt = total long-term debt + reported short-term borrowings.'};
  if (f.debtCurrent===null) return {value:f.longTermDebt,note:'Debt = total long-term debt; filing reports no short-term borrowings.'};
  return {value:null,note:null};
}
