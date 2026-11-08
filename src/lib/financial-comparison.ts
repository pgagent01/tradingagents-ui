/** Read saved comparisons only; never reconcile or fetch new data in a report viewer. */
export type SavedFinancialComparison = {
  metric: string; sec: number | null; provider: string | null; value: number | null;
  diffPct: number | null; used: string | null; flagged: boolean; note: string;
};
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
const text = (v: unknown) => typeof v === 'string' ? v : '';
export function savedFinancialComparisons(value: unknown): SavedFinancialComparison[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(v => {
    const r = record(v), metric = text(r['metric']);
    if (!metric) return [];
    const base = { metric, sec: finite(r['sec']), used: text(r['used']) || null, flagged: r['flagged'] === true, note: text(r['note']) };
    const others = Array.isArray(r['others']) ? r['others'].map(record).filter(o => text(o['provider'])) : [];
    return others.length ? others.map(o => ({ ...base, provider: text(o['provider']), value: finite(o['value']), diffPct: finite(o['diffPct']) })) : [{ ...base, provider: null, value: null, diffPct: null }];
  });
}
export const financialMetricName = (metric: string) => ({ revenue: 'Revenue', operatingIncome: 'Operating income', netIncome: 'Net income', operatingCashFlow: 'Operating cash flow', cash: 'Cash & equivalents', equity: 'Stockholders equity' })[metric] ?? metric;
export function financialComparisonMarkdown(value: unknown, period: unknown): string {
  const rows = savedFinancialComparisons(value);
  if (!rows.length) return 'No provider comparison recorded in this report.';
  const cell = (v: string) => v.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  const number = (v: number | null) => v === null ? 'Unavailable' : String(v);
  return `Period: ${text(period) || 'Not recorded'} · USD · same-period comparisons only\n\n| Metric | SEC | Provider | Provider value | Difference % | Selected source | Review |\n| --- | --- | --- | --- | --- | --- | --- |\n` + rows.map(r => `| ${cell(financialMetricName(r.metric))} | ${number(r.sec)} | ${cell(r.provider ?? 'None aligned')} | ${number(r.value)} | ${number(r.diffPct)} | ${cell(r.used ?? 'Unavailable')} | ${cell(r.note)} |`).join('\n');
}