import {describe,it,expect,vi,afterEach} from 'vitest';
import {firecrawlReferences,wikipediaReference,publicReferenceUrl} from '@/lib/reference-evidence';
import {evidenceContext,type ResearchEvidence} from '@/lib/data-evidence';
vi.mock('@/lib/data-cache.server',()=>({readDataCache:async()=>null,writeDataCache:async()=>true}));
vi.mock('@/lib/stock-data.server',()=>({secCik:async()=>null,secSubmissions:async()=>null}));
import {getReferenceEvidence} from '@/lib/reference-evidence.server';
import {encryptSecret} from '@/lib/crypto.server';
import {firecrawlCredential} from '@/lib/firecrawl-credentials.server';
import {normalizeCredentialProvider,normalizeProvider} from '@/lib/access-rules';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
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
 it('never sends another account without its own key to Firecrawl',async()=>{
  vi.stubEnv('FIRECRAWL_API_KEY','owner-only-test-key');
  const fetcher=vi.fn(async(_url:RequestInfo|URL)=>Response.json({query:{pages:[]}}));vi.stubGlobal('fetch',fetcher);
  const sb=client('other','other@example.com',null);
  const r=await getReferenceEvidence(sb,'other','GOOGL',new Date().toISOString().slice(0,10),30);expect(r.firecrawl.status).toBe('unavailable');expect(fetcher.mock.calls.every(c=>!String(c[0]).includes('firecrawl.dev'))).toBe(true);
 });
 it('allows Firecrawl data keys but never execution-provider selection',()=>{
  expect(normalizeCredentialProvider('firecrawl')).toBe('firecrawl');
  expect(()=>normalizeProvider('firecrawl')).toThrow('Unsupported provider');
 });
 it('uses the supplied project credential only for gprithvi@gmail.com',async()=>{
  vi.stubEnv('FIRECRAWL_API_KEY','owner-only-test-key');
  expect(await firecrawlCredential(client('owner','gprithvi@gmail.com',null),'owner')).toEqual({key:'owner-only-test-key',version:'owner-project-v1'});
  expect(await firecrawlCredential(client('other','other@example.com',null),'other')).toBeNull();
  await expect(firecrawlCredential(client('owner','gprithvi@gmail.com',null),'other')).rejects.toThrow('authorization');
 });
 it('decrypts only the caller key, passes it to Firecrawl, and never caches plaintext',async()=>{
  const encryption='test-encryption-secret-for-owner-key-isolation';vi.stubEnv('API_KEY_ENCRYPTION_SECRET',encryption);vi.stubEnv('FIRECRAWL_API_KEY','owner-only-test-key');
  const ciphertext=await encryptSecret('personal-firecrawl-test-key',encryption);
  const sb=client('personal','other@example.com',{key_ciphertext:ciphertext,updated_at:'2026-11-15T22:32:00Z'});
  const requests:RequestInit[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
    if(String(url).includes('firecrawl.dev')){requests.push(init??{});return Response.json({success:true,data:{news:[{title:'Alphabet company news',url:'https://news.example/story',date:new Date().toISOString(),snippet:'Dated evidence'}]}});}
    return Response.json({query:{pages:[]}});
  }));
  const r=await getReferenceEvidence(sb,'personal','GOOGL',new Date().toISOString().slice(0,10),30);
  expect(r.firecrawl.items).toHaveLength(1);
  expect(new Headers(requests[0]?.headers).get('Authorization')).toBe('Bearer personal-firecrawl-test-key');
  expect(JSON.stringify(r)).not.toContain('personal-firecrawl-test-key');
  expect(sb.from).toHaveBeenCalledWith('user_api_keys');
 });
 it('does not fall back to project credentials when a personal key cannot decrypt',async()=>{
  vi.stubEnv('FIRECRAWL_API_KEY','owner-only-test-key');
  await expect(firecrawlCredential(client('owner','gprithvi@gmail.com',{key_ciphertext:'broken',updated_at:'v2'}),'owner')).rejects.toThrow('cannot be opened');
 });
});

function client(id:string,email:string,row:{key_ciphertext:string;updated_at:string}|null){
 const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn(async()=>({data:row,error:null}))};
 return {auth:{getUser:async()=>({data:{user:{id,email}},error:null})},from:vi.fn(()=>query)} as unknown as Parameters<typeof getReferenceEvidence>[0];
}