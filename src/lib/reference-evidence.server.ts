import { readDataCache, writeDataCache, type EvidenceClient } from './data-cache.server';
import { COMPANIES } from './companies';
import { secCik, secSubmissions } from './stock-data.server';
import { isRelevantHeadline, relevanceTerms } from './research-evidence';
import { firecrawlReferences, wikipediaReference, publicReferenceUrl, type ReferenceEvidence, type ReferenceFeed } from './reference-evidence';
import { object } from './stock-data';
import { firecrawlCredential, type FirecrawlCredential } from './firecrawl-credentials.server';

const pending=new Map<string,Promise<ReferenceEvidence>>();
function feed(cutoff:string,note:string,status:ReferenceFeed['status']='unavailable'):ReferenceFeed{return {cutoff,note,status,fetchedAt:new Date().toISOString(),cached:false,items:[]};}
async function boundedJson(response:Response) {
  const reader=response.body?.getReader(); if(!reader)throw Error('Empty response');
  const chunks:Uint8Array[]=[]; let size=0;
  try { while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>500000)throw Error('Response too large');chunks.push(r.value);} }
  finally { await reader.cancel(); }
  const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
async function wikipedia(name:string,cutoff:string):Promise<ReferenceFeed>{
  const result=feed(cutoff,'Wikipedia secondary company context; revision date is not the effective date of every fact. CC BY-SA; original revision linked.');
  try {
    const q=new URLSearchParams({action:'query',generator:'search',gsrsearch:`${name} company`,gsrlimit:'3',prop:'extracts|revisions',exintro:'1',explaintext:'1',exchars:'3000',rvprop:'ids|timestamp',format:'json',formatversion:'2'});
    const r=await fetch(`https://en.wikipedia.org/w/api.php?${q}`,{headers:{'User-Agent':'TradingAgentsAI company research (https://tradingagents-ui.lovable.app)'},signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!r.ok)return {...result,httpStatus:r.status,note:`Wikipedia retrieval unavailable (HTTP ${r.status}).`};
    result.items=wikipediaReference(await boundedJson(r),name,new Date().toISOString());result.status=result.items.length?'available':'unavailable';
    if(!result.items.length)result.note+=' No unambiguous dated company page verified.';
  }catch{result.note='Wikipedia retrieval failed or timed out; no context invented.';}
  return result;
}
async function firecrawl(credential:FirecrawlCredential,name:string,ticker:string,cutoff:string,lookback:number):Promise<ReferenceFeed>{
  const result=feed(cutoff,'Firecrawl search excerpts from original publishers; partial coverage, not full article bodies or verified facts.');
  const {key}=credential;
  const gatewayKey=process.env['LOVABLE_API_KEY'];
  if(credential.gateway&&!gatewayKey)return {...result,note:'Firecrawl connection is unavailable.'};
  const base=credential.gateway?'https://connector-gateway.lovable.dev/firecrawl/v2':'https://api.firecrawl.dev/v2';
  const headers:Record<string,string>=credential.gateway?{Authorization:`Bearer ${gatewayKey}`,'X-Connection-Api-Key':key,'Content-Type':'application/json'}:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  try {
    const r=await fetch(`${base}/search`,{method:'POST',headers,body:JSON.stringify({query:`"${name}" stock news`,limit:3,sources:['news'],tbs:'qdr:m'}),signal:AbortSignal.timeout(20000),redirect:'error'});
    if(!r.ok){await r.body?.cancel();return {...result,httpStatus:r.status,note:`Firecrawl search unavailable (HTTP ${r.status}); no automatic retry or bypass. Other sources remain usable.`};}
    const raw=await boundedJson(r);if(object(raw)['success']===false)return {...result,note:'Firecrawl reported an unsuccessful search; no automatic retry.'};
    // Search often returns relative dates. Verify publication metadata on at most two explicit public publisher hosts.
    const news=object(object(raw)['data'])['news'];const verified:unknown[]=[];
    for(const item of (Array.isArray(news)?news:[]).slice(0,2)){
      const entry=object(item),url=publicReferenceUrl(entry['url']);if(!url)continue;
      if(!['finance.yahoo.com','apnews.com','www.nbcnews.com'].includes(new URL(url).hostname))continue;
      try{
        const scrape=await fetch(`${base}/scrape`,{method:'POST',headers,body:JSON.stringify({url,formats:['markdown'],onlyMainContent:true,maxAge:1800000,timeout:15000}),signal:AbortSignal.timeout(18000),redirect:'error'});
        if(!scrape.ok){await scrape.body?.cancel();if([401,402,403,429].includes(scrape.status))break;continue;}
        const scraped=object(await boundedJson(scrape));if(scraped['success']===false)continue;
        const d=object(scraped['data']),meta=object(d['metadata']);
        const finalUrl=publicReferenceUrl(meta['sourceURL']??url);if(!finalUrl||!['finance.yahoo.com','apnews.com','www.nbcnews.com'].includes(new URL(finalUrl).hostname))continue;
        const date=meta['article:published_time']??meta['datePublished']??meta['publishedTime']??meta['pubdate'];
        const content=typeof d['markdown']==='string'?d['markdown'].slice(0,1800):entry['snippet'];
        verified.push({...entry,url:finalUrl,date,snippet:content});
      }catch{/* Unverified publication dates remain withheld; no retry. */}
    }
    const terms=relevanceTerms(ticker,name);const start=new Date(Date.parse(`${cutoff}T00:00:00Z`)-lookback*86400000).toISOString();
    result.items=firecrawlReferences({data:{news:[...verified,...(Array.isArray(news)?news:[])]}},start,new Date().toISOString(),title=>isRelevantHeadline(title,terms));result.status=result.items.length?'available':'unavailable';
    if(!result.items.length)result.note+=' No relevant excerpts with verified explicit publication dates returned; undated and relative-date results withheld.';
  }catch{result.note='Firecrawl search failed or timed out; no automatic retry. Other sources remain usable.';}
  return result;
}
export async function getReferenceEvidence(sb:EvidenceClient,userId:string,ticker:string,cutoff:string,lookback:number):Promise<ReferenceEvidence>{
  if(cutoff!==new Date().toISOString().slice(0,10))return {wikipedia:feed(cutoff,'Current Wikipedia excluded: historical revision context is not implemented.','historical_unavailable'),firecrawl:feed(cutoff,'Current Firecrawl search excluded from historical research.','historical_unavailable')};
  let credential:FirecrawlCredential|null=null;
  let unavailableNote='No Firecrawl key configured for your account. Add your own in Settings; other sources remain usable.';
  try { credential=await firecrawlCredential(sb,userId); }
  catch(e) { unavailableNote=e instanceof Error?e.message:'Firecrawl credentials unavailable.'; }
  const id=`${userId}:${credential?.version??'none'}:${ticker}:${cutoff}:${lookback}`;const existing=pending.get(id);if(existing)return existing;
  const request=load(sb,userId,ticker,cutoff,lookback,credential,unavailableNote).finally(()=>pending.delete(id));if(pending.size<100)pending.set(id,request);return request;
}
async function load(sb:EvidenceClient,userId:string,ticker:string,cutoff:string,lookback:number,credential:FirecrawlCredential|null,unavailableNote:string):Promise<ReferenceEvidence>{
  let name=COMPANIES.find(c=>c.ticker===ticker)?.name??ticker;
  try{const cik=await secCik(ticker);if(cik){const subs=object(await secSubmissions(cik));if(typeof subs['name']==='string')name=subs['name'];}}catch{/* Saved catalog remains usable. */}
  name=name.replace(/\b(incorporated|inc\.?|corp\.?|corporation|plc|ltd\.?)\b/gi,'').replace(/[,.]/g,' ').replace(/\s+/g,' ').trim();
  async function cached(provider:string,ttl:number,fetcher:()=>Promise<ReferenceFeed>){
    if(provider==='firecrawl-research'){
      if(!credential)return feed(cutoff,unavailableNote);
    }
    const key=provider==='firecrawl-research'?`v2:${credential?.version}:${ticker}:${cutoff}:${lookback}`:`v1:${ticker}:${cutoff}:${lookback}`;const c=await readDataCache(sb,userId,provider,key);const saved=c?.payload as ReferenceFeed|undefined;
    if(c?.fresh&&saved?.cutoff)return {...saved,cached:true};
    const fresh=await fetcher();if(fresh.status==='available')await writeDataCache(sb,userId,provider,key,fresh,ttl);
    // No stale Firecrawl fallback after authorization/entitlement failures.
    if(saved?.status==='available'&&fresh.status==='unavailable'&&provider==='wikipedia-research')return {...saved,cached:true,note:`${saved.note} Stale snapshot from ${saved.fetchedAt}; refresh unavailable.`};
    return fresh;
  }
  const [wiki,fire]=await Promise.all([cached('wikipedia-research',86400000,()=>wikipedia(name,cutoff)),cached('firecrawl-research',1800000,()=>credential?firecrawl(credential,name,ticker,cutoff,lookback):Promise.resolve(feed(cutoff,unavailableNote)))]);
  return {wikipedia:wiki,firecrawl:fire};
}