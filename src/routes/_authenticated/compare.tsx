import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { compareTickers } from '@/lib/ticker-insights.functions';
import { pageHead } from '@/lib/page-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataFreshness } from '@/components/data-freshness';
import { fmt, SourceLinks } from '@/components/insight-cells';

export const Route = createFileRoute('/_authenticated/compare')({
  validateSearch: (s: Record<string, unknown>) => ({ tickers: typeof s['tickers'] === 'string' ? s['tickers'] : 'AAPL,MSFT' }),
  head: () => pageHead('Ticker Comparison', 'Side-by-side valuation, Piotroski score, market sensitivity and agent consensus.'),
  component: Compare,
});

function Compare() {
  const { tickers } = Route.useSearch();
  const nav = useNavigate();
  const [text, setText] = useState(tickers);
  const list = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 4);
  const q = useQuery({ queryKey: ['ticker-compare', list.join(',')], queryFn: () => compareTickers({ data: { tickers: list } }), staleTime: 60000 });
  const rows = q.data ?? [];
  const lines: [string, (r: (typeof rows)[number]) => React.ReactNode][] = [
    ['Price', r => r.price === null ? 'Unavailable' : `$${fmt(r.price)}`],
    ['Market cap', r => r.marketCap === null ? 'Unavailable' : `$${fmt(r.marketCap / 1e9, 1)}B`],
    ['P/E (FY)', r => fmt(r.pe)], ['P/S (FY)', r => fmt(r.ps)], ['EV / EBITDA', r => fmt(r.evEbitda)], ['Net margin %', r => fmt(r.netMargin, 1)],
    ['Piotroski F-score', r => r.piotroski?.score == null ? 'Unavailable' : <span title={r.piotroski.signals.map(s => `${s.pass === null ? '–' : s.pass ? '✓' : '✗'} ${s.label}`).join('\n')}>{r.piotroski.score}/9 <span className="text-muted-foreground">({r.piotroski.tested} tested · FY {r.piotroski.fiscalYear})</span></span>],
    ['Beta vs S&P 500 (1Y)', r => fmt(r.sensitivity.beta)], ['Correlation to S&P 500', r => fmt(r.sensitivity.correlation)],
    ['Agent consensus', r => r.consensus.reports ? `${r.consensus.label} · ${r.consensus.reports} report${r.consensus.reports > 1 ? 's' : ''}` : 'No reports'],
    ['Latest target', r => r.latestTarget === null ? 'Not recorded' : `$${fmt(r.latestTarget)}`],
    ['Latest SEC filing', r => r.lastFiling ? `${r.lastFilingForm} · ${r.lastFiling}` : 'Unavailable'],
    ['Sources', r => <SourceLinks ticker={r.ticker} />],
    ['Data fetched', r => <DataFreshness date={r.fetchedAt} origin={r.quoteSource ?? 'Unavailable'} maxAge={3600000} />],
  ];
  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">Ticker Comparison</h1><p className="text-xs text-muted-foreground">Up to 4 tickers · valuation from Yahoo/SEC/FMP · Piotroski from SEC annual filings · sensitivity from 1Y daily returns vs SPY · consensus from your saved reports.</p></div>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void nav({ to: '/compare', search: { tickers: text.toUpperCase().replace(/\s/g, '') } }); }}><Input aria-label="Tickers" value={text} onChange={e => setText(e.target.value)} placeholder="AAPL,MSFT,NVDA" className="w-56" /><Button type="submit" size="sm">Compare</Button></form></header>
    {q.isLoading ? <p className="py-12 text-muted-foreground">Loading market and filing data…</p> : q.error ? <p className="text-destructive">Comparison unavailable. Check the tickers and try again.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="py-3">Metric</th>{rows.map(r => <th key={r.ticker} className="py-3"><Link to="/stocks/$ticker" params={{ ticker: r.ticker }} search={{ range: '1M', period: 'annual' }} className="text-primary">{r.ticker}</Link> <span className="text-xs font-normal text-muted-foreground">{r.company}</span></th>)}</tr></thead>
        <tbody>{lines.map(([label, cell]) => <tr key={label} className="border-b border-border"><td className="py-2 pr-4 text-muted-foreground">{label}</td>{rows.map(r => <td key={r.ticker} className="py-2 pr-4 font-mono text-xs">{cell(r)}</td>)}</tr>)}</tbody></table></div>}
    <p className="text-[10px] text-muted-foreground">Unavailable values are never estimated. Piotroski signals lacking two years of filings are not counted. Hover a score to see each signal.</p>
  </div>;
}
