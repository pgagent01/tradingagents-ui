import { secFacts } from '@/lib/stock-data.server';
import { fundamentalEvidence } from '@/lib/research-evidence';
import { numeric, parseYahooChart, validTicker, yahooSymbol } from '@/lib/stock-data';
import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { selectSecFact } from '@/lib/sec-periods';
import { valuationBalance } from './financial-inputs';
import type { Candle } from '@/lib/stock-data';
import { cachedYahooStats } from './yahoo-stats.server';
import { standardMetric } from './standard-metrics';
import { snapshotDebt, qualityRatios, grossMarginTrend, riskStats, periodChange, snapshotRatios, extendedRatios, annualGrowth, offHigh, type PeerSnapshot, type PeerSnapshotRow } from './peer-snapshot';
async function chart(ticker: string): Promise<unknown> {
  for (const host of ['query1','query2']) {
    try { const r=await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(ticker))}?range=2y&interval=1d`,{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(6000)}); if(r.ok) return await r.json(); } catch { /* try second host */ }
  }
  return null;
}
async function row(ticker: string, role: 'subject'|'peer', today: string, spy: Candle[], sb: EvidenceClient, userId: string): Promise<PeerSnapshotRow> {
  const empty: PeerSnapshotRow={ticker,company:ticker,role,price:null,change1d:null,change30d:null,change1y:null,marketCap:null,ttmRevenue:null,ttmNetIncome:null,pe:null,ps:null,netMargin:null,revenuePeriodEnd:null,priceDate:null,note:null};
  const [raw,facts,ys]=await Promise.all([chart(ticker).catch(()=>null),secFacts(ticker).catch(()=>null),cachedYahooStats(sb,userId,ticker).catch(()=>null)]);
  const {candles,meta,price}=parseYahooChart(raw);
  const f=facts?fundamentalEvidence(facts,today):null;
  const currency=ys?.currency??(typeof meta['currency']==='string'?meta['currency']:null);
  const usd=currency==='USD';
  const financialUsd=ys?.financialCurrency==='USD';
  const shares=f?.valuationBalance?.shares?.value??null;
  const cap=ys?.marketCap ?? numeric(meta['marketCap']) ?? (price!==null && shares ? price*shares : null);
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
  const metricSources: Record<string,string>={};
  const choose=(key:string,reported:number|null|undefined,fallback:()=>number|null,description='Yahoo Finance · trailing 12 months')=>{
    const selected=standardMetric(reported,fallback,description,'Calculated · SEC aligned figures / daily prices');
    metricSources[key]=selected.source; return selected.value;
  };
  const previous=candles.at(-2);
  return {...empty,company:String(meta['longName']??meta['shortName']??ticker),
    price:choose('price',ys?.price,()=>price,'Yahoo Finance · current quote'),
    change1d:choose('change1d',ys?.change1d,()=>last&&previous&&previous.close>0?(last.close/previous.close-1)*100:null,'Yahoo Finance · daily quote change'),
    change30d:periodChange(candles,30),change1y:choose('change1y',ys?.change1y,()=>c1y,'Yahoo Finance · 52-week price change'),
    marketCap:usd?cap:null,
    ttmRevenue:choose('ttmRevenue',financialUsd?ys?.revenue:null,()=>revenue),
    ttmNetIncome:choose('ttmNetIncome',financialUsd?ys?.netIncome:null,()=>aligned?net:null),
    pe:choose('pe',ys?.trailingPe!=null&&ys.trailingPe>0?ys.trailingPe:null,()=>usd&&aligned?snapshotRatios(cap,revenue,net).pe:null),
    ps:choose('ps',ys?.ps,()=>usd&&aligned?snapshotRatios(cap,revenue,net).ps:null),
    ...ext,
    evSales:choose('evSales',ys?.evSales,()=>numeric('evSales' in ext?ext.evSales:null)),
    netMargin:choose('netMargin',ys?.netMargin,()=>aligned?snapshotRatios(cap,revenue,net).netMargin:null),
    operatingMargin:choose('operatingMargin',ys?.operatingMargin,()=>numeric('operatingMargin' in ext?ext.operatingMargin:null)),
    revenueGrowth:growth,provider:ys,currency,metricSources,
    note:[notes.join(' '),dbt.note,la?`Calculated yearly ratios use fiscal year ending ${la.end}.`:null,equity!==null&&equity<0?'Shareholders’ equity is negative, which inflates ROIC.':null].filter(Boolean).join(' ')||null,
    ...quality,grossMarginTrend:grossMarginTrend(ann),...risk,
    vsSpy1y:choose('vsSpy1y',ys?.change1y!=null&&ys.spyChange1y!=null?ys.change1y-ys.spyChange1y:null,()=>c1y!==null&&s1y!==null?c1y-s1y:null,'Yahoo Finance · stock minus S&P 500 52-week price change'),
    fiscalYearEnd:la?.end??null,offHigh:offHigh(candles),revenuePeriodEnd:financialUsd&&ys?.revenue!=null?null:f?.ttm?.revenue.periodEnd??null,priceDate:ys?.priceDate??(last?new Date(last.time*1000).toISOString().slice(0,10):null)};
}
/** Descriptive side-by-side table only: never feeds valuation math, which keeps its stricter verified-peer rules. */
export async function peerSnapshot(sb: EvidenceClient, userId: string, subject: string, candidates: string[], model: string|null): Promise<PeerSnapshot> {
  const picks=[...new Set(candidates.filter(t=>validTicker(t)&&t!==subject))].slice(0,3);
  const today=new Date().toISOString().slice(0,10);
  const key=`v10:${subject}:${picks.join(',')}:${today}`;
  const cached=await readDataCache(sb,userId,'peer-snapshot',key);
  if(cached?.fresh) return cached.payload as PeerSnapshot;
  const spy=parseYahooChart(await chart('SPY').catch(()=>null)).candles;
  const rows=await Promise.all([row(subject,'subject',today,spy,sb,userId),...picks.map(t=>row(t,'peer',today,spy,sb,userId))]);
  const snap: PeerSnapshot={retrievedAt:new Date().toISOString(),source:'Yahoo Finance reported trailing metrics first; SEC aligned calculations and daily price history only fill unavailable equivalents. Provider trailing periods can differ from SEC periods; per-metric sources are retained.',model,candidates:picks,rows,note:'Comparable companies suggested by the report’s own AI model. Descriptive comparison only; these companies were not required to share the exact SEC industry code, so they do not feed the valuation calculation. Figures are retrieved now, not as of the report date.'};
  await writeDataCache(sb,userId,'peer-snapshot',key,snap,30*60*1000);
  return snap;
}
