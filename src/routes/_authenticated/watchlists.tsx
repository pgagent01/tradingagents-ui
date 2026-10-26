import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { getWatchlist, addWatchlistItem, updateWatchlistItem } from '@/lib/ticker-insights.functions';
import { pageHead } from '@/lib/page-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DataFreshness } from '@/components/data-freshness';
import { fmt, SourceLinks } from '@/components/insight-cells';

export const Route = createFileRoute('/_authenticated/watchlists')({
  head: () => pageHead('Watchlist', 'Tickers you follow with alerts for sentiment shifts, valuation divergence and new earnings filings.'),
  component: Watchlist,
});

function Watchlist() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['watchlist'], queryFn: () => getWatchlist(), staleTime: 60000 });
  const add = useServerFn(addWatchlistItem), update = useServerFn(updateWatchlistItem);
  const [ticker, setTicker] = useState(''); const [threshold, setThreshold] = useState('15');
  const refresh = () => qc.invalidateQueries({ queryKey: ['watchlist'] });
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed'); } };
  const items = q.data ?? [];
  const alerts = items.flatMap(i => i.anomalies.map(a => ({ ...a, ticker: i.ticker })));
  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">Watchlist</h1><p className="text-xs text-muted-foreground">Alerts: agent recommendation shifts, price diverging from your latest target, and new 10-Q/10-K filings on SEC EDGAR.</p></div>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (ticker.trim()) void run(async () => { await add({ data: { ticker, threshold: Number(threshold) || 15 } }); setTicker(''); }); }}>
        <Input aria-label="Ticker" placeholder="Ticker e.g. NVDA" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} className="w-36" />
        <Input aria-label="Divergence threshold percent" type="number" min={1} max={100} value={threshold} onChange={e => setThreshold(e.target.value)} className="w-20" />
        <Button type="submit" size="sm">Add</Button></form></header>
    {alerts.length > 0 && <section className="space-y-1 border-l-2 border-warning pl-3"><h2 className="text-sm font-semibold text-warning">{alerts.length} active alert{alerts.length > 1 ? 's' : ''}</h2>{alerts.map((a, i) => <p key={i} className="text-xs"><b>{a.ticker}</b> · <span className="uppercase text-muted-foreground">{a.kind}</span> · {a.message}</p>)}</section>}
    {q.isLoading ? <p className="py-12 text-muted-foreground">Loading watchlist…</p> : !items.length ? <p className="py-12 text-muted-foreground">No tickers yet. Add one above.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2">Ticker</th><th>Price</th><th>Latest view / target</th><th>Divergence %</th><th>Sentiment</th><th>Earnings</th><th>Alerts</th><th>Sources</th><th></th></tr></thead>
        <tbody>{items.map(i => <tr key={i.id} className="border-b border-border align-top">
          <td className="py-2"><Link to="/stocks/$ticker" params={{ ticker: i.ticker }} className="font-mono text-primary">{i.ticker}</Link><div><DataFreshness date={i.insight.fetchedAt} origin={i.insight.quoteSource ?? 'Unavailable'} maxAge={3600000} /></div></td>
          <td className="font-mono">{i.insight.price === null ? '—' : `$${fmt(i.insight.price)}`}</td>
          <td className="text-xs">{i.insight.latestRecommendation ?? 'No research'}{i.insight.latestTarget !== null && ` · $${fmt(i.insight.latestTarget)}`}</td>
          <td><Input aria-label={`${i.ticker} threshold`} type="number" defaultValue={Number(i.valuation_threshold_pct)} className="h-7 w-16" onBlur={e => { const v = Number(e.target.value); if (v && v !== Number(i.valuation_threshold_pct)) void run(() => update({ data: { id: i.id, threshold: v } })); }} /></td>
          <td><Switch aria-label={`${i.ticker} sentiment alerts`} checked={i.notify_sentiment} onCheckedChange={v => void run(() => update({ data: { id: i.id, sentiment: v } }))} /></td>
          <td><Switch aria-label={`${i.ticker} earnings alerts`} checked={i.notify_earnings} onCheckedChange={v => void run(() => update({ data: { id: i.id, earnings: v } }))} /><div className="text-[10px] text-muted-foreground">{i.insight.lastFiling ? `${i.insight.lastFilingForm} ${i.insight.lastFiling}` : ''}</div></td>
          <td className="text-xs">{i.anomalies.length ? i.anomalies.map(a => <div key={a.kind} className="text-warning">{a.message}</div>) : <span className="text-muted-foreground">None</span>}</td>
          <td><SourceLinks ticker={i.ticker} /></td>
          <td className="space-x-1 whitespace-nowrap"><Button asChild size="sm" variant="outline"><Link to="/analysis/new" search={{ ticker: i.ticker } as never}>Research</Link></Button><Button size="sm" variant="ghost" onClick={() => void run(() => update({ data: { id: i.id, remove: true } }))}>Remove</Button></td>
        </tr>)}</tbody></table></div>}
    {items.length > 1 && <Button asChild variant="outline" size="sm"><Link to="/compare" search={{ tickers: items.slice(0, 4).map(i => i.ticker).join(',') }}>Compare watchlist side by side</Link></Button>}
  </div>;
}
