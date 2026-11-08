import { secFacts } from '@/lib/stock-data.server';
import { fundamentalEvidence } from '@/lib/research-evidence';
import { numeric, parseYahooChart, validTicker, yahooSymbol } from '@/lib/stock-data';
import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { selectSecFact } from '@/lib/sec-periods';
import { valuationBalance } from './financial-inputs';
import type { Candle } from '@/lib/stock-data';
import { yahooStats, ratioMismatch } from './yahoo-stats.server';
import { snapshotDebt, qualityRatios, grossMarginTrend, riskStats, periodChange, snapshotRatios, extendedRatios, annualGrowth, offHigh, type PeerSnapshot, type PeerSnapshotRow } from './peer-snapshot';
async function chart(ticker: string): Promise<unknown> {
  for (const host of ['query1','query2']) {
    try { const r=await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(ticker))}?range=2y&interval=1d`,{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(6000)}); if(r.ok) return await r.json(); } catch { /* try second host */ }
  }
  return null;
}
async function row(ticker: string, role: 'subject'|'peer', today: string, spy: Candle[]): Promise<PeerSnapshotRow> {
  const empty: PeerSnapshotRow={ticker,company:ticker,role,price:null,change1d:null,change30d:null,change1y:null,marketCap:null,ttmRevenue:null,ttmNetIncome:null,pe:null,ps:null,netMargin:null,revenuePeriodEnd:null,priceDate:null,note:null};
  const [raw,facts,ys]=await Promise.all([chart(ticker).catch(()=>null),secFacts(ticker).catch(()=>null),yahooStats(ticker).catch(()=>null)]);
  const {candles,meta,price}=parseYahooChart(raw);
  const f=facts?fundamentalEvidence(facts,today):null;
  const usd=meta['currency']===undefined||meta['currency']==='USD';
  const shares=f?.valuationBalance?.shares?.value??null;
  const cap=numeric(meta['marketCap']) ?? ys?.marketCap ?? (price!==null && shares ? price*shares : null);
  const revenue=f?.ttm?.revenue.value??null, net=f?.ttm?.netIncome.value??null;
  const aligned=f?.ttm && f.ttm.revenue.periodEnd===f.ttm.netIncome.periodEnd;
  const notes=[!raw?'Price history unavailable.':null,!usd?`Quoted in ${String(meta['currency'])}; ratios withheld.`:null,!f||revenue===null?'SEC trailing figures unavailable (may be a foreign filer).':null,numeric(meta['marketCap'])===null&&!ys?.marketCap&&cap!==null?'Market cap = price × SEC period-end shares.':null].filter(Boolean);
  const last=candles.at(-1);
  const ann=f?.annual??[];
  const la=ann.at(-1); const anchor=la?{accn:la.accession,end:la.end,start:la.start??null,filed:la.filed,form:la.form}:null;
  const gaap=((facts as {facts?:{'us-gaap'?:Record<string,unknown>}}|null)?.facts?.['us-gaap'])??null;
  const g=(tags:string[],kind:'annual'|'instant')=>gaap&&anchor?selectSecFact(gaap,tags,anchor,kind,'USD',today)?.value??null:null;
  const ab=gaap&&anchor?valuationBalance(gaap,anchor,today,(facts as {facts?:{dei?:Record<string,unknown>}}).facts?.dei):null;
  const gi=(tags:string[])=>g(tags,'instant');
  const dbt=snapshotDebt(ab?.debt?.value??null,{longTermDebt:gi(['LongTermDebt']),debtCurrent:gi(['DebtCurrent']),ltdCurrent:gi(['LongTermDebtCurrent']),shortTerm:gi(['ShortTermBorrowings','CommercialPaper','ShortTermDebtCurrent'])});
  const ext=usd&&aligned?extendedRatios(cap,dbt.value,ab?.cash?.value??null,revenue,f?.ttm?.operatingIncome.value??null,f?.ttm?.freeCashFlow??null):{};
  const equity=g(['StockholdersEquity','StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],'instant');
  const quality=usd?qualityRatios({operatingIncome:la?.operatingIncome??null,da:g(['DepreciationDepletionAndAmortization','DepreciationAndAmortization','DepreciationAmortizationAndAccretionNet'],'annual'),debt:dbt.value,cash:ab?.cash?.value??null,equity,dividends:g(['PaymentsOfDividends','PaymentsOfDividendsCommonStock','PaymentsOfOrdinaryDividends'],'annual'),buybacks:g(['PaymentsForRepurchaseOfCommonStock'],'annual'),ttmFcf:aligned?f?.ttm?.freeCashFlow??null:null,marketCap:cap}):{};
  const risk=riskStats(candles,spy); const c1y=periodChange(candles,365), s1y=periodChange(spy,365);
  const growth=annualGrowth(ann.at(-1)?.revenue,ann.at(-2)?.revenue);
  return {...empty,company:String(meta['longName']??meta['shortName']??ticker),price,change1d:candles.length>1&&candles.at(-2)!.close>0?(candles.at(-1)!.close-candles.at(-2)!.close)/candles.at(-2)!.close*100:null,change30d:periodChange(candles,30),change1y:periodChange(candles,365),marketCap:usd?cap:null,ttmRevenue:revenue,ttmNetIncome:aligned?net:null,...(usd&&aligned?snapshotRatios(cap,revenue,net):{pe:null,ps:null,netMargin:null}),...ext,revenueGrowth:growth,provider:ys,currency:typeof meta['currency']==='string'?meta['currency'] as string:null,note:[notes.join(' '),ratioMismatch((ext as {evSales?:number|null}).evSales,ys?.evSales??null)?`EV/Sales differs from Yahoo's ${ys!.evSales!.toFixed(2)}× by more than 15% (different debt, cash or period).`:null,dbt.note,la?`Debt, cash and yearly ratios from fiscal year ending ${la.end}.`:null,equity!==null&&equity<0?'Shareholders’ equity is negative, which inflates ROIC.':null].filter(Boolean).join(' ')||null,...quality,grossMarginTrend:grossMarginTrend(ann),...risk,vsSpy1y:c1y!==null&&s1y!==null?c1y-s1y:null,fiscalYearEnd:la?.end??null,offHigh:offHigh(candles),revenuePeriodEnd:f?.ttm?.revenue.periodEnd??null,priceDate:last?new Date(last.time*1000).toISOString().slice(0,10):null};
}
/** Descriptive side-by-side table only: never feeds valuation math, which keeps its stricter verified-peer rules. */
export async function peerSnapshot(sb: EvidenceClient, userId: string, subject: string, candidates: string[], model: string|null): Promise<PeerSnapshot> {
  const picks=[...new Set(candidates.filter(t=>validTicker(t)&&t!==subject))].slice(0,3);
  const today=new Date().toISOString().slice(0,10);
  const key=`v9:${subject}:${picks.join(',')}:${today}`;
  const cached=await readDataCache(sb,userId,'peer-snapshot',key);
  if(cached?.fresh) return cached.payload as PeerSnapshot;
  const spy=parseYahooChart(await chart('SPY').catch(()=>null)).candles;
  const rows=await Promise.all([row(subject,'subject',today,spy),...picks.map(t=>row(t,'peer',today,spy))]);
  const snap: PeerSnapshot={retrievedAt:new Date().toISOString(),source:'Yahoo Finance daily chart (price, changes, market cap) and SEC XBRL trailing twelve months (revenue, net income) and Yahoo Finance key statistics (columns marked Yahoo, provider definitions)',model,candidates:picks,rows,note:'Comparable companies suggested by the report’s own AI model. Descriptive comparison only; these companies were not required to share the exact SEC industry code, so they do not feed the valuation calculation. Figures are retrieved now, not as of the report date.'};
  await writeDataCache(sb,userId,'peer-snapshot',key,snap,30*60*1000);
  return snap;
}
