/** Pure, browser-safe: capital-spending split and operating-to-net profit bridge from aligned SEC TTM figures. */
import type { TtmFigure } from './ttm';

export type CapexSplit = {
  status: 'available' | 'unavailable'; periodEnd: string | null; reason?: string;
  operatingCashFlow: number | null; capex: number | null; depreciation: number | null;
  upkeep: number | null; growth: number | null; reportedFcf: number | null; ownerCashFlow: number | null; growthShareOfCapex: number | null;
  method: string;
};
const v = (f: TtmFigure | undefined) => (f && f.value !== null && Number.isFinite(f.value) ? f.value : null);

/** Upkeep spending = depreciation & amortization (capped at capex); the rest of capex is growth spending. */
export function capexSplit(t: { operatingCashFlow?: TtmFigure; capex?: TtmFigure; depreciation?: TtmFigure } | null | undefined): CapexSplit {
  const ocf = v(t?.operatingCashFlow), capex = v(t?.capex), da = v(t?.depreciation);
  const end = t?.capex?.periodEnd ?? null;
  const base = { operatingCashFlow: ocf, capex, depreciation: da, periodEnd: end, method: 'Upkeep = TTM depreciation & amortization (capped at capex); growth = capex − upkeep. Owner cash flow = operating cash flow − upkeep.' };
  const aligned = ocf !== null && capex !== null && t?.operatingCashFlow?.periodEnd === end;
  if (!aligned) return { ...base, status: 'unavailable', reason: 'Operating cash flow and capital spending for the same period are required.', upkeep: null, growth: null, reportedFcf: null, ownerCashFlow: null, growthShareOfCapex: null };
  const reportedFcf = ocf! - Math.abs(capex!);
  if (da === null || da < 0 || t?.depreciation?.periodEnd !== end) return { ...base, status: 'unavailable', reason: 'Depreciation & amortization for the same period is unavailable, so upkeep cannot be separated; reported free cash flow only.', upkeep: null, growth: null, reportedFcf, ownerCashFlow: null, growthShareOfCapex: null };
  const c = Math.abs(capex!), upkeep = Math.min(da, c), growth = c - upkeep;
  return { ...base, status: 'available', upkeep, growth, reportedFcf, ownerCashFlow: ocf! - upkeep, growthShareOfCapex: c > 0 ? growth / c : 0 };
}

export type ProfitBridgeRow = { label: string; value: number | null; kind: 'start' | 'item' | 'subtotal' | 'end' | 'remainder' };
export type ProfitBridge = { status: 'available' | 'partial' | 'unavailable'; periodEnd: string | null; rows: ProfitBridgeRow[]; unexplained: number | null; notes: string[] };

/**
 * Operating income → non-operating items → pre-tax income → tax → net income.
 * Only period-aligned figures are used; any gap is reported as an unexplained remainder, never guessed.
 */
export function profitBridge(t: { operatingIncome?: TtmFigure; netIncome?: TtmFigure; nonOperating?: TtmFigure; investmentGains?: TtmFigure; interestExpense?: TtmFigure; pretaxIncome?: TtmFigure; incomeTax?: TtmFigure } | null | undefined): ProfitBridge {
  const end = t?.netIncome?.periodEnd ?? null;
  const at = (f?: TtmFigure) => (f && f.periodEnd === end ? v(f) : null);
  const op = at(t?.operatingIncome), net = at(t?.netIncome);
  if (op === null || net === null) return { status: 'unavailable', periodEnd: end, rows: [], unexplained: null, notes: ['Period-aligned operating and net income are required for a profit bridge.'] };
  const nonOp = at(t?.nonOperating), gains = at(t?.investmentGains), interest = at(t?.interestExpense), pretax = at(t?.pretaxIncome), tax = at(t?.incomeTax);
  const rows: ProfitBridgeRow[] = [{ label: 'Operating income', value: op, kind: 'start' }];
  const notes: string[] = [];
  if (nonOp !== null) {
    rows.push({ label: 'Non-operating income / (expense), total', value: nonOp, kind: 'item' });
    if (gains !== null) notes.push(`Includes investment gains/(losses) of ${gains<0?"−":""}$${(Math.abs(gains)/1e9).toFixed(1)}B reported separately.`);
  } else {
    if (gains !== null) rows.push({ label: 'Investment gains / (losses)', value: gains, kind: 'item' });
    if (interest !== null) rows.push({ label: 'Interest expense', value: -Math.abs(interest), kind: 'item' });
  }
  const modelPretax = nonOp !== null ? op + nonOp : op + (gains ?? 0) - Math.abs(interest ?? 0);
  if (pretax !== null) {
    rows.push({ label: 'Pre-tax income (reported)', value: pretax, kind: 'subtotal' });
    const gap = pretax - modelPretax;
    if (Math.abs(gap) > Math.max(1, Math.abs(pretax) * 0.01)) rows.push({ label: 'Unexplained before tax', value: gap, kind: 'remainder' });
  }
  if (tax !== null) rows.push({ label: 'Income tax', value: -tax, kind: 'item' });
  const beforeNet = (pretax ?? modelPretax) - (tax ?? 0);
  const unexplained = net - beforeNet;
  const material = Math.abs(unexplained) > Math.max(1, Math.abs(net) * 0.01);
  if (material) rows.push({ label: tax === null ? 'Unexplained (tax and other items not filed separately)' : 'Unexplained after tax', value: unexplained, kind: 'remainder' });
  rows.push({ label: 'Net income', value: net, kind: 'end' });
  const complete = pretax !== null && tax !== null && (nonOp !== null || gains !== null);
  notes.push('Valuation uses operating income, so non-operating gains do not change the calculated value.');
  return { status: complete && !material ? 'available' : 'partial', periodEnd: end, rows, unexplained: material ? unexplained : 0, notes };
}

/** Normal discount-rate band for a listed operating company; outside it the rate is flagged, not changed. */
export function discountRateCheck(rate: number | null): { ok: boolean; message: string | null } {
  if (rate === null || !Number.isFinite(rate)) return { ok: false, message: 'Discount rate unavailable.' };
  if (rate < 0.06) return { ok: false, message: `Discount rate ${(rate * 100).toFixed(1)}% is below the usual 6–14% range; value may be overstated.` };
  if (rate > 0.14) return { ok: false, message: `Discount rate ${(rate * 100).toFixed(1)}% is above the usual 6–14% range; value may be understated.` };
  return { ok: true, message: null };
}

export const WALL_STREET_GAP_THRESHOLD = 0.4;
/** When the calculated target is more than 40% from the analyst average, name the assumptions that move it most. */
export function wallStreetGapReview(input: { target: number | null; consensus: number | null; growth: number; margin: number; reinvestment: number; discountRate: number | null; growthSpendingShare?: number | null }): { triggered: boolean; gap: number | null; drivers: string[] } {
  const { target, consensus } = input;
  if (target === null || consensus === null || consensus <= 0) return { triggered: false, gap: null, drivers: [] };
  const gap = (target - consensus) / consensus;
  if (Math.abs(gap) <= WALL_STREET_GAP_THRESHOLD) return { triggered: false, gap, drivers: [] };
  const low = gap < 0;
  const d: string[] = [`Growth ${(input.growth * 100).toFixed(1)}% a year for five years${low ? ' — analysts may expect faster growth' : ' — analysts may expect slower growth'}.`,
    `Operating margin ${(input.margin * 100).toFixed(1)}% held flat${low ? ' — expanding margins would raise value' : ''}.`,
    `Reinvestment ${(input.reinvestment * 100).toFixed(0)}% of after-tax operating profit${low ? ' — heavy spending treated as a cost lowers value' : ''}.`];
  if (input.discountRate !== null) d.push(`Discount rate ${(input.discountRate * 100).toFixed(1)}%${low ? ' — each 1 point lower raises value materially (see sensitivity table)' : ''}.`);
  if (input.growthSpendingShare != null && input.growthSpendingShare > 0.5) d.push(`${(input.growthSpendingShare * 100).toFixed(0)}% of capital spending is growth spending beyond upkeep; its future return is not in reported cash flow.`);
  return { triggered: true, gap, drivers: d };
}
