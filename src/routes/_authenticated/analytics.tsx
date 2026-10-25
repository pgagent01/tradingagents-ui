import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from '@tanstack/react-query';
import { analyticsQuery } from '@/lib/analytics-query';
import { CreditMetric } from '@/components/credit-metric';
import { DataError } from '@/components/route-feedback';

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Token & Cost Analytics — TradingAgents AI" },
      { name: "description", content: "Token usage and spend breakdown per run, agent and model." },
      { property: "og:title", content: "Token & Cost Analytics — TradingAgents AI" },
      { property: "og:description", content: "Token usage and spend breakdown per run, agent and model." },
    ],
  }),
  errorComponent:DataError,
  loader:({context})=>context.queryClient.ensureQueryData(analyticsQuery),
  component: Analytics,
});
function Analytics(){const {data}=useSuspenseQuery(analyticsQuery);return <div className="space-y-5"><h1 className="text-lg font-semibold">Token & Cost Analytics</h1><div className="grid gap-4 border-y border-border py-5 sm:grid-cols-4">{[['Lovable Credits Used',`${data.credits.toFixed(4)} calculated`],['Input / Output Tokens',`${data.input.toLocaleString()} / ${data.output.toLocaleString()}`],['Total Tokens',(data.input+data.output).toLocaleString()],['Estimated USD Cost',`$${data.usd.toFixed(4)}`]].map(([label,value])=><div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-mono text-base text-primary">{value}</p></div>)}</div><p className="text-xs text-muted-foreground">Demo runs excluded. {data.unknown} runs have unrecorded credit usage. Calculated token credits are estimates, not verified workspace deductions; tool fees and unknown usage are excluded.</p><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left">{['Ticker','Status','Date','Input','Output','Total','USD','Credits'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{data.rows.map(r=><tr key={r.id} className="border-b border-border"><td className="p-2 font-mono">{r.ticker}{r.is_demo?' · DEMO':''}</td><td className="p-2">{r.status}</td><td className="p-2">{r.created_at.slice(0,10)}</td><td className="p-2">{r.total_input_tokens}</td><td className="p-2">{r.total_output_tokens}</td><td className="p-2">{r.total_input_tokens+r.total_output_tokens}</td><td className="p-2">${Number(r.total_cost_usd).toFixed(4)}</td><td className="p-2"><CreditMetric credits={r.is_demo?0:r.lovable_credits} basis={r.credit_basis}/></td></tr>)}</tbody></table></div></div>;}
