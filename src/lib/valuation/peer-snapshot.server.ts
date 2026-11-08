import { secFacts } from '@/lib/stock-data.server';
import { fundamentalEvidence } from '@/lib/research-evidence';
import { numeric, parseYahooChart, validTicker } from '@/lib/stock-data';
import { readDataCache, writeDataCache } from '@/lib/data-cache.server';
import type { EvidenceClient } from '@/lib/research-evidence.server';
import { periodChange, snapshotRatios, type PeerSnapshot, type PeerSnapshotRow } from './peer-snapshot';
async function chart(ticker: string): Promise<unknown> {
  for (const host of ['query1','query2']) {
    try { const r=await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker.replace('.','-'))}?range=1y&interval=1d`,{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(6000)}); if(r.ok) return await r.json(); } catch { /* try second host */ }
  }
  return null;
}
async function row(ticker: string, role: 'subject'|'peer', today: string): Promise<PeerSnapshotRow> {
  const empty: PeerSnapshotRow={ticker,company:ticker,role,price:null,change1d:null,change30d:null,change1y:null,marketCap:null,ttmRevenue:null,ttmNetIncome:null,pe:null,ps:null,netMargin:null,revenuePeriodEnd:null,priceDate:null,note:null};
  const [raw,facts]=await Promise.all([chart(ticker).catch(()=>null),secFacts(ticker).catch(()=>null)]);
  const {candles,meta,price,changePercent}=parseYahooChart(raw);
  const f=facts?fundamentalEvidence(facts,today):null;
  const usd=meta['currency']===undefined||meta['currency']==='USD';
  const shares=f?.valuationBalance?.shares?.value??null;
  const cap=numeric(meta['marketCap']) ?? (price!==null && shares ? price*shares : null);
  const revenue=f?.ttm?.revenue.value??null, net=f?.ttm?.netIncome.value??null;
  const aligned=f?.ttm && f.ttm.revenue.periodEnd===f.ttm.netIncome.periodEnd;
  const notes=[!raw?'Price history unavailable.':null,!usd?`Quoted in ${String(meta['currency'])}; ratios withheld.`:null,!f||revenue===null?'SEC trailing figures unavailable (may be a foreign filer).':null,numeric(meta['marketCap'])===null&&cap!==null?'Market cap = price × SEC period-end shares.':null].filter(Boolean);
  const last=candles.at(-1);
  return {...empty,company:String(meta['longName']??meta['shortName']??ticker),price,change1d:changePercent,change30d:periodChange(candles,30),change1y:periodChange(candles,365),marketCap:usd?cap:null,ttmRevenue:revenue,ttmNetIncome:aligned?net:null,...(usd&&aligned?snapshotRatios(cap,revenue,net):{pe:null,ps:null,netMargin:null}),revenuePeriodEnd:f?.ttm?.revenue.periodEnd??null,priceDate:last?new Date(last.time*1000).toISOString().slice(0,10):null,note:notes.join(' ')||null};
}
/** Descriptive side-by-side table only: never feeds valuation math, which keeps its stricter verified-peer rules. */
export async function peerSnapshot(sb: EvidenceClient, userId: string, subject: string, candidates: string[], model: string|null): Promise<PeerSnapshot> {
  const picks=[...new Set(candidates.filter(t=>validTicker(t)&&t!==subject))].slice(0,3);
  const today=new Date().toISOString().slice(0,10);
  const key=`v1:${subject}:${picks.join(',')}:${today}`;
  const cached=await readDataCache(sb,userId,'peer-snapshot',key);
  if(cached?.fresh) return cached.payload as PeerSnapshot;
  const rows=await Promise.all([row(subject,'subject',today),...picks.map(t=>row(t,'peer',today))]);
  const snap: PeerSnapshot={retrievedAt:new Date().toISOString(),source:'Yahoo Finance daily chart (price, changes, market cap) and SEC XBRL trailing twelve months (revenue, net income)',model,candidates:picks,rows,note:'Comparable companies suggested by the report’s own AI model. Descriptive comparison only; these companies were not required to share the exact SEC industry code, so they do not feed the valuation calculation. Figures are retrieved now, not as of the report date.'};
  await writeDataCache(sb,userId,'peer-snapshot',key,snap,30*60*1000);
  return snap;
}
