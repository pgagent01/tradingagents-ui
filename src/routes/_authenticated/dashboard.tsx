import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SYMBOLS = [
  { s: "AAPL", n: "Apple Inc." },
  { s: "NVDA", n: "NVIDIA Corp." },
  { s: "MSFT", n: "Microsoft Corp." },
  { s: "TSLA", n: "Tesla Inc." },
  { s: "AMZN", n: "Amazon.com Inc." },
  { s: "GOOGL", n: "Alphabet Inc." },
  { s: "META", n: "Meta Platforms" },
  { s: "AMD", n: "Advanced Micro Devices" },
];

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: async () => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [runs, cache] = await Promise.all([
      supabase
        .from("research_runs")
        .select("id, ticker, analysis_date, status, total_cost_usd, created_at, research_reports(id, recommendation, conviction_score)")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("research_events").select("event_type").in("event_type", ["cache_hit", "cache_miss"]).limit(1000),
    ]);
    if (runs.error) throw runs.error;
    const rows = runs.data ?? [];
    const tickers = new Set(rows.map((r) => r.ticker.toUpperCase())).size;
    const active = rows.filter((r) => r.status === "running" || r.status === "pending").length;
    const mtd = rows
      .filter((r) => new Date(r.created_at) >= monthStart)
      .reduce((a, r) => a + Number(r.total_cost_usd ?? 0), 0);
    const ev = cache.data ?? [];
    const hits = ev.filter((e) => e.event_type === "cache_hit").length;
    const hitRate = ev.length ? (hits / ev.length) * 100 : null;
    return { tickers, active, mtd, hitRate, recent: rows.slice(0, 15) };
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TradingAgents AI" },
      { name: "description", content: "Overview of research runs, spend and recent AI equity reports." },
      { property: "og:title", content: "Dashboard — TradingAgents AI" },
      { property: "og:description", content: "Research runs, spend and recent reports." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQuery);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold tracking-tight">Dashboard</h1>
        <TickerSearch />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total Researched Tickers" value={String(data.tickers)} />
        <Metric label="Active Runs" value={String(data.active)} accent={data.active > 0 ? "text-primary" : undefined} />
        <Metric label="MTD Token Spend" value={`$${data.mtd.toFixed(2)}`} />
        <Metric label="Cache Hit Rate" value={data.hitRate == null ? "—" : `${data.hitRate.toFixed(1)}%`} />
      </div>
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
          <table className="w-full text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                {["Ticker", "Date", "Status", "Rec.", "Conviction", "Cost", ""].map((h, i) => (
                  <th key={i} className={cn("px-3 py-2 text-left font-medium", i >= 4 && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono">
              {data.recent.map((r) => {
                const rep = r.research_reports?.[0];
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-card/60">
                    <td className="px-3 py-1.5 font-semibold text-foreground">{r.ticker}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.analysis_date}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.status}</td>
                    <td className="px-3 py-1.5"><RecBadge rec={rep?.recommendation ?? null} /></td>
                    <td className="px-3 py-1.5 text-right">{rep?.conviction_score ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">${Number(r.total_cost_usd).toFixed(3)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={!rep}>
                        <Link to="/reports">Open <ArrowUpRight className="h-3 w-3" /></Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
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
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const matches = useMemo(() => {
    const u = q.trim().toUpperCase();
    return u ? SYMBOLS.filter((x) => x.s.startsWith(u) || x.n.toUpperCase().includes(u)) : SYMBOLS.slice(0, 4);
  }, [q]);
  const go = (s: string) => { setOpen(false); void s; nav({ to: "/new-analysis" }); };
  return (
    <div className="relative w-72">
      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) go((matches[0]?.s ?? q).toUpperCase()); }}
        placeholder="Quick ticker search…"
        className="h-8 w-full rounded-md border border-input bg-secondary pl-8 pr-2 font-mono text-xs outline-none focus:border-ring"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {matches.map((m) => (
            <button key={m.s} onMouseDown={() => go(m.s)} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-accent">
              <span className="font-mono font-semibold">{m.s}</span>
              <span className="text-muted-foreground">{m.n}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
