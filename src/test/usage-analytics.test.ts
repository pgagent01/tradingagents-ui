import { describe,it,expect } from 'vitest';
import { dailyUsage,summarizeUsage,modelEfficiency } from '@/lib/usage-analytics';
describe('Phase 4 cost auditing',()=>{
  const rows=[{day:'2026-10-25',runs:2,input:1000,output:500,usd:0.03,credits:0.42,unknown:0},{day:'2026-10-25',runs:1,input:200,output:100,usd:0.01,credits:null,unknown:1}];
  it('keeps input and completion totals separate',()=>expect(summarizeUsage(rows)).toEqual({runs:3,input:1200,output:600,usd:0.04,credits:0.42,unknown:1}));
  it('does not present partially unknown daily credits as zero',()=>expect(dailyUsage(rows,'2026-10-01','2026-10-31')[0]?.credits).toBeNull());
  it('restricts totals to the chosen date range',()=>expect(dailyUsage(rows,'2026-10-26','2026-10-31')).toEqual([]));
  it('calculates estimated dollars per thousand combined tokens',()=>expect(modelEfficiency(1000,500,0.03)).toBeCloseTo(0.02));
  it('has no efficiency rate without tokens',()=>expect(modelEfficiency(0,0,0)).toBeNull());
});