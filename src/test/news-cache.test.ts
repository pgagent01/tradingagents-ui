import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EvidenceClient } from '@/lib/data-cache.server';
const state = vi.hoisted(() => ({cache:new Map<string,{payload:unknown;fresh:boolean}>(),writes:[] as {owner:string;key:string;payload:unknown;ttl:number}[],fail:false}));
vi.mock('@/lib/data-cache.server', () => ({
  readDataCache: async (_:unknown,owner:string,provider:string,key:string) => state.cache.get(`${owner}:${provider}:${key}`) ?? null,
  writeDataCache: async (_:unknown,owner:string,provider:string,key:string,payload:unknown,ttl:number) => { state.writes.push({owner,key,payload,ttl});state.cache.set(`${owner}:${provider}:${key}`,{payload,fresh:true});return true; },
}));
vi.mock('@/lib/stock-data.server', () => ({secCik:async()=>null,secFacts:async()=>null,secSubmissions:async()=>null,
  yahooNewsSearch:vi.fn(async()=>{if(state.fail)throw Error('timeout');return {news:[{title:'Pfizer earnings beat estimates',publisher:'Reuters',providerPublishTime:Date.parse('2026-11-14T10:00:00Z')/1000,link:'https://news.example/pfe'},{title:'Unrelated market report',providerPublishTime:Date.parse('2026-11-14T10:00:00Z')/1000,link:'https://news.example/other'}]};}),
}));
import { yahooNewsSearch } from '@/lib/stock-data.server';
import { getNewsEvidence } from '@/lib/research-evidence.server';
const sb = {} as EvidenceClient;
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks();state.cache.clear();state.writes.length=0;state.fail=false;});
function setup(){vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));vi.stubGlobal('fetch',vi.fn(async()=>{if(state.fail)throw Error('timeout');return new Response('<rss/>');}));}
describe('shared news evidence cache',()=>{
  it('deduplicates concurrent reads and reuses a 30-minute owner-scoped durable snapshot',async()=>{
    setup(); const [a,b]=await Promise.all([getNewsEvidence(sb,'owner-a','PFE','2026-11-15',30),getNewsEvidence(sb,'owner-a','PFE','2026-11-15',30)]);
    expect(a).toEqual(b);expect(yahooNewsSearch).toHaveBeenCalledTimes(1);expect(a.events?.[0]?.coverage[0]?.title).toBe('Pfizer earnings beat estimates');expect(a.headlines).toHaveLength(1);
    expect(state.writes[0]).toMatchObject({owner:'owner-a',key:'v5:PFE:2026-11-15:30',ttl:1800000});
    const again=await getNewsEvidence(sb,'owner-a','PFE','2026-11-15',30);expect(again.cached).toBe(true);expect(yahooNewsSearch).toHaveBeenCalledTimes(1);
    await getNewsEvidence(sb,'owner-b','PFE','2026-11-15',30);expect(yahooNewsSearch).toHaveBeenCalledTimes(2);expect(state.writes[1]?.owner).toBe('owner-b');
  });
  it('preserves original stale retrieval time on outage without renewing the cache',async()=>{
    setup();const first=await getNewsEvidence(sb,'owner','PFE','2026-11-15',30);const entry=state.cache.get('owner:news-evidence:v5:PFE:2026-11-15:30');if(!entry)throw Error('No cache');entry.fresh=false;state.fail=true;
    vi.setSystemTime(new Date('2026-11-15T13:00:00Z'));const stale=await getNewsEvidence(sb,'owner','PFE','2026-11-15',30);
    expect(stale.fetchedAt).toBe(first.fetchedAt);expect(stale.sourceStates?.['Yahoo Finance search']?.status).toBe('failed');expect(state.writes).toHaveLength(1);expect(entry.fresh).toBe(false);
  });
  it('omits current feeds for historical dates and distinguishes empty from failed',async()=>{
    setup();const old=await getNewsEvidence(sb,'owner','PFE','2020-01-01',30);expect(yahooNewsSearch).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(old.sourceStates?.['Google News RSS']?.status).toBe('historical_unavailable');
    const current=await getNewsEvidence(sb,'owner','PFE','2026-11-15',30);expect(current.sourceStates?.['Google News RSS']?.status).toBe('empty');
  });
});