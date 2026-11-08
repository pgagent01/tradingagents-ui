/** Compare key figures across providers; differences above tolerance are flagged, never silently resolved. */
export type ProviderFigures = { provider: string; periodEnd: string | null; values: Record<string, number | null> };
export type ReconciliationRow = {
  metric: string; sec: number | null; others: { provider: string; value: number | null; diffPct: number | null }[];
  used: 'SEC' | string | null; flagged: boolean; note: string;
};

export function reconcileFigures(sec: ProviderFigures, others: ProviderFigures[], tolerancePct = 2): ReconciliationRow[] {
  const comparable = others.filter(o => o.periodEnd && sec.periodEnd && o.periodEnd === sec.periodEnd);
  return Object.keys(sec.values).map(metric => {
    const s = sec.values[metric] ?? null;
    const rows = comparable.map(o => {
      const v = o.values[metric] ?? null;
      return { provider: o.provider, value: v, diffPct: s !== null && v !== null && s !== 0 ? Math.round((v - s) / Math.abs(s) * 10000) / 100 : null };
    });
    const flagged = rows.some(r => r.diffPct !== null && Math.abs(r.diffPct) > tolerancePct);
    const fallback = s === null ? rows.find(r => r.value !== null) : undefined;
    const used = s !== null ? 'SEC' : fallback ? fallback.provider : null;
    const note = flagged ? `Providers differ by more than ${tolerancePct}% from the SEC filing; SEC value used, difference must be noted.` : s === null && fallback ? `SEC value unavailable; ${fallback.provider} value used and labelled.` : s === null ? 'Unavailable from all providers.' : rows.length ? 'Consistent across providers.' : 'SEC only; no other provider reported the same period.';
    return { metric, sec: s, others: rows, used, flagged, note };
  });
}

type StatementRow = { label: string; value: number | null };
type SecAnnual = { end: string; revenue: number | null; operatingIncome: number | null; netIncome: number | null; operatingCashFlow: number | null; cash: number | null; equity: number | null };
/** Latest SEC fiscal year vs the stock snapshot's provider statements (only when the provider is not SEC itself). */
export function reconcileWithSnapshot(latest: SecAnnual | null | undefined, snap: { financialSource: string | null; financialDate: string | null; statements: Record<'income' | 'balance' | 'cash', StatementRow[]> } | null | undefined): ReconciliationRow[] {
  if (!latest || !snap?.financialSource || /sec/i.test(snap.financialSource)) return [];
  const get = (rows: StatementRow[], label: string) => rows.find(r => r.label === label)?.value ?? null;
  return reconcileFigures(
    { provider: 'SEC', periodEnd: latest.end, values: { revenue: latest.revenue, operatingIncome: latest.operatingIncome, netIncome: latest.netIncome, operatingCashFlow: latest.operatingCashFlow, cash: latest.cash, equity: latest.equity } },
    [{ provider: snap.financialSource, periodEnd: snap.financialDate?.slice(0, 10) ?? null, values: { revenue: get(snap.statements.income, 'Revenue'), operatingIncome: get(snap.statements.income, 'Operating income'), netIncome: get(snap.statements.income, 'Net income'), operatingCashFlow: get(snap.statements.cash, 'Operating cash flow'), cash: get(snap.statements.balance, 'Cash & equivalents'), equity: get(snap.statements.balance, 'Stockholders equity') } }],
  );
}
