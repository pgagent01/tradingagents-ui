import { describe,it,expect,vi,afterEach } from 'vitest';
import { unifiedNews,technicalNewsEvents } from '@/lib/unified-news';
import { referenceMarkdown } from '@/lib/reference-export';
import type { NewsEvidence } from '@/lib/research-evidence';
import type { ReferenceEvidence } from '@/lib/reference-evidence';
import { readDataCache } from '@/lib/data-cache.server';
import { companyWikipedia } from '@/lib/company-reference.server';
vi.mock('@/lib/stock-data.server',()=>({secCik:async()=>null,secSubmissions:async()=>null}));
afterEach(()=>vi.unstubAllGlobals());
const base:NewsEvidence={status:'partial',cutoff:'2026-11-15',windowStart:'2026-11-01',fetchedAt:'2026-11-15',cached:false,notes:[],filings:[],filingsSource:null,headlines:[],headlinesSource:null};
const feed={status:'available' as const,cutoff:base.cutoff,fetchedAt:base.fetchedAt,cached:false,note:'partial',items:[]};
describe('shared evidence quality',()=>{
 it('counts one canonical article across RSS and Firecrawl while retaining retrieval provenance',()=>{
  const article={title:'Alphabet earnings guidance',publisher:'Publisher',publishedAt:'2026-11-14',url:'https://news.example/story?utm_source=yahoo',feed:'yahoo'};
  const r=unifiedNews({...base,headlines:[article]},{wikipedia:feed,firecrawl:{...feed,items:[{title:article.title,url:'https://news.example/story',publishedAt:article.publishedAt,text:'Partial description',kind:'search_excerpt'}]}});
  expect(r.headlines).toHaveLength(1);expect(r.headlines[0]?.retrievalServices).toEqual(['yahoo','firecrawl']);expect(r.headlines[0]?.excerpt).toBe('Partial description');expect(r.events).toHaveLength(1);
 });
 it.each(['Alphabet','Dell','Pfizer','JPMorgan','Rolls Royce'])('keeps opposite %s stories and rejects future/undated evidence',name=>{
  const articles=['raises','cuts'].map((v,i)=>({title:`${name} ${v} earnings guidance`,publisher:'p',publishedAt:'2026-11-14',url:`https://news.example/${i}`}));
  const result=unifiedNews({...base,headlines:[...articles,{...articles[0],title:'Future',url:'https://news.example/future',publishedAt:'2027-01-01'},{...articles[0],title:'Undated',url:'https://news.example/undated',publishedAt:''}] as NewsEvidence['headlines']},{wikipedia:feed,firecrawl:feed});
  expect(result.events).toHaveLength(2);expect(technicalNewsEvents(result,'2026-11-14','2026-11-15')).toHaveLength(2);expect(technicalNewsEvents(result,'2026-11-01','2026-11-13')).toEqual([]);
 });
 it('fails closed on a settings database error rather than treating it as missing',async()=>{
  const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null,error:{message:'outage'}})};
  const sb={from:()=>q} as unknown as Parameters<typeof readDataCache>[0];
  await expect(readDataCache(sb,'owner','data-provider-settings','fmp',true)).rejects.toThrow('could not be verified');
 });
 it('shares concurrent Wikipedia retrieval and uses the same saved revision on readback',async()=>{
  let payload:unknown=null;const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:payload?{payload,expires_at:'2099-01-01'}:null,error:null}),upsert:async(v:{payload:unknown})=>{payload=v.payload;return {error:null};}};
  const sb={from:()=>q} as unknown as Parameters<typeof companyWikipedia>[0];
  const fetcher=vi.fn(async()=>Response.json({query:{pages:[{title:'Alphabet Inc.',extract:'Alphabet is a technology conglomerate company.',revisions:[{revid:123,timestamp:new Date().toISOString()}]}]}}));vi.stubGlobal('fetch',fetcher);
  const date=new Date().toISOString().slice(0,10);
  const [a,b]=await Promise.all([companyWikipedia(sb,'owner','GOOGL','Alphabet',date),companyWikipedia(sb,'owner','GOOGL','Alphabet',date)]);
  expect(a.items[0]?.url).toBe('https://en.wikipedia.org/w/index.php?oldid=123');expect(b.items).toEqual(a.items);expect((await companyWikipedia(sb,'owner','GOOGL','Alphabet',date)).cached).toBe(true);expect(fetcher).toHaveBeenCalledOnce();
 });
 it('exports original reference links and dates without fetching',()=>{
  const refs:ReferenceEvidence={wikipedia:{...feed,items:[{title:'Alphabet',url:'https://en.wikipedia.org/w/index.php?oldid=123',text:'Company context',publishedAt:'2026-11-14',kind:'encyclopedia'}]},firecrawl:feed};
  expect(referenceMarkdown(refs)).toContain('oldid=123');expect(referenceMarkdown(refs)).toContain('Revision 2026-11-14');
 });
});