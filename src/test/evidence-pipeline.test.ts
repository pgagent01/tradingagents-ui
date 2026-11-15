import { describe, it, expect } from 'vitest';
import { unifiedNews } from '@/lib/unified-news';
import { financialCompatibility } from '@/lib/evidence-contract';
import { reconcileFigures, reconcileWithSnapshot } from '@/lib/valuation/reconcile';
import { newsEvidenceMarkdown } from '@/lib/news-export';
import type { NewsEvidence, Headline } from '@/lib/research-evidence';
const base:NewsEvidence={status:'partial',cutoff:'2026-11-15',windowStart:'2026-11-01',fetchedAt:'2026-11-15T23:00:00Z',cached:false,notes:[],headlines:[],filings:[],filingsSource:null,headlinesSource:null};
const feed={status:'available' as const,cutoff:base.cutoff,fetchedAt:base.fetchedAt,cached:false,note:'partial',items:[]};
const article=(i:number):Headline=>({title:'Alphabet reports quarterly earnings growth',publisher:'Original',publishedAt:'2026-11-14T12:00:00Z',url:`https://news.example/${i}`,feed:'rss'});
const run=(headlines:Headline[])=>unifiedNews({...base,headlines},{wikipedia:feed,firecrawl:feed},'GOOGL');
describe('shared evidence pipeline',()=>{
 it.each(['Alphabet','Dell','Tesla','Pfizer','JPMorgan','Rolls-Royce'])('preserves opposing %s claims',name=>{
  const r=run([{...article(1),title:`${name} raises earnings guidance`},{...article(2),title:`${name} cuts earnings guidance`}]);
  expect(r.events).toHaveLength(2);expect(r.audit?.retained).toBe(2);
 });
 it('records undated and future candidates without accepting them',()=>{
  const r=run([article(1),{...article(2),publishedAt:''},{...article(3),publishedAt:'2026-11-15T23:59:00Z'}]);
  expect(r.headlines).toHaveLength(1);expect(r.audit?.rejected).toBe(2);expect(r.audit?.reasons).toEqual({missing_or_invalid_date:1,after_cutoff:1});
 });
 it('withholds a canonical article when publication days conflict',()=>{
  const r=run([article(1),{...article(1),url:'https://news.example/1?utm_source=search',publishedAt:'2026-11-13',feed:'search'}]);
  expect(r.headlines).toEqual([]);expect(r.audit?.conflicts).toBe(1);expect(r.audit?.records[0]?.alternatives).toHaveLength(2);
 });
 it('keeps date conflicts withheld even after the 50-record audit limit',()=>{
  const articles=Array.from({length:55},(_,i)=>[{...article(i),publishedAt:'2026-11-14'},{...article(i),publishedAt:'2026-11-13'}]).flat();
  const r=run(articles);expect(r.headlines).toHaveLength(0);expect(r.audit?.conflicts).toBe(55);expect(r.audit?.records).toHaveLength(50);
 });
 it('counts omitted display rows without losing totals',()=>{
  const r=run(Array.from({length:45},(_,i)=>article(i)));
  expect(r.headlines).toHaveLength(40);expect(r.audit?.received).toBe(45);expect(r.audit?.truncated).toBe(5);
 });
 it('does not count event/display projections as repeated retrievals',()=>{
  const h=article(1);const r=unifiedNews({...base,headlines:[h],events:[{title:h.title,category:'Other',firstPublishedAt:h.publishedAt,lastPublishedAt:h.publishedAt,coverage:[h],publisherCount:1}]},{wikipedia:feed,firecrawl:feed});
  expect(r.audit?.received).toBe(1);expect(r.audit?.duplicates).toBe(0);
 });
 it('labels strong possible syndication but preserves coverage',()=>{
  const excerpt='Reported quarterly earnings evidence with source attribution. '.repeat(4);
  const r=run([{...article(1),excerpt},{...article(2),excerpt,publisher:'Syndication'}]);
  expect(r.headlines).toHaveLength(2);expect(r.headlines[0]?.possibleSyndication).toHaveLength(1);
  expect(r.headlines[0]?.provenance?.entityId).toBe('GOOGL');expect(newsEvidenceMarkdown(r)).toContain('Possible repeated/syndicated excerpt');
 });
 it('rejects same-end-date annual versus quarterly financial comparisons',()=>{
  expect(reconcileFigures({provider:'SEC',periodEnd:'2026-09-30',basis:'annual',values:{revenue:100}},[{provider:'FMP',periodEnd:'2026-09-30',basis:'quarter',values:{revenue:25}}])[0]?.others).toEqual([]);
 });
 it('rejects same-period currency mismatches',()=>{
  expect(reconcileFigures({provider:'SEC',periodEnd:'2026-09-30',currency:'USD',values:{revenue:100}},[{provider:'FMP',periodEnd:'2026-09-30',currency:'GBP',values:{revenue:80}}])[0]?.others).toEqual([]);
 });
 it('flags nonzero provider value against zero SEC evidence',()=>{
  expect(reconcileFigures({provider:'SEC',periodEnd:'2026-09-30',values:{netIncome:0}},[{provider:'FMP',periodEnd:'2026-09-30',values:{netIncome:500}}])[0]?.flagged).toBe(true);
 });
 it('does not treat a quarterly snapshot as an annual filing',()=>{
  expect(reconcileWithSnapshot({end:'2026-09-30',revenue:100,netIncome:10,operatingIncome:15,operatingCashFlow:20,cash:30,equity:40},{financialSource:'Financial Modeling Prep · quarter',financialDate:'2026-09-30',statements:{income:[],balance:[],cash:[]}})).toEqual([]);
 });
 it('requires share-class and full duration compatibility',()=>{
  const p={entityId:'company',currency:'USD',unit:'USD',basis:'annual' as const,periodStart:'2025-01-01',periodEnd:'2025-12-31'};
  expect(financialCompatibility(p,{...p,securityId:'Class A'})).toBe('Incompatible securityId');
  expect(financialCompatibility(p,{...p,periodStart:'2025-10-01'})).toBe('Incompatible or missing periodStart');
  expect(financialCompatibility(p,p)).toBeNull();
 });
});