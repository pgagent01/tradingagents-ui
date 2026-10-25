import { COMPANIES } from '@/lib/companies';
import { relevantMarkets, type PredictionFeed } from '@/lib/data-evidence';
import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { sectionObject } from '@/lib/report-content';
export async function getPredictionEvidence(sb:EvidenceClient,userId:string,ticker:string,asOf:string,signal:AbortSignal):Promise<PredictionFeed> {
  const today = new Date().toISOString().slice(0,10);
  if (asOf !== today) return {status:'historical_unavailable',fetchedAt:null,note:'Current Polymarket quotes omitted for a non-current analysis date. Historical probabilities were not retrieved.',markets:[]};
  const cacheKey=`v1:${ticker}:${today}`; const cached=await readDataCache(sb,userId,'polymarket',cacheKey);
  const cachedFeed=cached?.payload as PredictionFeed | undefined;
  if (cached?.fresh && cachedFeed?.markets) return {...cachedFeed,status:'cached'};
  const company=COMPANIES.find(c=>c.ticker===ticker); const aliases=company?.aliases ?? [];
  const terms=['Fed','Federal Reserve','interest rate','recession','inflation','GDP','unemployment','tariff','regulation','president',ticker,...aliases];
  const queries=['Fed','recession','tariff',aliases[0] ?? ticker];
  const urls=[new URL('https://gamma-api.polymarket.com/events/keyset'),...queries.map(q=>{const u=new URL('https://gamma-api.polymarket.com/public-search');u.search=new URLSearchParams({q,events_status:'active',limit_per_type:'8'}).toString();return u;})];
  const first=urls[0]; if(first) first.search=new URLSearchParams({active:'true',closed:'false',limit:'50',order:'volume',ascending:'false'}).toString();
  const batches=await Promise.all(urls.map(async url=>{try{const r=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(12000)])});if(!r.ok)return null;const body:unknown=await r.json();const events=sectionObject(body)['events'];return Array.isArray(events)?events.slice(0,50):null;}catch{return null;}}));
  if(signal.aborted) throw new DOMException('Cancelled','AbortError');
  if(batches.every(b=>b===null)) return cachedFeed?.markets ? {...cachedFeed,status:'cached',note:`Stale snapshot from ${cachedFeed.fetchedAt}; refresh unavailable.`} : {status:'unavailable',fetchedAt:null,note:'Public prediction markets could not be reached.',markets:[]};
  const feed:PredictionFeed={status:'live',fetchedAt:new Date().toISOString(),note:'Bounded public Gamma search; not an exhaustive market census. Quotes are crowd-implied probabilities, not calibrated forecasts. 1-day change is the API-reported price change for the first outcome, in percentage points; no shift is inferred when missing.',markets:relevantMarkets(batches.flatMap(b=>b??[]),terms,today)};
  await writeDataCache(sb,userId,'polymarket',cacheKey,feed,5*60*1000);
  return feed;
}