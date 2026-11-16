import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { EvidenceDisclosure } from './evidence-disclosure';
import { getMyAnalystViews } from '@/lib/analyst-views.functions';
import { analystGap, primaryConsensusMean, type AnalystViews } from '@/lib/analyst-views';
const money = (n: number | null | undefined) => typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2) : '—';

function RangeChart({ low, high, avg, price, ours }: { low: number; high: number; avg: number | null; price: number | null; ours: number | null }) {
  const pts = [low, high, avg, price, ours].filter((n): n is number => typeof n === 'number' && n > 0);
  const min = Math.min(...pts) * 0.95, max = Math.max(...pts) * 1.05; const at = (n: number) => `${((n - min) / (max - min)) * 100}%`;
  const marks: [string, number | null, string][] = [['Current price', price, 'bg-foreground'], ['Analyst average', avg, 'bg-primary'], ['Our target', ours, 'bg-destructive']];
  return <figure aria-label="Analyst target range compared with current price and our target" className="space-y-2">
    <div className="relative h-8 rounded bg-muted">
      <div className="absolute top-2 h-4 rounded bg-primary/25" style={{ left: at(low), width: `calc(${at(high)} - ${at(low)})` }} />
      {marks.map(([label, v, c]) => v ? <div key={label} title={`${label} ${money(v)}`} className={`absolute top-0 h-8 w-1 rounded ${c}`} style={{ left: at(v) }} /> : null)}
    </div>
    <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>Analyst range {money(low)}–{money(high)} (shaded)</span>{marks.map(([label, v, c]) => v ? <span key={label} className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded-sm ${c}`} />{label} {money(v)}</span> : null)}</figcaption>
  </figure>;
}

export function WallStreetView({ value, price, ourTarget, title = 'Wall Street view' }: { value: unknown; price?: number | null; ourTarget?: number | null; title?: string }) {
  const v = value as AnalystViews | null | undefined;
  if (!v || !v.status) return null;
  if (v.status === 'unavailable') return <EvidenceDisclosure title={title}><p className="text-xs text-muted-foreground">No analyst targets or ratings were available for this stock.</p></EvidenceDisclosure>;
  const c = v.consensus[0]; const low = c?.low ?? v.derived?.low ?? null, high = c?.high ?? v.derived?.high ?? null; const avg = primaryConsensusMean(v);
  const gap = analystGap(ourTarget ?? null, v); const t = v.trend[0]; const total = t ? t.strongBuy + t.buy + t.hold + t.sell + t.strongSell : 0;
  return <EvidenceDisclosure title={title} defaultOpen>
    <div className="space-y-4 text-sm">
      <p className="text-xs text-muted-foreground">Outside opinions from brokers and banks, shown for comparison. They are not our valuation and are never copied as our target.</p>
      {v.consensus.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{v.consensus.map(x => <div key={x.source} className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground"><a className="underline" href={x.sourceUrl} target="_blank" rel="noreferrer">{x.source}</a> · {x.retrievedAt.slice(0, 10)}</p><p className="mt-1 text-lg font-semibold">{money(x.mean)}</p><p className="text-xs text-muted-foreground">Average target · median {money(x.median)} · range {money(x.low)}–{money(x.high)}{x.analysts ? ` · ${x.analysts} analysts` : ''}{x.rating ? ` · ${x.rating.replace(/_/g, ' ')}` : ''}</p></div>)}</div>}
      {low && high && <RangeChart low={low} high={high} avg={avg} price={price ?? null} ours={ourTarget ?? null} />}
      {gap && <p role="note" className="rounded-md border border-border bg-muted/40 p-2 text-xs">{gap.message}</p>}
      {[...v.disagreements].map(d => <p key={d} className="text-xs text-destructive">{d}</p>)}
      {t && total > 0 && <div><h3 className="text-xs font-semibold">Rating breakdown (Yahoo, latest month · {total} analysts)</h3><div className="my-2 grid grid-cols-3 gap-2 text-center">{([['Buy', t.strongBuy + t.buy, 'text-primary'], ['Hold', t.hold, 'text-muted-foreground'], ['Sell', t.sell + t.strongSell, 'text-destructive']] as const).map(([l, n, cl]) => <div key={l} className="rounded-md border border-border p-2"><p className={`text-xl font-semibold ${cl}`}>{n}</p><p className="text-xs text-muted-foreground">{l} · {Math.round(n / total * 100)}%</p></div>)}</div><div className="mt-1 flex h-3 overflow-hidden rounded" aria-label={`Strong buy ${t.strongBuy}, buy ${t.buy}, hold ${t.hold}, sell ${t.sell}, strong sell ${t.strongSell}`}>{([['Strong buy', t.strongBuy, 'bg-primary'], ['Buy', t.buy, 'bg-primary/60'], ['Hold', t.hold, 'bg-muted-foreground/40'], ['Sell', t.sell, 'bg-destructive/60'], ['Strong sell', t.strongSell, 'bg-destructive']] as const).map(([l, n, cl]) => n ? <div key={l} className={cl} style={{ width: `${n / total * 100}%` }} title={`${l}: ${n}`} /> : null)}</div><p className="mt-1 text-xs text-muted-foreground">Strong buy {t.strongBuy} · Buy {t.buy} · Hold {t.hold} · Sell {t.sell} · Strong sell {t.strongSell}</p></div>}
      {v.derived && <p className="text-xs text-muted-foreground">Last 90 days: {v.derived.upgrades90d} upgrades, {v.derived.downgrades90d} downgrades, {v.derived.targetRaises90d} target raises, {v.derived.targetCuts90d} target cuts.</p>}
      {v.actions.length > 0 && <EvidenceDisclosure title={`Recent targets by firm (${v.actions.length})`}><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-1 pr-2">Firm</th><th className="pr-2">Date</th><th className="pr-2">Rating</th><th className="pr-2 text-right">Target</th><th className="pr-2 text-right">Prior</th><th>Source</th></tr></thead><tbody>{v.actions.map(a => <tr key={a.firm + a.date} className="border-b border-border/60"><td className="py-1 pr-2">{a.firm}</td><td className="pr-2">{a.date}</td><td className="pr-2">{a.toGrade ?? '—'}</td><td className="pr-2 text-right">{money(a.target)}</td><td className="pr-2 text-right">{money(a.priorTarget)}</td><td><a className="underline" href={a.sourceUrl} target="_blank" rel="noreferrer">{a.source}</a></td></tr>)}</tbody></table></div></EvidenceDisclosure>}
      <ul className="list-disc pl-4 text-xs text-muted-foreground">{v.notes.map(n => <li key={n}>{n}</li>)}</ul>
    </div>
  </EvidenceDisclosure>;
}

export function LiveWallStreetView({ ticker, price }: { ticker: string; price: number | null }) {
  const fetchViews = useServerFn(getMyAnalystViews);
  const q = useQuery({ queryKey: ['analyst-views', ticker], queryFn: () => fetchViews({ data: { ticker } }), staleTime: 30 * 60 * 1000, retry: false });
  if (q.isPending) return <p className="text-xs text-muted-foreground">Loading analyst targets…</p>;
  if (q.isError) return <p className="text-xs text-muted-foreground">Analyst targets are unavailable right now.</p>;
  return <WallStreetView value={q.data} price={price} />;
}
