import { describe,it,expect } from 'vitest';
import { valuationBalance } from '@/lib/valuation/financial-inputs';
import { forecastScenario,sensitivityGrid, type ForecastInput } from '@/lib/valuation/forecast';
const anchor={end:'2026-09-30',filed:'2026-10-30',accn:'Q3'};
const fact=(val:number,accn='Q3')=>({units:{USD:[{...anchor,accn,val,form:'10-Q'}]}});
describe('filing-aligned equity conversion',()=>{
 it('does not double-count long-term debt aggregate and components',()=>{
  const balance=valuationBalance({LongTermDebt:fact(999),LongTermDebtNoncurrent:fact(100),LongTermDebtCurrent:fact(10),ShortTermBorrowings:fact(5)},anchor,'2026-11-08');
  expect(balance.debt?.value).toBe(115);
 });
 it('uses an explicit complete debt aggregate alone',()=>{
  expect(valuationBalance({DebtCurrentAndNoncurrent:fact(120),LongTermDebtNoncurrent:fact(100),LongTermDebtCurrent:fact(10),ShortTermBorrowings:fact(5)},anchor,'2026-11-08').debt?.value).toBe(120);
 });
 it('never treats absent short-term borrowing as zero',()=>{
  expect(valuationBalance({LongTermDebtNoncurrent:fact(100),LongTermDebtCurrent:fact(10)},anchor,'2026-11-08').debt).toBeNull();
 });
 it('adds noncurrent long-term debt to the full current-debt aggregate (HPE-style tagging)',()=>{
  expect(valuationBalance({LongTermDebtNoncurrent:fact(17343),DebtCurrent:fact(2901),LongTermDebtCurrent:fact(2137)},anchor,'2026-11-08').debt?.value).toBe(20244);
  expect(valuationBalance({DebtLongtermAndShorttermCombinedAmount:fact(20244)},anchor,'2026-11-08').debt?.value).toBe(20244);
 });
 it('never combines components from different filings',()=>{
  expect(valuationBalance({LongTermDebtNoncurrent:fact(100),LongTermDebtCurrent:fact(10,'OTHER'),ShortTermBorrowings:fact(5)},anchor,'2026-11-08').debt).toBeNull();
 });
});
const input:ForecastInput={revenue:1000,debt:100,cash:50,shares:10,marketCap:900,assumptions:{growth:.05,margin:.2,taxRate:.25,reinvestment:.4,terminalGrowth:.025,riskFree:.04,beta:1,equityPremium:.05,creditSpread:.02,dividendsPerShare:0}};
describe('explicit FCFF forecasts',()=>{
 it('uses separate capex, depreciation and working-capital estimates only when all are supplied',()=>{const a={...input.assumptions,capexRevenue:.08,depreciationRevenue:.03,workingCapitalRevenue:.1};expect(forecastScenario({...input,assumptions:a},'Base').forecasts[0]?.fcff).toBeCloseTo(100);expect(forecastScenario({...input,assumptions:{...input.assumptions,capexRevenue:.08}},'Base').value).toBeNull();});
 it('applies explicit forecast dilution and equity adjustments once',()=>{const plain=forecastScenario(input,'Base');const adjusted=forecastScenario({...input,assumptions:{...input.assumptions,annualDilution:.02,equityAdjustments:50}},'Base');expect(adjusted.value).toBeCloseTo(((plain.value??0)*10-50)/(10*1.02**5));});
 it('calculates after-tax EBIT less explicit net reinvestment',()=>{
  const base=forecastScenario(input,'Base');
  expect(base.forecasts).toHaveLength(5);
  expect(base.forecasts[0]?.revenue).toBe(1050);
  expect(base.forecasts[0]?.fcff).toBeCloseTo(94.5);
  expect(base.discountRate).toBeCloseTo(.0855);
  expect(base.target).toBeCloseTo((base.value??0)*1.09);
 });
 it('rejects reinvestment exceeding NOPAT rather than fabricating terminal cash flow',()=>{
  expect(forecastScenario({...input,assumptions:{...input.assumptions,reinvestment:1.1}},'Base').value).toBeNull();
 });
 it('creates nine sensitivities and decreases value at a higher discount rate',()=>{
  const grid=sensitivityGrid(input,forecastScenario(input,'Base'));
  expect(grid).toHaveLength(9);
  expect(grid[1]?.value).toBeGreaterThan(grid[7]?.value??Infinity);
 });
});import { valuationBalance as vb2 } from '@/lib/valuation/financial-inputs';
describe('cover-page shares and lease-inclusive noncurrent debt',()=>{
 it('uses same-filing dei shares and LongTermDebtAndCapitalLeaseObligations + DebtCurrent (Corning style)',()=>{
  const f=(tag:string,val:number,unit='USD')=>({[tag]:{units:{[unit]:[{val,end:'2026-09-30',filed:'2026-10-30',accn:'A1',form:'10-Q'}]}}});
  const gaap={...f('LongTermDebtAndCapitalLeaseObligations',7267e6),...f('DebtCurrent',933e6),...f('CashAndCashEquivalentsAtCarryingValue',2537e6)};
  const dei={EntityCommonStockSharesOutstanding:{units:{shares:[{val:861401106,end:'2026-10-24',filed:'2026-10-30',accn:'A1',form:'10-Q'},{val:5,end:'2026-10-24',filed:'2026-10-30',accn:'OTHER'}]}}};
  const b=vb2(gaap,{accn:'A1',end:'2026-09-30',filed:'2026-10-30',form:'10-Q'},'2026-11-08',dei);
  expect(b.debt?.value).toBe(8200e6); expect(b.shares?.value).toBe(861401106); expect(b.cash?.value).toBe(2537e6);
 });
});
