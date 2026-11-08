import { blendedCostOfCapital, dcfValue, twelveMonthTarget } from './methods';
export type ForecastAssumptions = { growth: number; margin: number; taxRate: number; reinvestment: number; terminalGrowth: number; riskFree: number; beta: number; equityPremium: number; creditSpread: number; dividendsPerShare: number; annualDilution?:number|undefined; capexRevenue?:number|undefined; depreciationRevenue?:number|undefined; workingCapitalRevenue?:number|undefined; equityAdjustments?:number|undefined };
export type ForecastInput = { revenue: number; debt: number; cash: number; shares: number; marketCap: number; assumptions: ForecastAssumptions };
export type ForecastScenario = { name: string; assumptions: ForecastAssumptions; discountRate: number | null; costOfEquity: number; forecasts: { year: number; revenue: number; operatingIncome: number; nopat: number; reinvestment: number; fcff: number }[]; value: number | null; target: number | null; reason: string | null };
export function forecastScenario(input: ForecastInput, name: string): ForecastScenario {
  const a = input.assumptions;
  const equityCost = a.riskFree + a.beta * a.equityPremium;
  const rate = blendedCostOfCapital({equity:input.marketCap,debt:input.debt,costOfEquity:equityCost,costOfDebt:a.riskFree+a.creditSpread,taxRate:a.taxRate});
  const valid = Object.values(a).every(Number.isFinite) && a.growth > -1 && a.growth <= 1 && a.margin > 0 && a.margin <= 1 && a.taxRate >= 0 && a.taxRate <= 1 && a.reinvestment >= 0 && a.reinvestment < 1 && a.beta > 0 && a.equityPremium > 0 && a.creditSpread >= 0 && a.dividendsPerShare >= 0 && Number.isFinite(input.revenue) && input.revenue > 0 && Number.isFinite(input.cash) && input.cash >= 0 && Number.isFinite(input.shares) && input.shares > 0;
  const explicit=[a.capexRevenue,a.depreciationRevenue,a.workingCapitalRevenue];
  const complete=explicit.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1);
  const extraValid=(explicit.every(n=>n===undefined)||complete)&&(a.annualDilution===undefined||a.annualDilution>=0&&a.annualDilution<=.2)&&(a.equityAdjustments===undefined||a.equityAdjustments>=0);
  const forecasts = valid&&extraValid ? Array.from({length:5},(_,i) => {
    const year=i+1,revenue=input.revenue*(1+a.growth)**year,operatingIncome=revenue*a.margin,nopat=operatingIncome*(1-a.taxRate),reinvestment=nopat*a.reinvestment;
    const priorRevenue=input.revenue*(1+a.growth)**i;
    const netReinvestment=complete?revenue*((a.capexRevenue??0)-(a.depreciationRevenue??0))+(revenue-priorRevenue)*(a.workingCapitalRevenue??0):reinvestment;
    return {year,revenue,operatingIncome,nopat,reinvestment:netReinvestment,fcff:nopat-netReinvestment};
  }) : [];
  const result = valid && extraValid && rate !== null ? dcfValue({cashFlows:forecasts.map(f=>f.fcff),discountRate:rate,terminalGrowth:a.terminalGrowth,netDebt:input.debt-input.cash+(a.equityAdjustments??0),shares:input.shares*(1+(a.annualDilution??0))**5}) : {value:null,reason:'Invalid or incomplete forecast assumptions or financial inputs.'};
  return {name,assumptions:a,discountRate:rate,costOfEquity:equityCost,forecasts,value:result.value,target:result.value!==null ? twelveMonthTarget(result.value,equityCost,a.dividendsPerShare) : null,reason:result.reason};
}
export function sensitivityGrid(input: ForecastInput, base: ForecastScenario) {
  if (base.value===null || base.discountRate===null) return [];
  const baseRate=base.discountRate;
  return [-.01,0,.01].flatMap(dr=>[-.005,0,.005].map(dg=>{
    const rate=baseRate+dr,growth=input.assumptions.terminalGrowth+dg;
    const result=dcfValue({cashFlows:base.forecasts.map(f=>f.fcff),discountRate:rate,terminalGrowth:growth,netDebt:input.debt-input.cash+(input.assumptions.equityAdjustments??0),shares:input.shares*(1+(input.assumptions.annualDilution??0))**5});
    return {discountRate:rate,terminalGrowth:growth,value:result.value};
  }));
}