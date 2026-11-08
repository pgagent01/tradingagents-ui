import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { getReportForecastOutcomes } from '@/lib/report-scorecard.functions';
type Outcomes = Awaited<ReturnType<typeof getReportForecastOutcomes>>;
const dollars = (v: number | null) => v === null ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(v);
export function ReportForecastOutcomes({ id }: { id: string }) {
  const fetchOutcomes = useServerFn(getReportForecastOutcomes);
  const [outcomes, setOutcomes] = useState<Outcomes | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function load() { setBusy(true); setError(''); try { setOutcomes(await fetchOutcomes({ data: { id } })); } catch { setError('Filed results are unavailable. Your saved forecasts are unchanged.'); } finally { setBusy(false); } }
  return <div className="space-y-3 border-t border-border pt-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Forecast vs Filed Results</h3><Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}><RefreshCw className="h-4 w-4" />{busy ? 'Checking filings…' : outcomes ? 'Refresh filed results' : 'Check filed results'}</Button></div>
    {error && <p className="text-sm text-warning">{error}</p>}
    {outcomes && <><p className="text-xs text-muted-foreground">As of {outcomes.asOf} · Saved baseline {outcomes.baseEnd ?? 'unavailable'}</p>
      {!outcomes.rows.length ? <p className="text-sm text-muted-foreground">No saved annual forecasts are available for this report.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="py-2 pr-4">Scenario / Year</th><th className="pr-4">Metric</th><th className="pr-4">Saved estimate</th><th className="pr-4">Filed result</th><th>Error</th></tr></thead><tbody>{outcomes.rows.map((r, i) => <tr key={i} className="border-b border-border"><td className="py-3 pr-4">{r.scenario} · {r.year}<span className="block text-xs text-muted-foreground">{r.periodEnd ?? 'Period unavailable'}</span></td><td className="pr-4">{r.metric === 'revenue' ? 'Revenue' : 'Operating income'}</td><td className="pr-4 font-mono text-xs">{dollars(r.expected)}</td><td className="pr-4"><span className="font-mono text-xs">{r.status === 'available' ? dollars(r.actual) : r.status === 'pending' ? 'Pending period' : r.status === 'awaiting_filing' ? 'Awaiting comparable filing' : 'Not comparable'}</span>{r.filed && <span className="block text-xs text-muted-foreground">Filed {r.filed}{r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex text-primary" aria-label={`SEC filing for ${r.scenario} year ${r.year} ${r.metric}`}><ExternalLink className="h-3 w-3" /></a>}</span>}</td><td className="font-mono text-xs">{r.errorPct === null ? '—' : `${r.errorPct.toFixed(2)}%`}</td></tr>)}</tbody></table></div>}
      {outcomes.notes.map(note => <p key={note} className="text-xs text-muted-foreground">{note}</p>)}
    </>}
  </div>;
}