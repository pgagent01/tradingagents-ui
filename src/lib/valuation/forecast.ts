import { blendedCostOfCapital, dcfValue, twelveMonthTarget } from './methods';
export type ForecastAssumptions = { growth: number; margin: number; taxRate: number; reinvestment: number; terminalGrowth: number; riskFree: number; beta: number; equityPremium: number; creditSpread: number; dividendsPerShare: number };
export type ForecastInput = { revenue: number; debt: number; cash: number; shares: number; marketCap: number; assumptions: ForecastAssumptions };
export type ForecastScenario = { name: string; assumptions: ForecastAssumptions; discountRate: number | null; costOfEquity: number; forecasts: { year: number; revenue: number; operatingIncome: number; nopat: number; reinvestment: number; fcff: number }[]; value: number | null; target: number | null; reason: string | null };
export function forecastScenario(input: ForecastInput, name: string): ForecastScenario {
  const a = input.assumptions;
  const equityCost = a.riskFree + a.beta * a.equityPremium;
  const rate = blendedCostOfCapital({equity:input.marketCap,debt:input.debt,costOfEquity:equityCost,costOfDebt:a.riskFree+a.creditSpread,taxRate:a.taxRate});
  const valid = Object.values(a).every(Number.isFinite) && a.growth > -1 && a.growth <= 1 && a.margin > 0 && a.margin <= 1 && a.taxRate >= 0 && a.taxRate <= 1 && a.reinvestment >= 0 && a.reinvestment < 1 && a.beta > 0 && a.equityPremium > 0 && a.creditSpread >= 0 && a.dividendsPerShare >= 0 && Number.isFinite(input.revenue) && input.revenue > 0 && Number.isFinite(input.cash) && input.cash >= 0 && Number.isFinite(input.shares) && input.shares > 0;
  const forecasts = valid ? Array.from({length:5},(_,i) => {
    const year=i+1,revenue=input.revenue*(1+a.growth)**year,operatingIncome=revenue*a.margin,nopat=operatingIncome*(1-a.taxRate),reinvestment=nopat*a.reinvestment;
    return {year,revenue,operatingIncome,nopat,reinvestment,fcff:nopat-reinvestment};
  }) : [];
  const result = valid && rate !== null ? dcfValue({cashFlows:forecasts.map(f=>f.fcff),discountRate:rate,terminalGrowth:a.terminalGrowth,netDebt:input.debt-input.cash,shares:input.shares}) : {value:null,reason:'Invalid or incomplete forecast assumptions or financial inputs.'};
  return {name,assumptions:a,discountRate:rate,costOfEquity:equityCost,forecasts,value:result.value,target:result.value!==null ? twelveMonthTarget(result.value,equityCost,a.dividendsPerShare) : null,reason:result.reason};
}
export function sensitivityGrid(input: ForecastInput, base: ForecastScenario) {
  if (base.value===null || base.discountRate===null) return [];
  const baseRate=base.discountRate;
  return [-.01,0,.01].flatMap(dr=>[-.005,0,.005].map(dg=>{
    const rate=baseRate+dr,growth=input.assumptions.terminalGrowth+dg;
    const result=dcfValue({cashFlows:base.forecasts.map(f=>f.fcff),discountRate:rate,terminalGrowth:growth,netDebt:input.debt-input.cash,shares:input.shares});
    return {discountRate:rate,terminalGrowth:growth,value:result.value};
  }));
}