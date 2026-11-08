import { financialMetricName, savedFinancialComparisons } from '@/lib/financial-comparison';

const money = (v: number | null) => v === null ? 'Unavailable' : v.toLocaleString('en-US', { maximumFractionDigits: 2 });
export function ReportFinancialComparison({ value, period }: { value: unknown; period: unknown }) {
  const rows = savedFinancialComparisons(value);
  return <div className="mt-5 space-y-2">
    <h3 className="text-base font-semibold">Financial Source Comparison</h3>
    <p className="text-xs text-muted-foreground">Fiscal year ended {typeof period === 'string' ? period : 'not recorded'} · USD · same-period figures only</p>
    {rows.length ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2 pr-4">Metric</th><th className="pr-4">SEC</th><th className="pr-4">Provider</th><th className="pr-4">Provider value</th><th className="pr-4">Difference</th><th className="pr-4">Selected source</th><th>Review</th></tr></thead><tbody>{rows.map((r, i) => <tr key={`${r.metric}-${i}`} className="border-b border-border"><td className="py-3 pr-4 whitespace-nowrap">{financialMetricName(r.metric)}</td><td className="pr-4 font-mono whitespace-nowrap">{money(r.sec)}</td><td className="pr-4">{r.provider ?? 'None aligned'}</td><td className="pr-4 font-mono whitespace-nowrap">{money(r.value)}</td><td className={`pr-4 font-mono whitespace-nowrap ${r.flagged ? 'text-warning' : 'text-muted-foreground'}`}>{r.diffPct === null ? 'Unavailable' : `${r.diffPct > 0 ? '+' : ''}${r.diffPct.toFixed(2)}%`}</td><td className="pr-4">{r.used ?? 'Unavailable'}</td><td className={`min-w-56 py-3 ${r.flagged ? 'text-warning' : 'text-muted-foreground'}`}>{r.note || 'No review recorded.'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No provider comparison recorded in this report.</p>}
  </div>;
}