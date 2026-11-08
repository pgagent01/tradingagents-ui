import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/stock-data.server', () => ({secCik:vi.fn(),secSubmissions:vi.fn(),secFacts:vi.fn()}));
vi.mock('@/lib/research-evidence', () => ({fundamentalEvidence:vi.fn()}));
import { secCik, secSubmissions } from '@/lib/stock-data.server';
import { fundamentalEvidence } from '@/lib/research-evidence';
import { secYahooPeer, yahooPeerCandidates } from '@/lib/valuation/peer-fallback.server';
const upstream = vi.fn();
const classification={sic:'7372',industry:'SEC SIC 7372 · Software'};
beforeEach(()=>{
 vi.resetAllMocks(); vi.stubGlobal('fetch',upstream);
 vi.mocked(secCik).mockResolvedValue('0000000001');
 vi.mocked(secSubmissions).mockResolvedValue({sic:7372,sicDescription:'Software'});
 vi.mocked(fundamentalEvidence).mockReturnValue({annual:[],latestQuarter:{end:'2026-09-30',equity:100},valuationBalance:{shares:{value:10,end:'2026-09-30'}},ttm:{netIncome:{value:20,periodEnd:'2026-09-30'},operatingCashFlow:{periodEnd:'2026-09-30'},freeCashFlow:10,dilutedShares:{value:10,end:'2026-09-30'}}} as unknown as ReturnType<typeof fundamentalEvidence>);
 upstream.mockResolvedValue(new Response(JSON.stringify({chart:{result:[{meta:{currency:'USD',regularMarketPrice:20}}]}})));
});
afterEach(()=>vi.unstubAllGlobals());
describe('verified free peer inputs',()=>{
 it('calculates only dated earnings, FCF and book multiples; no invented EV or forward ratios',async()=>{
  const p=await secYahooPeer('PEER','2026-11-08',classification);
  expect(p?.marketCap).toBe(200);
  expect(p?.multiples).toEqual({pe:10,pFcf:20,pb:2,evSales:null,evEbitda:null,forwardPe:null});
 });
 it('rejects a different SIC before requesting its quote',async()=>{
  vi.mocked(secSubmissions).mockResolvedValue({sic:5961});
  expect(await secYahooPeer('PEER','2026-11-08',classification)).toBeNull();
  expect(upstream).not.toHaveBeenCalled();
 });
 it('rejects unknown currency rather than defaulting to USD',async()=>{
  upstream.mockResolvedValue(new Response(JSON.stringify({chart:{result:[{meta:{regularMarketPrice:20}}]}})));
  expect(await secYahooPeer('PEER','2026-11-08',classification)).toBeNull();
 });
 it('withholds period-mismatched earnings multiples',async()=>{
  const f=vi.mocked(fundamentalEvidence).getMockImplementation()?.(null,'2026-11-08');
  if(!f?.ttm) throw Error('Missing test fixture');
  f.ttm.netIncome.periodEnd='2025-12-31';
  vi.mocked(fundamentalEvidence).mockReturnValue(f);
  expect((await secYahooPeer('PEER','2026-11-08',classification))?.multiples.pe).toBeNull();
 });
 it('bounds and deduplicates suggestions and uses the second host on failure',async()=>{
  upstream.mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({finance:{result:[{recommendedSymbols:[{symbol:'SELF'},{symbol:'BAD KEY'},...Array.from({length:20},(_,i)=>({symbol:`P${i}`})),{symbol:'P1'}]}]}})));
  const tickers=await yahooPeerCandidates('SELF');
  expect(tickers).toHaveLength(12);expect(new Set(tickers).size).toBe(12);
  expect(tickers).not.toContain('SELF');expect(tickers).not.toContain('BAD KEY');
  expect(String(upstream.mock.calls[1]?.[0])).toContain('query2.finance.yahoo.com');
 });
});