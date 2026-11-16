/** Rolling trailing-twelve-month figures from point-in-time SEC facts (pure, browser-safe). */
import { secRows } from '@/lib/sec-periods';

type Row = Record<string, unknown>;
export type TtmInput = { value: number; start: string | null; end: string; filed: string; accession: string | null; form: string };
export type TtmFigure = {
  value: number | null;
  method: 'annual' | 'annual_plus_ytd' | 'unavailable';
  periodEnd: string | null;
  inputs: { annual: TtmInput | null; ytd: TtmInput | null; priorYtd: TtmInput | null };
  note?: string | undefined;
  /** Set when the figure is calculated from separately reported same-period lines, never from pre-tax income. */
  derivedFrom?: string[] | undefined;
};
export type TtmEvidence = {
  asOf: string | null; newestFiled: string | null; method: TtmFigure['method'];
  revenue: TtmFigure; operatingIncome: TtmFigure; netIncome: TtmFigure; operatingCashFlow: TtmFigure; capex: TtmFigure;
  /** Optional same-method TTM figures for the capex split and profit bridge; absent on older snapshots. */
  extra?: Partial<Record<'depreciation'|'nonOperating'|'investmentGains'|'interestExpense'|'pretaxIncome'|'incomeTax'|'propertySaleGains', TtmFigure>>;
  freeCashFlow: number | null; dilutedShares: { value: number; end: string; filed: string } | null;
  freshness: string; note: string;
};

const DAY = 86400000;
const t = (s: unknown) => Date.parse(String(s));
const dur = (r: Row) => (t(r['end']) - t(r['start'])) / DAY;
const input = (r: Row): TtmInput => ({ value: Number(r['val']), start: typeof r['start'] === 'string' ? r['start'] : null, end: String(r['end']), filed: String(r['filed']), accession: typeof r['accn'] === 'string' ? r['accn'] : null, form: String(r['form']) });
const near = (a: unknown, b: number, tol = 12) => Math.abs(t(a) - b) <= tol * DAY;
const none = (note: string): TtmFigure => ({ value: null, method: 'unavailable', periodEnd: null, inputs: { annual: null, ytd: null, priorYtd: null }, note });

/**
 * TTM = latest annual + current YTD − prior-year YTD.
 * YTD and its prior-year comparative must come from the SAME 10-Q filing and same concept,
 * and the annual period must end the day before the current fiscal year starts.
 * When no 10-Q is newer than the annual report, TTM equals the annual figure.
 */
export function ttmFigure(facts: Row, names: string[], cutoff = '9999-12-31'): TtmFigure {
  const rows = secRows(facts, names, 'USD', cutoff).filter(r => typeof r['start'] === 'string');
  if (!rows.length) return none('No SEC facts for this concept.');
  const annuals = rows.filter(r => /^(10-K|20-F|40-F)/.test(String(r['form'])) && dur(r) > 300 && dur(r) < 400)
    .sort((a, b) => String(b['end']).localeCompare(String(a['end'])) || String(b['filed']).localeCompare(String(a['filed'])) || names.indexOf(String(a['tag'])) - names.indexOf(String(b['tag'])));
  const latestAnnual = annuals[0] ?? null;
  // Newest 10-Q YTD (duration 60–300 days) ending after the latest annual period.
  const ytds = rows.filter(r => /^10-Q/.test(String(r['form'])) && dur(r) >= 60 && dur(r) <= 300 && (!latestAnnual || String(r['end']) > String(latestAnnual['end'])))
    .sort((a, b) => String(b['end']).localeCompare(String(a['end'])) || dur(b) - dur(a) || String(b['filed']).localeCompare(String(a['filed'])) || names.indexOf(String(a['tag'])) - names.indexOf(String(b['tag'])));
  for (const ytd of ytds) {
    const fyStart = t(ytd['start']);
    const annual = annuals.find(a => a['tag'] === ytd['tag'] && near(a['end'], fyStart - DAY, 7) && String(a['filed']) <= String(ytd['filed']));
    if (!annual) continue;
    const prior = rows.find(p => p['accn'] === ytd['accn'] && p['tag'] === ytd['tag'] && near(p['end'], t(ytd['end']) - 365 * DAY) && Math.abs(dur(p) - dur(ytd)) <= 10);
    if (!prior) continue;
    return { value: Number(annual['val']) + Number(ytd['val']) - Number(prior['val']), method: 'annual_plus_ytd', periodEnd: String(ytd['end']), inputs: { annual: input(annual), ytd: input(ytd), priorYtd: input(prior) } };
  }
  if (latestAnnual) return { value: Number(latestAnnual['val']), method: 'annual', periodEnd: String(latestAnnual['end']), inputs: { annual: input(latestAnnual), ytd: null, priorYtd: null }, note: ytds.length ? 'Newer quarter exists but compatible same-filing year-to-date comparatives were unavailable; annual figure used.' : undefined };
  return none('No annual SEC period available to anchor a trailing-twelve-month figure.');
}

/** Standard operating-expense lines (edgartools-style concept map). Required lines must all be reported. */
export const OPERATING_LINES: { label: string; tags: string[]; required: boolean }[] = [
  { label: 'Cost of revenue', tags: ['CostOfGoodsAndServicesSold', 'CostOfRevenue', 'CostOfGoodsSold'], required: true },
  { label: 'Selling, general & administrative', tags: ['SellingGeneralAndAdministrativeExpense'], required: true },
  { label: 'Research & development', tags: ['ResearchAndDevelopmentExpense', 'ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost'], required: false },
  { label: 'Acquired in-process R&D', tags: ['ResearchAndDevelopmentInProcess'], required: false },
  { label: 'Amortization of intangibles', tags: ['AmortizationOfIntangibleAssets'], required: false },
  { label: 'Restructuring', tags: ['RestructuringCharges', 'RestructuringSettlementAndImpairmentProvisions'], required: false },
];
/**
 * Operating income when the filer reports no operating-income line: revenue minus reported operating-expense lines,
 * all for the same TTM period. Withheld when a required line is missing, the result exceeds revenue,
 * or it differs from pre-tax income by more than 30% of revenue (a sign of unreported lines).
 */
export function derivedOperatingIncome(revenue: TtmFigure, lines: { label: string; figure: TtmFigure; required: boolean }[], pretax: TtmFigure | null): TtmFigure | null {
  if (revenue.value === null || revenue.value <= 0) return null;
  const used: { label: string; value: number }[] = [];
  for (const l of lines) {
    const aligned = l.figure.value !== null && l.figure.periodEnd === revenue.periodEnd;
    if (!aligned) { if (l.required) return null; continue; }
    used.push({ label: l.label, value: l.figure.value as number });
  }
  const value = revenue.value - used.reduce((a, b) => a + b.value, 0);
  if (value >= revenue.value) return null;
  if (pretax?.value != null && pretax.periodEnd === revenue.periodEnd && Math.abs(value - pretax.value) > 0.3 * revenue.value) return null;
  return { value, method: revenue.method, periodEnd: revenue.periodEnd, inputs: revenue.inputs, derivedFrom: used.map(u => u.label),
    note: `No operating-income line is reported; calculated as revenue minus ${used.map(u => u.label.toLowerCase()).join(', ')} for the same period. Unreported operating lines would overstate it.` };
}

export function ttmEvidence(facts: Row, tags: { revenue: string[]; operatingIncome: string[]; netIncome: string[]; operatingCashFlow: string[]; capex: string[] }, cutoff: string, extraTags: Partial<Record<'depreciation'|'nonOperating'|'investmentGains'|'interestExpense'|'pretaxIncome'|'incomeTax'|'propertySaleGains', string[]>> = {}): TtmEvidence {
  const revenue = ttmFigure(facts, tags.revenue, cutoff);
  const reportedOperating = ttmFigure(facts, tags.operatingIncome, cutoff);
  const operatingIncome = reportedOperating.value !== null ? reportedOperating
    : derivedOperatingIncome(revenue, OPERATING_LINES.map(l => ({ label: l.label, required: l.required, figure: ttmFigure(facts, l.tags, cutoff) })), extraTags.pretaxIncome ? ttmFigure(facts, extraTags.pretaxIncome, cutoff) : null) ?? reportedOperating;
  const netIncome = ttmFigure(facts, tags.netIncome, cutoff);
  const operatingCashFlow = ttmFigure(facts, tags.operatingCashFlow, cutoff);
  const capex = ttmFigure(facts, tags.capex, cutoff);
  // Cash-flow figures must cover the same period to be combined.
  const freeCashFlow = operatingCashFlow.value !== null && capex.value !== null && operatingCashFlow.periodEnd === capex.periodEnd ? operatingCashFlow.value - capex.value : null;
  const shareRows = secRows(facts, ['WeightedAverageNumberOfDilutedSharesOutstanding'], 'shares', cutoff).sort((a, b) => String(b['end']).localeCompare(String(a['end'])) || String(b['filed']).localeCompare(String(a['filed'])));
  const s = shareRows[0];
  const all = [revenue, operatingIncome, netIncome, operatingCashFlow, capex];
  const asOf = all.map(f => f.periodEnd).filter((x): x is string => !!x).sort().at(-1) ?? null;
  const newestFiled = all.flatMap(f => [f.inputs.ytd?.filed, f.inputs.annual?.filed]).filter((x): x is string => !!x).sort().at(-1) ?? null;
  const ageDays = asOf ? Math.round((t(`${cutoff === '9999-12-31' ? new Date().toISOString().slice(0, 10) : cutoff}T00:00:00Z`) - t(asOf)) / DAY) : null;
  return {
    extra: Object.fromEntries(Object.entries(extraTags).map(([k, names]) => [k, ttmFigure(facts, names ?? [], cutoff)]).filter(([, f]) => (f as TtmFigure).value !== null)),
    asOf, newestFiled, method: revenue.method, revenue, operatingIncome, netIncome, operatingCashFlow, capex, freeCashFlow,
    dilutedShares: s ? { value: Number(s['val']), end: String(s['end']), filed: String(s['filed']) } : null,
    freshness: asOf ? `Newest period ends ${asOf}${newestFiled ? `, filed ${newestFiled}` : ''}${ageDays !== null ? ` (${ageDays} days before the analysis date)` : ''}.` : 'No dated trailing-twelve-month period available.',
    note: 'Trailing twelve months = latest annual + current year-to-date − prior-year year-to-date, using same-filing comparatives only. Mismatched periods stay unavailable; free cash flow only combines cash-flow figures for the same period.',
  };
}
