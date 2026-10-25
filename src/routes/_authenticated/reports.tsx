import { createFileRoute, Link } from '@tanstack/react-router';
import { queryOptions,useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UsageMetrics } from '@/components/usage-metrics';
import { pageHead } from '@/lib/page-head';
const reportsQuery=queryOptions({queryKey:['reports'],queryFn:async () => {
  const {data,error}=await supabase.from('research_reports').select('*, research_runs(is_demo)').order('created_at',{ascending:false});
  if(error) throw error;
  return data ?? [];
}});
export const Route=createFileRoute('/_authenticated/reports')({head:() => pageHead('Research Reports','Individual equity reports with input, output, combined tokens and USD costs.'),loader:({context}) => context.queryClient.ensureQueryData(reportsQuery),component:Reports});
function Reports() {
  const {data}=useSuspenseQuery(reportsQuery);
  return <div className="space-y-5"><h1 className="text-lg font-semibold">Research Reports</h1>{data.length===0?<p className="text-xs text-muted-foreground">No completed reports yet.</p>:data.map(r => <article key={r.id} className="space-y-3 border-t border-border pt-4"><header className="flex items-center justify-between gap-4"><div><h2 className="font-mono text-base font-semibold">{r.ticker}</h2><p className="text-xs text-muted-foreground">{r.research_runs?.is_demo?'DEMO · hypothetical cost':r.recommendation} · {new Date(r.created_at).toLocaleDateString()}</p></div><Button asChild size="sm" variant="outline"><Link to="/analysis/$id" params={{id:r.run_id}}>Open report</Link></Button></header><UsageMetrics input={r.total_input_tokens} output={r.total_output_tokens} cost={Number(r.total_cost_usd)} demo={r.research_runs?.is_demo===true} /><p className="max-w-3xl text-sm text-muted-foreground">{r.executive_summary}</p></article>)}</div>;
}
