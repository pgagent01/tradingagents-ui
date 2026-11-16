import type { FundamentalEvidence } from '@/lib/research-evidence';
import type { ComparableEvidence, Multiple } from './comparables';
import { summarizePeers } from './comparables';
import { selectMethod } from './select-method';
import type { TtmEvidence } from './ttm';
import { intrinsicScenarios, type RateContext } from './scenarios';
import type { ForecastOverrides } from './preferences';
import { bankValuation } from './bank';
import { reitValuation } from './reit';
import { industryNorm } from './industry-norms';
export type ValuationEvidence = {
  version: number; analysisDate: string; currency: 'USD'; method: string; status: 'estimated' | 'relative_only' | 'unavailable';
  intrinsicValue: number | null; priceTarget: number | null; horizonMonths: 12; price: number | null;
  bear: number | null; base: number | null; bull: number | null; basis: string | null;
  comparables: ComparableEvidence; limitations: string[]; inputs: { trailing: TtmEvidence | null; balancePeriod: string | null; bookEquity: number | null; shares: TtmEvidence['dilutedShares']; source: string | null };
  intrinsic?: ReturnType<typeof intrinsicScenarios>;
  bank?: ReturnType<typeof bankValuation>;
  reit?: ReturnType<typeof reitValuation>;
};
/** Relative value is NOT intrinsic value or a forecast of a price twelve months from now. */
export function valuationEvidence(f: FundamentalEvidence | null, comps: ComparableEvidence, price: number | null, analysisDate: string, context?: {marketCap: number | null; rates: RateContext;overrides?:ForecastOverrides;growthMode?:'blend'|'recent'|'fixed';sic?:string|null}): ValuationEvidence {
  const norm=industryNorm(context?.sic??null,analysisDate);
  const ttm = f?.ttm, recent = f?.latestQuarter ?? f?.annual.at(-1);
  const shares = ttm?.dilutedShares?.value ?? null;
  const earningsAligned = ttm?.netIncome.periodEnd != null && ttm.netIncome.periodEnd === ttm.dilutedShares?.end;
  const bookAligned = recent?.end != null && recent.end === ttm?.dilutedShares?.end;
  const cashAligned = ttm?.operatingCashFlow.periodEnd != null && ttm.operatingCashFlow.periodEnd === ttm.dilutedShares?.end;
  const bases: Partial<Record<Multiple, number | null>> = { pe: earningsAligned ? ttm?.netIncome.value ?? null : null, pb: bookAligned ? recent?.equity ?? null : null, pFcf: cashAligned ? ttm?.freeCashFlow ?? null : null };
  const summaries = summarizePeers(comps.peers, bases, shares, null);
  const selection = selectMethod(comps.industry??norm?.industry??null, ttm?.revenue.value ?? null, ttm?.netIncome.value ?? null);
  const preferred = selection.method === 'excess_return' ? 'pb' : selection.method === 'dcf' ? 'pe' : null;
  const chosen = summaries.find(s => s.multiple === preferred && s.impliedBase !== null);
  const aligned = chosen?.multiple === 'pe' ? earningsAligned : chosen?.multiple === 'pb' ? bookAligned : true;
  const usable = chosen && aligned && shares !== null && shares > 0;
  const missingByMethod:Record<string,string>={excess_return:'Bank/insurer intrinsic value requires dated normalized ROE forecasts, common equity and cost-of-equity assumptions; these live inputs are not yet integrated.',ffo_nav:'REIT intrinsic value requires reported reconciled FFO/AFFO, an evidenced multiple and property NAV; these inputs are unavailable.',revenue_scenario:'Loss-maker intrinsic value requires an explicit funded path to positive margins, dilution and terminal economics; these inputs are unavailable.',normalized_cycle:'Cyclical intrinsic value requires a reconciled multi-year mid-cycle earnings/cash-flow basis; this is not yet integrated.'};
  const limitations = [selection.reason, missingByMethod[selection.method]??'Intrinsic valuation awaits explicit growth, margin, reinvestment and discount-rate scenarios; reported operating cash flow minus capex is not automatically FCFF.', 'A 12-month target awaits a documented roll-forward rate and dividend assumption; peer-relative value is not a price forecast.'];
  if (shares === null || shares <= 0) limitations.push('Positive dated diluted share count unavailable.');
  if (!aligned) limitations.push('Earnings and share-count periods do not align; implied values withheld.');
  const intrinsic=selection.method==='dcf' && context ? intrinsicScenarios(f,context.marketCap,context.rates,context.overrides,context.growthMode,context.sic??null,analysisDate) : undefined;
  const bank=selection.method==='excess_return'&&context?bankValuation({netIncome:earningsAligned||ttm?.netIncome.periodEnd===recent?.end?ttm?.netIncome.value??null:null,equity:recent?.equity??null,shares:f?.valuationBalance?.shares?.value??shares,riskFree:context.rates.riskFree,beta:context.rates.beta,norm,price,annualRoes:(f?.annual??[]).slice(-5).flatMap(a=>a.netIncome!==null&&a.equity!==null&&a.equity>0?[a.netIncome/a.equity]:[]),...(context.overrides?.dividendsPerShare!==undefined?{dividendsPerShare:context.overrides.dividendsPerShare}:{})}):undefined;
  if(bank?.status==='estimated'){const implausibleBank=price!==null&&price>0&&bank.value!==null&&(bank.value<price*.25||bank.value>price*4);return {version:2,analysisDate,currency:'USD',method:selection.method,status:'estimated',intrinsicValue:bank.value,priceTarget:price!==null&&price>0&&!implausibleBank?bank.target:null,horizonMonths:12,price,bear:usable?chosen.impliedLow:null,base:usable?chosen.impliedBase:null,bull:usable?chosen.impliedHigh:null,basis:usable?chosen.multiple:null,comparables:{...comps,summaries},limitations:[selection.reason,...(implausibleBank?['Excess-return value is outside 0.25×–4× the market price; target withheld.']:[]),...bank.notes],bank,inputs:{trailing:ttm??null,balancePeriod:recent?.end??null,bookEquity:recent?.equity??null,shares:ttm?.dilutedShares??null,source:f?.sourceUrl??null}};}
  const reit=selection.method==='ffo_nav'&&context&&ttm?reitValuation({netIncome:ttm.netIncome.value,depreciation:ttm.extra?.depreciation?.value??null,saleGains:ttm.extra?.propertySaleGains?.value??null,shares:f?.valuationBalance?.shares?.value??shares,riskFree:context.rates.riskFree,beta:context.rates.beta,price,...(context.overrides?.dividendsPerShare!==undefined?{dividendsPerShare:context.overrides.dividendsPerShare}:{})}):undefined;
  if(reit?.status==='estimated'){const bad=price!==null&&price>0&&(reit.value<price*.25||reit.value>price*4);return {version:2,analysisDate,currency:'USD',method:selection.method,status:'estimated',intrinsicValue:reit.value,priceTarget:price!==null&&price>0&&!bad?reit.target:null,horizonMonths:12,price,bear:usable?chosen.impliedLow:null,base:usable?chosen.impliedBase:null,bull:usable?chosen.impliedHigh:null,basis:usable?chosen.multiple:null,comparables:{...comps,summaries},limitations:[selection.reason,...(bad?['FFO value is outside 0.25×–4× the market price; target withheld.']:[]),...reit.notes],reit,inputs:{trailing:ttm??null,balancePeriod:recent?.end??null,bookEquity:recent?.equity??null,shares:ttm?.dilutedShares??null,source:f?.sourceUrl??null}};}
  const base=intrinsic?.scenarios.find(s=>s.name==='Base');
  const estimated=intrinsic?.status==='estimated';
  const implausible=estimated && price!==null && price>0 && base?.value!==null && base?.value!==undefined && (base.value<price*0.25 || base.value>price*4);
  const plausibility=implausible ? [`Base intrinsic value ${base?.value?.toFixed(2)} USD is outside 0.25×–4× the market price ${price?.toFixed(2)} USD; default assumptions likely miss one-time charges or business-specific economics, so the 12-month target is withheld. Enter reviewed assumptions to recalculate.`] : [];
  return { version: 2, analysisDate, currency: 'USD', method: selection.method, status: estimated ? 'estimated' : usable ? 'relative_only' : 'unavailable', intrinsicValue:base?.value??null, priceTarget: price!==null && price>0 && !implausible ? base?.target??null : null, horizonMonths: 12, price,
    bear: usable ? chosen.impliedLow : null, base: usable ? chosen.impliedBase : null, bull: usable ? chosen.impliedHigh : null, basis: usable ? chosen.multiple : null,
    comparables: { ...comps, summaries }, limitations:estimated ? [...plausibility,...intrinsic.notes] : [...limitations,...(intrinsic?.reason?[intrinsic.reason]:[])],...(intrinsic?{intrinsic}:{}),
    inputs: { trailing: ttm ?? null, balancePeriod: recent?.end ?? null, bookEquity: recent?.equity ?? null, shares: ttm?.dilutedShares ?? null, source: f?.sourceUrl ?? null },
  };
}