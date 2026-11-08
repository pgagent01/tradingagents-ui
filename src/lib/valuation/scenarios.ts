import type { FundamentalEvidence } from '@/lib/research-evidence';
import { forecastScenario, sensitivityGrid, type ForecastAssumptions } from './forecast';
import type { ForecastOverrides } from './preferences';
export type RateContext = { riskFree: number; riskFreeDate: string | null; riskFreeSource: string; beta: number; betaObservations: number; betaSource: string };
export function intrinsicScenarios(f: FundamentalEvidence | null, marketCap: number | null, rates: RateContext,overrides:ForecastOverrides={}) {
  const t=f?.ttm,b=f?.valuationBalance;
  const unavailable = (reason: string) => ({status:'unavailable' as const,reason,scenarios:[] as ReturnType<typeof forecastScenario>[],sensitivity:[] as ReturnType<typeof sensitivityGrid>,notes:[] as string[]});
  if (!t || t.revenue.value===null || t.revenue.value<=0 || t.operatingIncome.value===null || t.operatingIncome.value<=0 || t.revenue.periodEnd!==t.operatingIncome.periodEnd) return unavailable('Positive, period-aligned revenue and operating income are required for operating-company DCF.');
  if (!b?.debt || !b.cash || !b.shares || b.shares.value<=0 || b.debt.value<0 || b.cash.value<0 || marketCap===null || marketCap<=0) return unavailable('Complete filing-aligned debt, unrestricted cash, common shares and market capitalization are required.');
  if (b.shares.end!==t.revenue.periodEnd) return unavailable('Revenue and equity-conversion share-count periods do not align.');
  const currentMargin=t.operatingIncome.value/t.revenue.value;
  const historical=f?.annual.at(-1)?.revenueGrowthPct;
  const growth=historical!==null && historical!==undefined ? Math.max(0,Math.min(.15,historical/100)) : .05;
  const common: ForecastAssumptions={...overrides,growth:overrides.growth??growth,margin:overrides.margin??currentMargin,taxRate:overrides.taxRate??.25,reinvestment:overrides.reinvestment??.4,terminalGrowth:overrides.terminalGrowth??.025,riskFree:rates.riskFree,beta:rates.beta,equityPremium:.05,creditSpread:.02,dividendsPerShare:overrides.dividendsPerShare??0};
  const input={revenue:t.revenue.value,debt:b.debt.value,cash:b.cash.value,shares:b.shares.value,marketCap,assumptions:common};
  const cases=[{name:'Bear',assumptions:{...common,growth:Math.max(-.2,common.growth-.04),margin:common.margin*.8,reinvestment:Math.min(.95,common.reinvestment+.1),creditSpread:.03,terminalGrowth:Math.max(0,common.terminalGrowth-.005)}},{name:'Base',assumptions:common},{name:'Bull',assumptions:{...common,growth:Math.min(.5,common.growth+.04),margin:Math.min(.8,common.margin*1.2),reinvestment:Math.max(0,common.reinvestment-.1),creditSpread:.015,terminalGrowth:Math.min(.05,common.terminalGrowth+.005)}}];
  const scenarios=cases.map(c=>forecastScenario({...input,assumptions:c.assumptions},c.name));
  const base=scenarios.find(c=>c.name==='Base');
  return {status:base?.value!==null && base?.value!==undefined ? 'estimated' as const : 'unavailable' as const,reason:base?.reason??null,scenarios,sensitivity:base?sensitivityGrid(input,base):[],notes:[...(Object.keys(overrides).length?[`Owner-entered estimates override defaults: ${JSON.stringify(overrides)}. These are assumptions, not verified reported figures.`, 'Separate cash-flow ratios, dilution and equity adjustments apply only when explicitly supplied; unspecified items keep the disclosed default limitations.']:[]),
    'Model estimates, not management guidance or analyst consensus. Five-year constant growth/margin and reinvestment scenarios; no LLM-generated assumptions.',
    `Base growth ${ (growth*100).toFixed(1)}%: latest annual revenue growth capped at 0–15%, or a labeled 5% default if unavailable. Base operating margin uses aligned SEC TTM EBIT/revenue.`,
    'Defaults: tax 25%, equity premium 5%, base credit spread 2%, terminal growth 2.5%, reinvestment 40% of after-tax EBIT (bear 50%, bull 30%). Net reinvestment substitutes for separate D&A, capex and working-capital forecasts; it is not measured historical FCFF.',
    `Risk-free ${ (rates.riskFree*100).toFixed(2)}% · ${rates.riskFreeSource}${rates.riskFreeDate?` dated ${rates.riskFreeDate}`:''}; beta ${rates.beta.toFixed(2)} · ${rates.betaSource} (${rates.betaObservations} return observations).`,
    'Enterprise DCF subtracts net debt once, uses period-end common shares (not forecast dilution), and excludes lease liabilities, minority interests and preferred equity; these omissions may overstate equity value.',
    '12-month scenario target = intrinsic equity value × (1 + cost of equity) minus assumed dividends of $0; dividends are a labeled default, not verified. Comps weight is 0% until peer ratios are filing-reconciled. Assumption-sensitive estimates are not investment advice.',
  ]};
}