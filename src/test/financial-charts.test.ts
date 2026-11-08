import { describe, it, expect } from 'vitest';
import { financialChartData, scenarioChartData } from '@/lib/financial-charts';
describe('financial chart data',()=>{
 it('sorts years, converts to billions and keeps missing figures as gaps',()=>{
  const rows=financialChartData({external_evidence:{fundamentals:{annual:[{end:'2025-10-31',revenue:34296e6,operatingIncome:-437e6,netIncome:57e6,grossProfit:null,capex:2292e6},{end:'2024-10-31',revenue:30127e6,operatingIncome:1e9,netIncome:2.579e9}]}}});
  expect(rows.map(r=>r.label)).toEqual(['FY2024','FY2025']);
  expect(rows[1]!.revenue).toBeCloseTo(34.296);
  expect(rows[1]!.grossMargin).toBeNull();
  expect(rows[1]!.capex).toBeCloseTo(-2.292);
  expect(rows[0]!.capex).toBeNull();
 });
 it('drops unavailable valuation scenarios',()=>{ expect(scenarioChartData({intrinsic:{scenarios:[{name:'Bear',value:null,target:null},{name:'Base',value:5,target:6}]}})).toEqual([{name:'Base',value:5,target:6}]); });
});
