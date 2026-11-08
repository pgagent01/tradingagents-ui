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
