import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/valuation/peer-fallback.server',()=>({secIndustry:vi.fn(),secYahooPeer:vi.fn()}));
import { secIndustry,secYahooPeer } from '@/lib/valuation/peer-fallback.server';
import { verifyModelPeers } from '@/lib/valuation/model-peers.server';
import { parsePeerSuggestions,peerSuggestionPrompt } from '@/lib/valuation/peer-suggestions';
import type { ComparableEvidence } from '@/lib/valuation/comparables';
const current:ComparableEvidence={status:'unavailable',industry:null,peers:[],summaries:[],cached:false,fetchedAt:'2026-11-08',note:'No peers'};
beforeEach(()=>vi.resetAllMocks());
describe('report-selected model peer handoff',()=>{
 it('accepts only explicit valid bounded suggestions, not prose or malformed output',()=>{
  expect(parsePeerSuggestions('Consider MSFT and GOOG','SELF')).toEqual([]);
  expect(parsePeerSuggestions('PEER_CANDIDATES: [bad]','SELF')).toEqual([]);
  expect(parsePeerSuggestions('PEER_CANDIDATES: ["SELF","MSFT","MSFT","BAD KEY","GOOG"]','SELF')).toEqual(['MSFT','GOOG']);
  expect(peerSuggestionPrompt(false)).toBe('');
 });
 it('verifies model candidates and records the actual selected NVIDIA model without a new call',async()=>{
  vi.mocked(secIndustry).mockResolvedValue({sic:'7372',industry:'SEC SIC 7372'});
  vi.mocked(secYahooPeer).mockImplementation(async ticker=>ticker==='BAD'?null:{ticker,company:ticker,marketCap:100,industry:'SEC SIC 7372',currency:'USD',date:'2026-11-08',source:'https://finance.yahoo.com/',multiples:{pe:20,pb:2,pFcf:10,forwardPe:null,evSales:null,evEbitda:null}});
  const result=await verifyModelPeers(current,'PEER_CANDIDATES: ["A","B","C","BAD"]','SELF','2026-11-08','nvidia/nemotron','2026-11-08');
  expect(result.peers.map(p=>p.ticker)).toEqual(['A','B','C']);expect(result.status).toBe('available');
  expect(result.note).toContain('nvidia/nemotron');expect(secYahooPeer).toHaveBeenCalledTimes(5);
 });
 it('never uses current model suggestions for historical membership',async()=>{
  expect(await verifyModelPeers(current,'PEER_CANDIDATES: ["A"]','SELF','2025-11-08','nvidia/nemotron','2026-11-08')).toBe(current);
  expect(secIndustry).not.toHaveBeenCalled();
 });
});