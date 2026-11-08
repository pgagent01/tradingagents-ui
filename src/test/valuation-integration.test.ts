import { describe, expect, it } from 'vitest';
import { valuationEvidence } from '@/lib/valuation/engine';
import { reviewCalculatedTarget } from '@/lib/report-quality';
import { reportMarkdown, type Report } from '@/lib/report-content';
import type { FundamentalEvidence } from '@/lib/research-evidence';
import type { ComparableEvidence } from '@/lib/valuation/comparables';
import { savedFinancialComparisons } from '@/lib/financial-comparison';
import { reconcileFigures } from '@/lib/valuation/reconcile';

describe('valuation handoff and saved report integration',()=>{
 it('preserves calculated scenarios and target through serialization, review and report export',()=>{
  const date='2026-11-08',end='2026-09-30';
  const figure=(value:number)=>({value,periodEnd:end,method:'annual' as const,inputs:{annual:null,ytd:null,priorYtd:null}});
  const f={annual:[],latestQuarter:null,ttm:{revenue:figure(1000),operatingIncome:figure(200),netIncome:figure(100),operatingCashFlow:figure(150),capex:figure(50),freeCashFlow:100,dilutedShares:{value:10,end,filed:'2026-10-30'}},valuationBalance:{debt:{value:100,end},cash:{value:50,end},shares:{value:10,end}}} as unknown as FundamentalEvidence;
  const comps:ComparableEvidence={industry:'Software',status:'unavailable',fetchedAt:date,cached:false,peers:[],summaries:[],note:'No verified peers'};
  const valuation=valuationEvidence(f,comps,90,date,{marketCap:900,rates:{riskFree:.04,riskFreeDate:'2026-11-05',riskFreeSource:'FRED DGS10',beta:1,betaObservations:250,betaSource:'SPY'}});
  const reviewed=reviewCalculatedTarget(9999,valuation,90);
  expect(valuation.intrinsic?.scenarios).toHaveLength(3);
  expect(valuation.intrinsic?.sensitivity).toHaveLength(9);
  if(valuation.intrinsicValue===null) throw Error('Expected an estimated intrinsic value');
  expect(reviewed.target).toBeCloseTo(valuation.intrinsicValue * 1.09);
  expect(reviewed.target).not.toBe(9999);
  const reconciliation=reconcileFigures({provider:'SEC',periodEnd:end,values:{revenue:1000}},[{provider:'FMP',periodEnd:end,values:{revenue:1040}}]);
  const sections=JSON.parse(JSON.stringify({valuation,quality_review:{warnings:reviewed.warnings},external_evidence:{fundamentals:{annual:[{end}],reconciliation}}}));
  expect(savedFinancialComparisons(sections.external_evidence.fundamentals.reconciliation)[0]).toMatchObject({sec:1000,value:1040,diffPct:4,used:'SEC',flagged:true});
  expect(sections.valuation.priceTarget).toBe(reviewed.target);
  expect(sections.valuation.intrinsic.scenarios[1].assumptions.reinvestment).toBe(.4);
  const report={ticker:'AMZN',created_at:date,sections,price_target:reviewed.target,total_input_tokens:10,total_output_tokens:5,total_cost_usd:.01,lovable_credits:0} as unknown as Report;
  const markdown=reportMarkdown(report,[],false);
  expect(markdown).toContain(String(reviewed.target));
  expect(markdown).toContain('FRED DGS10');
  expect(markdown).toContain('2026-11-05');
 });
});