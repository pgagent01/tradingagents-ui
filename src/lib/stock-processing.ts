import type { StockData, Candle } from './stock-data';
export type PriceEvidence = { source:string; ticker:string; price:number|null; currency:string|null; asOf:string|null; url:string; kind:'quote'|'previous_close' };
/** Compare only the same security, unit and quote time; disagreement is never averaged away. */
export function comparePrices(primary:PriceEvidence, backup:PriceEvidence) {
  const a=Date.parse(primary.asOf??''),b=Date.parse(backup.asOf??'');
  const compatible=primary.ticker===backup.ticker&&!!primary.currency&&primary.currency===backup.currency&&primary.kind===backup.kind&&Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=300000;
  const valid=primary.price!==null&&backup.price!==null&&Number.isFinite(primary.price)&&Number.isFinite(backup.price)&&primary.price>0&&backup.price>0;
  const differencePct=compatible&&valid&&primary.price!==null&&backup.price!==null?(backup.price-primary.price)/primary.price*100:null;
  return {primary,backup,status:differencePct===null?'not_comparable' as const:Math.abs(differencePct)>1?'conflicting' as const:'consistent' as const,differencePct};
}
export function processCandles(candles:Candle[]) {
  const unique=new Map<number,Candle>();let rejected=0,duplicates=0,conflicts=0;const disputed=new Set<number>();
  for(const c of candles){
    if(![c.time,c.open,c.high,c.low,c.close].every(Number.isFinite)||c.time<=0||Math.min(c.open,c.high,c.low,c.close)<=0||c.high<Math.max(c.open,c.close)||c.low>Math.min(c.open,c.close)||c.low>c.high||c.volume!==null&&(!Number.isFinite(c.volume)||c.volume<0)){rejected++;continue;}
    const previous=unique.get(c.time);
    if(previous){duplicates++;if(['open','high','low','close','volume'].some(k=>previous[k as keyof Candle]!==c[k as keyof Candle])){conflicts++;disputed.add(c.time);}}
    else unique.set(c.time,{...c});
  }
  return {candles:[...unique.values()].filter(c=>!disputed.has(c.time)).sort((a,b)=>a.time-b.time),rejected,duplicates,conflicts};
}
/** Ticker-independent processing occurs before shared caching and model serialization. */
export function processStockData(data:StockData):StockData {
  const history=processCandles(data.candles);const warnings=[...data.warnings];
  if(history.rejected||history.conflicts)warnings.push(`Price-history validation: ${history.rejected} invalid bars and ${history.conflicts} conflicting duplicate bars withheld.`);
  const price=data.price!==null&&Number.isFinite(data.price)&&data.price>0?data.price:null;
  if(data.price!==null&&price===null)warnings.push('Invalid non-positive quote withheld.');
  const rows=(values:StockData['ratios'])=>values.map(row=>({...row,value:row.value!==null&&Number.isFinite(row.value)?row.value:null}));
  return {...data,price,candles:history.candles,ratios:rows(data.ratios),statements:{income:rows(data.statements.income),balance:rows(data.statements.balance),cash:rows(data.statements.cash)},warnings:[...new Set(warnings)]};
}