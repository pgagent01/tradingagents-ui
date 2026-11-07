import {DataFreshness} from '@/components/data-freshness';
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deleteIncompleteRun } from "@/lib/research.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DashboardAttribution } from "@/components/attribution-note";
import { CreditMetric } from '@/components/credit-metric';
import { DataError,DataNotFound } from "@/components/route-feedback";
import { cn } from "@/lib/utils";
import { CompanyPicker } from "@/components/company-picker";
import { AGENTS } from '@/lib/research-config';
import { reportAgentIds } from '@/lib/report-agents';
import { dashboardStocks } from '@/lib/dashboard-insights';

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [runs, cache] = await Promise.all([
      supabase
        .from("research_runs")
        .select("id, ticker, analysis_date, selected_agents, status, total_cost_usd, total_input_tokens, total_output_tokens, lovable_credits,credit_basis,is_demo, created_at, research_reports(id, sections, recommendation, conviction_score, total_input_tokens, total_output_tokens, total_cost_usd,lovable_credits,credit_basis)")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("research_events").select("event_type").in("event_type", ["cache_hit", "cache_miss"]).limit(1000),
    ]);
    if (runs.error) throw runs.error;
    const rows = runs.data ?? [];
    const tickers = new Set(rows.map((r) => r.ticker.toUpperCase())).size;
    const active = rows.filter((r) => r.status === "running" || r.status === "pending").length;
    const mtd = rows
      .filter((r) => !r.is_demo && new Date(r.created_at) >= monthStart)
      .reduce((a, r) => a + Number(r.total_cost_usd ?? 0), 0);
    const ev = cache.data ?? [];
    const hits = ev.filter((e) => e.event_type === "cache_hit").length;
    const hitRate = ev.length ? (hits / ev.length) * 100 : null;
    return { tickers, active, mtd, hitRate, stocks: dashboardStocks(rows), recent: rows.slice(0, 15) };
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dashboard — TradingAgents AI" },
      { name: "description", content: "Overview of research runs, spend and recent AI equity reports." },
      { property: "og:title", content: "Dashboard — TradingAgents AI" },
      { property: "og:description", content: "Research runs, spend and recent reports." },
    ],
  }),
  errorComponent:DataError,
  notFoundComponent:DataNotFound,
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data,dataUpdatedAt } = useSuspenseQuery(dashboardQuery);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold tracking-tight">Dashboard</h1>
        <TickerSearch />
      </div>
      <DataFreshness date={new Date(dataUpdatedAt).toISOString()} origin="Database totals retrieved"/><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total Researched Tickers" value={String(data.tickers)} />
        <Metric label="Active Runs" value={String(data.active)} accent={data.active > 0 ? "text-primary" : undefined} />
        <Metric label="MTD Token Spend" value={`$${data.mtd.toFixed(2)}`} />
        <Metric label="Cache Hit Rate" value={data.hitRate == null ? "—" : `${data.hitRate.toFixed(1)}%`} />
      </div>
      <div className="grid gap-5 border-y border-border py-4 md:grid-cols-2">{([['Recently analysed', data.stocks.recent], ['Most analysed', data.stocks.frequent]] as const).map(([title, stocks]) => <section key={title}><h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</h2><div className="divide-y divide-border">{stocks.map(stock => <div key={stock.ticker} className="flex items-center justify-between gap-3 py-2 text-xs"><Link to="/stocks/$ticker" params={{ ticker: stock.ticker }} search={{ range: '1M', period: 'quarter' }} className="font-mono font-semibold text-primary hover:underline">{stock.ticker}</Link><span className="text-muted-foreground">{title === 'Most analysed' ? `${stock.count} completed ${stock.count === 1 ? 'report' : 'reports'}` : stock.lastAnalyzed.slice(0, 10)}</span><Button asChild variant="ghost" size="sm" className="h-6 text-xs"><Link to="/analysis/new" search={{ ticker: stock.ticker }}>Analyse <ArrowUpRight className="h-3 w-3"/></Link></Button></div>)}</div>{!stocks.length && <p className="text-xs text-muted-foreground">No completed live analyses.</p>}</section>)}</div>
      <p className="text-[10px] text-muted-foreground">Stock activity across the latest 500 runs · demo and unfinished runs excluded.</p>
      <section className="rounded-md border border-border bg-secondary">
        <div className="flex h-9 items-center border-b border-border px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent Research
        </div>
        {data.recent.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No research yet.{" "}
            <Link to="/new-analysis" className="text-primary hover:underline">Start a new analysis</Link>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                {["Ticker", "Date", "Status", "Rec.", "Conviction", "Input", "Output", "Total tokens", "Cost · USD", "Credits", ""].map((h, i) => (
                  <th key={i} className={cn("px-3 py-2 text-left font-medium", i >= 4 && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono">
              {data.recent.map((r) => {
                const rep = r.research_reports?.[0];
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-card/60">
                    <td className="px-3 py-1.5 font-semibold text-foreground"><Link to="/stocks/$ticker" params={{ticker:r.ticker}} search={{range:'1M',period:'quarter'}} className="text-primary hover:underline">{r.ticker}</Link><div className="mt-1 min-w-40 max-w-60 whitespace-normal font-sans text-[10px] font-normal text-muted-foreground"><span className="font-medium">{rep ? 'Agents: ' : 'Selected: '}</span>{reportAgentIds(rep?.sections, r.selected_agents).map(id => AGENTS.find(a => a.id === id)?.name ?? id.replace(/_/g, ' ')).join(' · ') || 'Not recorded'}</div></td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.analysis_date}<div><DataFreshness date={r.created_at}/></div></td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.status}</td>
                    <td className="px-3 py-1.5"><RecBadge rec={rep?.recommendation ?? null} /></td>
                    <td className="px-3 py-1.5 text-right">{rep?.conviction_score ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">{(rep?.total_input_tokens ?? r.total_input_tokens).toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right">{(rep?.total_output_tokens ?? r.total_output_tokens).toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right">{((rep?.total_input_tokens ?? r.total_input_tokens)+(rep?.total_output_tokens ?? r.total_output_tokens)).toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right">${Number(rep?.total_cost_usd ?? r.total_cost_usd).toFixed(4)}{r.is_demo && <span className="block text-[9px] text-warning">DEMO · $0 charged</span>}</td>
                    <td className="px-3 py-1.5 text-right"><CreditMetric credits={r.is_demo?0:rep?.lovable_credits??r.lovable_credits} basis={rep?.credit_basis??r.credit_basis}/></td>
                    <td className="px-3 py-1.5 text-right">
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-xs" >
                        {rep ? <Link to="/reports/$id" params={{id:rep.id}}>Report <ArrowUpRight className="h-3 w-3" /></Link> : <Link to="/analysis/$id" params={{id:r.id}}>Run <ArrowUpRight className="h-3 w-3" /></Link>}
                      </Button>
                      {r.status !== "completed" && <DeleteRunButton id={r.id} ticker={r.ticker} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>
      <DashboardAttribution />
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string | undefined }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-xl font-medium", accent)}>{value}</div>
    </div>
  );
}

function RecBadge({ rec }: { rec: string | null }) {
  if (!rec) return <span className="text-muted-foreground">—</span>;
  const cls =
    rec === "BUY" ? "bg-positive/15 text-positive border-positive/30"
    : rec === "SELL" ? "bg-negative/15 text-negative border-negative/30"
    : "bg-warning/15 text-warning border-warning/30";
  return <span className={cn("rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold", cls)}>{rec}</span>;
}

function TickerSearch() {
  const [q,setQ] = useState('');
  const nav = useNavigate();
  return <div className="w-full max-w-sm"><CompanyPicker value={q} onChange={setQ} onSelect={ticker => { void nav({ to:'/analysis/new',search:{ticker} }); }} /></div>;
}

function DeleteRunButton({ id, ticker }: { id: string; ticker: string }) {
  const del = useServerFn(deleteIncompleteRun);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Button size="sm" variant="ghost" aria-label={`Delete ${ticker} run`} className="h-6 px-2 text-xs text-destructive" disabled={busy}
      onClick={async () => {
        if (!window.confirm(`Delete this unfinished ${ticker} run? This cannot be undone.`)) return;
        setBusy(true);
        try { const r = await del({ data: { id } }); toast[r.deleted ? "success" : "error"](r.deleted ? "Run deleted" : "Run could not be deleted"); await qc.invalidateQueries(); }
        catch { toast.error("Run could not be deleted"); } finally { setBusy(false); }
      }}>
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}
