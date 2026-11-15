import {describe,it,expect,vi,afterEach} from 'vitest';
import {firecrawlReferences,wikipediaReference,publicReferenceUrl} from '@/lib/reference-evidence';
import {evidenceContext,type ResearchEvidence} from '@/lib/data-evidence';
vi.mock('@/lib/data-cache.server',()=>({readDataCache:async()=>null,writeDataCache:async()=>true}));
vi.mock('@/lib/stock-data.server',()=>({secCik:async()=>null,secSubmissions:async()=>null}));
import {getReferenceEvidence} from '@/lib/reference-evidence.server';
afterEach(()=>vi.unstubAllGlobals());
describe('reference evidence',()=>{
 it('requires an unambiguous dated company revision',()=>{
  const raw={query:{pages:[{title:'Alphabet Inc.',extract:'Alphabet is a technology conglomerate company.',revisions:[{revid:123,timestamp:'2026-11-14T12:00:00Z'}]}]}};
  expect(wikipediaReference(raw,'Alphabet','2026-11-15T12:00:00Z')[0]?.url).toBe('https://en.wikipedia.org/w/index.php?oldid=123');
  expect(wikipediaReference(raw,'Amazon','2026-11-15T12:00:00Z')).toEqual([]);
  expect(wikipediaReference(raw,'Alphabet','2020-01-01T12:00:00Z')).toEqual([]);
 });
 it('withholds undated, relative-date, irrelevant and future Firecrawl excerpts',()=>{
  const base={title:'Alphabet news',url:'https://news.example/a',snippet:'Company news',date:'2026-11-14'};
  const r=firecrawlReferences({data:{news:[base,{...base,url:'https://news.example/b',date:'2 hours ago'},{...base,url:'https://news.example/c',date:'2027-01-01'},{...base,url:'https://news.example/d',date:undefined}]}},'2026-11-01T00:00:00Z','2026-11-15T12:00:00Z',()=>true);
  expect(r).toHaveLength(1);expect(r[0]?.kind).toBe('search_excerpt');expect(publicReferenceUrl('https://127.0.0.1/a')).toBeNull();
 });
 it('routes Wikipedia and Firecrawl evidence to every relevant existing analyst',()=>{
  const feed={status:'available' as const,cutoff:'2026-11-15',fetchedAt:'2026-11-15',cached:false,note:'reference',items:[{title:'Alphabet',url:'https://en.wikipedia.org/w/index.php?oldid=123',text:'REFERENCE_MARKER',publishedAt:'2026-11-14',kind:'encyclopedia' as const}]};
  const e:ResearchEvidence={macro:{status:'unavailable',asOf:'',fetchedAt:null,note:'',metrics:[]},predictions:{status:'unavailable',fetchedAt:null,note:'',markets:[]},references:{wikipedia:feed,firecrawl:feed}};
  for(const a of ['fundamentals','news','sentiment','risk','debate','synthesis'])expect(evidenceContext(a,e)).toContain('REFERENCE_MARKER');
 });
 it('does not read credentials or fetch current sources for historical research',async()=>{
  const f=vi.fn();vi.stubGlobal('fetch',f);const r=await getReferenceEvidence({} as Parameters<typeof getReferenceEvidence>[0],'owner','GOOGL','2020-01-01',30);expect(r.wikipedia.status).toBe('historical_unavailable');expect(r.firecrawl.status).toBe('historical_unavailable');expect(f).not.toHaveBeenCalled();
 });
 it('never sends another account to Firecrawl',async()=>{
  const fetcher=vi.fn(async(_url:RequestInfo|URL)=>Response.json({query:{pages:[]}}));vi.stubGlobal('fetch',fetcher);
  const sb={auth:{getUser:async()=>({data:{user:{id:'other',email:'other@example.com'}},error:null})}} as unknown as Parameters<typeof getReferenceEvidence>[0];
  const r=await getReferenceEvidence(sb,'other','GOOGL',new Date().toISOString().slice(0,10),30);expect(r.firecrawl.status).toBe('unavailable');expect(fetcher.mock.calls.every(c=>!String(c[0]).includes('firecrawl.dev'))).toBe(true);
 });
});