import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createResearchRun, listMyApiKeys } from "@/lib/access.functions";
import { PROVIDERS } from "@/lib/access-rules";

const AGENTS = [
  "market_analyst",
  "social_analyst",
  "news_analyst",
  "fundamentals_analyst",
  "bull_researcher",
  "bear_researcher",
  "trader",
  "risk_management",
] as const;

const DEPTHS = ["quick", "standard", "deep"] as const;

export const Route = createFileRoute("/_authenticated/new-analysis")({
  head: () => ({
    meta: [
      { title: "New Analysis — TradingAgents AI" },
      { name: "description", content: "Configure agents, depth and models to start a research run." },
      { property: "og:title", content: "New Analysis — TradingAgents AI" },
      { property: "og:description", content: "Configure agents, depth and models to start a research run." },
    ],
  }),
  component: NewAnalysisPage,
});

function NewAnalysisPage() {
  const run = useServerFn(createResearchRun);
  const [ticker, setTicker] = useState("");
  const [provider, setProvider] = useState<string>("openai");
  const [depth, setDepth] = useState<string>("standard");
  const [agents, setAgents] = useState<string[]>(["market_analyst", "news_analyst", "trader"]);

  const keys = useQuery({ queryKey: ["my-api-keys"], queryFn: () => listMyApiKeys() });
  const hasKey = (keys.data ?? []).some((k) => k.provider === provider);

  const runMut = useMutation({
    mutationFn: () => run({ data: { ticker, provider, depth, agents } }),
    onSuccess: (r) => toast.success(`Research run queued for ${r.ticker}`),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold tracking-tight">New Analysis</h1>

      {!keys.isPending && !hasKey && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            You have no {provider} API key yet. Research runs only with your own key —{" "}
            <Link to="/settings" className="font-medium underline">add one in Settings</Link>.
          </span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ticker">Ticker</Label>
          <Input
            id="ticker"
            placeholder="NVDA"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="h-8 font-mono text-xs uppercase"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="depth">Depth</Label>
            <Select value={depth} onValueChange={setDepth}>
              <SelectTrigger id="depth" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPTHS.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Agents</Label>
        <div className="flex flex-wrap gap-1.5">
          {AGENTS.map((a) => {
            const on = agents.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAgents(on ? agents.filter((x) => x !== a) : [...agents, a])}
                className={cn(
                  "rounded-sm border px-2 py-1 font-mono text-[11px] transition-colors",
                  on
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        size="sm"
        className="h-8"
        disabled={!ticker.trim() || agents.length === 0 || !hasKey || runMut.isPending}
        onClick={() => runMut.mutate()}
      >
        <Play className="h-3.5 w-3.5" />
        {runMut.isPending ? "Queuing…" : "Run research"}
      </Button>
      {!hasKey && (
        <p className="text-[11px] text-muted-foreground">
          Run research is disabled until your own API key for this provider is saved.
        </p>
      )}
    </div>
  );
}
