import type { FundamentalEvidence } from '@/lib/research-evidence';
import { forecastScenario, sensitivityGrid, type ForecastAssumptions } from './forecast';
import type { ForecastOverrides } from './preferences';
import { industryNorm, marginTargets, normFlags, type IndustryNorm } from './industry-norms';
import { capexSplit, discountRateCheck, profitBridge } from './cash-bridge';
export type RateContext = { riskFree: number; riskFreeDate: string | null; riskFreeSource: string; beta: number; betaObservations: number; betaSource: string };
export type GrowthMode='blend'|'recent'|'fixed';
/** Default growth from filed annual revenue: fixed caps latest growth at 0–15%; recent caps it at −10–35%; blend averages latest and 3-year CAGR, capped at 0–30%. */
export function defaultGrowth(annual:{revenue:number|null;revenueGrowthPct:number|null}[],mode:GrowthMode='blend'):{growth:number;label:string}{
  const latest=annual.at(-1)?.revenueGrowthPct;const l=latest===null||latest===undefined?null:latest/100;
  const a=annual.at(-1)?.revenue,b=annual.at(-4)?.revenue;const cagr=a&&b&&a>0&&b>0?Math.pow(a/b,1/3)-1:null;
  const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
  if(l===null&&cagr===null)return {growth:.05,label:'labeled 5% default (no filed revenue growth)'};
  if(mode==='fixed')return l===null?{growth:.05,label:'labeled 5% default'}:{growth:clamp(l,0,.15),label:'latest annual revenue growth capped at 0–15% (fixed setting)'};
  if(mode==='recent')return {growth:clamp(l??cagr!,-.1,.35),label:`latest annual revenue growth${l===null?' (3-year CAGR used; latest unavailable)':''}, limited to −10–35%`};
  const vals=[l,cagr].filter((x):x is number=>x!==null);
  return {growth:clamp(vals.reduce((x,y)=>x+y,0)/vals.length,0,.3),label:`blend of latest annual growth${l!==null?` ${(l*100).toFixed(1)}%`:''} and 3-year revenue CAGR${cagr!==null?` ${(cagr*100).toFixed(1)}%`:' (unavailable)'}, limited to 0–30%`};
}
export function intrinsicScenarios(f: FundamentalEvidence | null, marketCap: number | null, rates: RateContext,overrides:ForecastOverrides={},growthMode:GrowthMode='blend',sic:string|null=null,analysisDate:string=new Date().toISOString().slice(0,10)) {
  const norm:IndustryNorm|null=industryNorm(sic,analysisDate);
  const t=f?.ttm,b=f?.valuationBalance;
  const split=capexSplit(t?{operatingCashFlow:t.operatingCashFlow,capex:t.capex,...(t.extra?.depreciation?{depreciation:t.extra.depreciation}:{})}:null);
  const bridge=profitBridge(t?{operatingIncome:t.operatingIncome,netIncome:t.netIncome,...(t.extra??{})}:null);
  const unavailable = (reason: string) => ({status:'unavailable' as const,reason,scenarios:[] as ReturnType<typeof forecastScenario>[],sensitivity:[] as ReturnType<typeof sensitivityGrid>,notes:[] as string[],capexSplit:split,profitBridge:bridge,reinvestment:null as null|{base:number;label:string;bear:number|null},discountCheck:null as null|ReturnType<typeof discountRateCheck>,industryNorm:norm,normFlags:[] as string[]});
  if (!t || t.revenue.value===null || t.revenue.value<=0 || t.operatingIncome.value===null || t.operatingIncome.value<=0 || t.revenue.periodEnd!==t.operatingIncome.periodEnd) return unavailable('Positive, period-aligned revenue and operating income are required for operating-company DCF.');
  if (!b?.debt || !b.cash || !b.shares || b.shares.value<=0 || b.debt.value<0 || b.cash.value<0 || marketCap===null || marketCap<=0) return unavailable('Complete filing-aligned debt, unrestricted cash, common shares and market capitalization are required.');
  // Cover-page (dei) shares come from the same filing and are dated a few weeks after period end.
  const coverOk=Boolean(b.shares.tag?.startsWith('dei:'))&&t.revenue.periodEnd!==null&&b.shares.end>=t.revenue.periodEnd&&(Date.parse(b.shares.end)-Date.parse(t.revenue.periodEnd))/86400000<=75;
  if (b.shares.end!==t.revenue.periodEnd&&!coverOk) return unavailable('Revenue and equity-conversion share-count periods do not align.');
  const currentMargin=t.operatingIncome.value/t.revenue.value;
  const auto=defaultGrowth(f?.annual??[],growthMode);const growth=auto.growth;
  const taxRate=overrides.taxRate??.25;
  const ri=reinvestmentDefaults({split,nopat:t.operatingIncome.value*(1-taxRate),growth:overrides.growth??growth,equity:f?.latestQuarter?.equity??f?.annual.at(-1)?.equity??null,debt:b.debt.value,cash:b.cash.value});
  const fade=overrides.margin===undefined?marginTargets(currentMargin,norm):null;
  const common: ForecastAssumptions={...overrides,...(fade?{targetMargin:fade.base}:{}),growth:overrides.growth??growth,margin:overrides.margin??currentMargin,taxRate,reinvestment:overrides.reinvestment??ri.base,terminalGrowth:overrides.terminalGrowth??.025,riskFree:rates.riskFree,beta:rates.beta,equityPremium:.05,creditSpread:.02,dividendsPerShare:overrides.dividendsPerShare??0};
  const input={revenue:t.revenue.value,debt:b.debt.value,cash:b.cash.value,shares:b.shares.value,marketCap,assumptions:common};
  const cases=[{name:'Bear',assumptions:{...common,growth:Math.max(-.2,common.growth-.04),margin:common.margin*.8,...(fade?{targetMargin:fade.bear*.8}:{}),reinvestment:Math.min(.95,Math.max(common.reinvestment+.1,overrides.reinvestment===undefined?ri.bear??0:0)),creditSpread:.03,terminalGrowth:Math.max(0,common.terminalGrowth-.005)}},{name:'Base',assumptions:common},{name:'Bull',assumptions:{...common,growth:Math.min(.5,common.growth+.04),margin:Math.min(.8,common.margin*1.2),...(fade?{targetMargin:Math.min(.8,fade.bull*1.2)}:{}),reinvestment:Math.max(0,common.reinvestment-.1),creditSpread:.015,terminalGrowth:Math.min(.05,common.terminalGrowth+.005)}}];
  const scenarios=cases.map(c=>forecastScenario({...input,assumptions:c.assumptions},c.name));
  const base=scenarios.find(c=>c.name==='Base');
  const discountCheck=discountRateCheck(base?.discountRate??null);
  const flags=normFlags({margin:currentMargin,discountRate:base?.discountRate??null,norm});
  return {industryNorm:norm,normFlags:flags,capexSplit:split,profitBridge:bridge,reinvestment:{base:common.reinvestment,label:overrides.reinvestment!==undefined?'owner-entered estimate':ri.label,bear:ri.bear},discountCheck,status:base?.value!==null && base?.value!==undefined ? 'estimated' as const : 'unavailable' as const,reason:base?.reason??null,scenarios,sensitivity:base?sensitivityGrid(input,base):[],notes:[...(t.operatingIncome.derivedFrom?[t.operatingIncome.note??'Operating income derived from reported expense lines.']:[]),...(Object.keys(overrides).length?[`Owner-entered estimates override defaults: ${JSON.stringify(overrides)}. These are assumptions, not verified reported figures.`, 'Separate cash-flow ratios, dilution and equity adjustments apply only when explicitly supplied; unspecified items keep the disclosed default limitations.']:[]),
    'Model estimates, not management guidance or analyst consensus. Five-year constant growth/margin and reinvestment scenarios; no LLM-generated assumptions.',
    `Base growth ${ (common.growth*100).toFixed(1)}%: ${overrides.growth!==undefined?'owner-entered estimate':auto.label}. Base operating margin ${overrides.margin!==undefined?'is an owner-entered estimate':fade?`starts at aligned SEC TTM EBIT/revenue; ${fade.label}`:`uses aligned SEC TTM EBIT/revenue held flat${norm?'':' (no dated industry norm for this SIC)'}`}.`,
    ...flags,
    `Defaults: tax 25%, equity premium 5%, base credit spread 2%, terminal growth 2.5%. Base reinvestment ${(common.reinvestment*100).toFixed(0)}% of after-tax EBIT: ${overrides.reinvestment!==undefined?'owner-entered estimate':ri.label}. Bear adds 10 points${ri.bear!==null&&overrides.reinvestment===undefined?` and is at least the measured growth-spending rate ${(ri.bear*100).toFixed(0)}% (counts measured growth spending as a cost, capped at 70%)`:''}; bull subtracts 10. Net reinvestment substitutes for separate D&A, capex and working-capital forecasts; it is not measured historical FCFF.`,
    ...(split.status==='available'?[`Capital spending split (TTM to ${split.periodEnd}): upkeep ≈ depreciation USD ${split.upkeep}, growth USD ${split.growth} (${((split.growthShareOfCapex??0)*100).toFixed(0)}% of capex). Reported free cash flow USD ${split.reportedFcf}; before growth spending USD ${split.ownerCashFlow}. Upkeep ≈ depreciation is an approximation, not a filed figure.`]:[`Capital spending split unavailable: ${split.reason}`]),
    ...(discountCheck.message?[discountCheck.message]:[]),
    `Risk-free ${ (rates.riskFree*100).toFixed(2)}% · ${rates.riskFreeSource}${rates.riskFreeDate?` dated ${rates.riskFreeDate}`:''}; beta ${rates.beta.toFixed(2)} · ${rates.betaSource} (${rates.betaObservations} return observations).`,
    `Enterprise DCF subtracts net debt once; ${common.annualDilution!==undefined?`owner-estimated annual dilution ${(common.annualDilution*100).toFixed(2)}% applied over five years`:'uses period-end common shares without forecast dilution'}. ${common.equityAdjustments!==undefined?`Owner-entered additional equity deductions USD ${common.equityAdjustments}`:'Lease liabilities, minority interests and preferred equity excluded; omissions may overstate value'}.`,
    `12-month scenario target = intrinsic equity value × (1 + cost of equity) minus estimated dividends USD ${common.dividendsPerShare}; ${overrides.dividendsPerShare!==undefined?'owner-entered estimate':'$0 default, not verified'}. Comps weight is 0% until peer ratios are filing-reconciled. Assumption-sensitive estimates are not investment advice.`,
  ]};
}
/** Base reinvestment keeps the 40% default because book-value returns are distorted by investment gains and buybacks; bear counts all measured growth spending as a cost. Return on invested capital is reported for context only. */
export function reinvestmentDefaults(i:{split:ReturnType<typeof capexSplit>;nopat:number;growth:number;equity:number|null;debt:number;cash:number}):{base:number;label:string;bear:number|null;roic:number|null}{
  const bear=i.split.status==='available'&&i.nopat>0&&i.split.growth!==null?Math.min(.7,i.split.growth/i.nopat):null;
  const ic=i.equity!==null?i.equity+i.debt-i.cash:null;
  const roic=ic!==null&&ic>0&&i.nopat>0?i.nopat/ic:null;
  return {base:.4,label:`40% default${roic!==null?`; book return on invested capital ${(roic*100).toFixed(1)}% implies ${(Math.min(1,i.growth/roic)*100).toFixed(0)}% if growth were funded only at book returns (context only, not used)`:''}`,bear,roic};
}
