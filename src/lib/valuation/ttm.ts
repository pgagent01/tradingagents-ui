/** Rolling trailing-twelve-month figures from point-in-time SEC facts (pure, browser-safe). */
import { secRows } from '@/lib/sec-periods';

type Row = Record<string, unknown>;
export type TtmInput = { value: number; start: string | null; end: string; filed: string; accession: string | null; form: string };
export type TtmFigure = {
  value: number | null;
  method: 'annual' | 'annual_plus_ytd' | 'unavailable';
  periodEnd: string | null;
  inputs: { annual: TtmInput | null; ytd: TtmInput | null; priorYtd: TtmInput | null };
  note?: string;
};
export type TtmEvidence = {
  asOf: string | null; newestFiled: string | null; method: TtmFigure['method'];
  revenue: TtmFigure; operatingIncome: TtmFigure; netIncome: TtmFigure; operatingCashFlow: TtmFigure; capex: TtmFigure;
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
    .sort((a, b) => String(b['end']).localeCompare(String(a['end'])) || dur(b) - dur(a) || names.indexOf(String(a['tag'])) - names.indexOf(String(b['tag'])));
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

export function ttmEvidence(facts: Row, tags: { revenue: string[]; operatingIncome: string[]; netIncome: string[]; operatingCashFlow: string[]; capex: string[] }, cutoff: string): TtmEvidence {
  const revenue = ttmFigure(facts, tags.revenue, cutoff);
  const operatingIncome = ttmFigure(facts, tags.operatingIncome, cutoff);
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
    asOf, newestFiled, method: revenue.method, revenue, operatingIncome, netIncome, operatingCashFlow, capex, freeCashFlow,
    dilutedShares: s ? { value: Number(s['val']), end: String(s['end']), filed: String(s['filed']) } : null,
    freshness: asOf ? `Newest period ends ${asOf}${newestFiled ? `, filed ${newestFiled}` : ''}${ageDays !== null ? ` (${ageDays} days before the analysis date)` : ''}.` : 'No dated trailing-twelve-month period available.',
    note: 'Trailing twelve months = latest annual + current year-to-date − prior-year year-to-date, using same-filing comparatives only. Mismatched periods stay unavailable; free cash flow only combines cash-flow figures for the same period.',
  };
}
