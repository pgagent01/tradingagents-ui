import type { FundamentalEvidence } from '@/lib/research-evidence';
import type { ComparableEvidence, Multiple } from './comparables';
import { summarizePeers } from './comparables';
import { selectMethod } from './select-method';
import type { TtmEvidence } from './ttm';
export type ValuationEvidence = {
  version: number; analysisDate: string; currency: 'USD'; method: string; status: 'relative_only' | 'unavailable';
  intrinsicValue: null; priceTarget: null; horizonMonths: 12; price: number | null;
  bear: number | null; base: number | null; bull: number | null; basis: string | null;
  comparables: ComparableEvidence; limitations: string[]; inputs: { trailing: TtmEvidence | null; balancePeriod: string | null; bookEquity: number | null; shares: TtmEvidence['dilutedShares']; source: string | null };
};
/** Relative value is NOT intrinsic value or a forecast of a price twelve months from now. */
export function valuationEvidence(f: FundamentalEvidence | null, comps: ComparableEvidence, price: number | null, analysisDate: string): ValuationEvidence {
  const ttm = f?.ttm, recent = f?.latestQuarter ?? f?.annual.at(-1);
  const shares = ttm?.dilutedShares?.value ?? null;
  const bases: Partial<Record<Multiple, number | null>> = { pe: ttm?.netIncome.value ?? null, pb: recent?.equity ?? null, pFcf: ttm?.freeCashFlow ?? null };
  const summaries = summarizePeers(comps.peers, bases, shares, null);
  const selection = selectMethod(comps.industry, ttm?.revenue.value ?? null, ttm?.netIncome.value ?? null);
  const preferred = selection.method === 'excess_return' ? 'pb' : selection.method === 'dcf' ? 'pe' : null;
  const chosen = summaries.find(s => s.multiple === preferred && s.impliedBase !== null);
  const aligned = chosen?.multiple === 'pe' ? ttm?.netIncome.periodEnd === ttm?.dilutedShares?.end : true;
  const usable = chosen && aligned && shares !== null && shares > 0;
  const limitations = [selection.reason, 'Intrinsic valuation awaits explicit growth, margin, reinvestment and discount-rate scenarios; reported operating cash flow minus capex is not automatically FCFF.', 'A 12-month target awaits a documented roll-forward rate and dividend assumption; peer-relative value is not a price forecast.', comps.note];
  if (shares === null || shares <= 0) limitations.push('Positive dated diluted share count unavailable.');
  if (!aligned) limitations.push('Earnings and share-count periods do not align; implied values withheld.');
  return { version: 1, analysisDate, currency: 'USD', method: selection.method, status: usable ? 'relative_only' : 'unavailable', intrinsicValue: null, priceTarget: null, horizonMonths: 12, price,
    bear: usable ? chosen.impliedLow : null, base: usable ? chosen.impliedBase : null, bull: usable ? chosen.impliedHigh : null, basis: usable ? chosen.multiple : null,
    comparables: { ...comps, summaries }, limitations,
    inputs: { trailing: ttm ?? null, balancePeriod: recent?.end ?? null, bookEquity: recent?.equity ?? null, shares: ttm?.dilutedShares ?? null, source: f?.sourceUrl ?? null },
  };
}