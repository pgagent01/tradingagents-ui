import { sectionObject, contentText } from '@/lib/report-content';
const bn = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? `${v < 0 ? '−' : ''}$${(Math.abs(v) / 1e9).toFixed(1)}B` : 'Unavailable';
/** Upkeep vs growth spending and the operating → net profit bridge, from the saved valuation snapshot. */
export function CashBridgePanels({ intrinsic }: { intrinsic: unknown }) {
  const i = sectionObject(intrinsic), split = sectionObject(i['capexSplit']), bridge = sectionObject(i['profitBridge']);
  const rows = Array.isArray(bridge['rows']) ? bridge['rows'].map(sectionObject) : [];
  if (!Object.keys(split).length && !rows.length) return null;
  const share = typeof split['growthShareOfCapex'] === 'number' ? split['growthShareOfCapex'] : null;
  return <div className="grid gap-4 md:grid-cols-2">
    {Object.keys(split).length > 0 && <div className="rounded-md border border-border p-3">
      <h3 className="text-base font-semibold">Capital spending: upkeep vs growth</h3>
      {split['status'] === 'available' ? <>
        <div className="mt-3 flex h-3 overflow-hidden rounded bg-muted" aria-label="Share of capital spending"><div className="bg-muted-foreground" style={{ width: `${(1 - (share ?? 0)) * 100}%` }} /><div className="bg-primary" style={{ width: `${(share ?? 0) * 100}%` }} /></div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div><dt className="text-muted-foreground">Upkeep (≈ depreciation)</dt><dd className="font-mono">{bn(split['upkeep'])}</dd></div>
          <div><dt className="text-muted-foreground">Growth spending</dt><dd className="font-mono text-primary">{bn(split['growth'])}{share !== null ? ` · ${(share * 100).toFixed(0)}%` : ''}</dd></div>
          <div><dt className="text-muted-foreground">Reported free cash flow</dt><dd className="font-mono">{bn(split['reportedFcf'])}</dd></div>
          <div><dt className="text-muted-foreground">Before growth spending</dt><dd className="font-mono">{bn(split['ownerCashFlow'])}</dd></div>
        </dl></> : <p className="mt-2 text-xs text-muted-foreground">{contentText(split['reason'])}{typeof split['reportedFcf'] === 'number' ? ` Reported free cash flow ${bn(split['reportedFcf'])}.` : ''}</p>}
      <p className="mt-2 text-xs text-muted-foreground">Last 12 months to {contentText(split['periodEnd'])}. {contentText(split['method'])} Upkeep is an approximation, not a filed figure.</p>
    </div>}
    {rows.length > 0 && <div className="rounded-md border border-border p-3">
      <h3 className="text-base font-semibold">From operating profit to net profit</h3>
      <table className="mt-2 w-full text-xs"><tbody>{rows.map((r, n) => <tr key={n} className={`border-b border-border ${r['kind'] === 'remainder' ? 'text-destructive' : ''} ${r['kind'] === 'start' || r['kind'] === 'end' || r['kind'] === 'subtotal' ? 'font-semibold' : ''}`}><td className="py-1.5">{contentText(r['label'])}</td><td className="text-right font-mono">{bn(r['value'])}</td></tr>)}</tbody></table>
      <p className="mt-2 text-xs text-muted-foreground">SEC filings, last 12 months to {contentText(bridge['periodEnd'])}. {(Array.isArray(bridge['notes']) ? bridge['notes'] : []).map(String).join(' ')}</p>
    </div>}
  </div>;
}
