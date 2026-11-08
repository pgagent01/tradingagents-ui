import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { queryOptions,useSuspenseQuery,useQueryClient,useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Activity, CheckCircle2, Circle, XCircle, Square, FileText, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UsageMetrics } from '@/components/usage-metrics';
import { getExecution,advanceDemo,cancelAnalysis } from '@/lib/research.functions';
import { CreditMetric } from '@/components/credit-metric';
import { useRef } from 'react';
import { AGENTS } from '@/lib/research-config';
import { supabase } from '@/integrations/supabase/client';
import { pageHead } from '@/lib/page-head';
import { DataError,DataNotFound } from '@/components/route-feedback';
import { cn } from '@/lib/utils';
import { isExecutionQuiet, executionFailureHelp } from '@/lib/execution-guidance';
const executionQuery=(id:string) => queryOptions({queryKey:['execution',id],queryFn:() => getExecution({data:{id}}),refetchInterval:3000});
export const Route=createFileRoute('/_authenticated/analysis/$id')({head:() => pageHead('Live Execution','Agent execution status, realtime activity and per-run token costs.'),validateSearch:zodValidator(z.object({execution:z.boolean().default(false)})),errorComponent:DataError,notFoundComponent:DataNotFound,loader:({context,params}) => context.queryClient.ensureQueryData(executionQuery(params.id)),component:Execution});
function Execution() {
  const {id}=Route.useParams();
  const {data}=useSuspenseQuery(executionQuery(id));
  const qc=useQueryClient();
  const nav=useNavigate();
  const search=Route.useSearch();
  const readyReport=data.reports[0]?.id;
  useEffect(()=>{if(readyReport && data.run.status==='completed' && !search.execution) { void nav({to:'/reports/$id',params:{id:readyReport},replace:true}); }},[readyReport,data.run.status,search.execution,nav]);
  const advance=useServerFn(advanceDemo);
  const cancel=useServerFn(cancelAnalysis);
  const requestAbort=useRef<AbortController|null>(null);
  const [executing,setExecuting]=useState(false);
  const [streamText,setStreamText]=useState('');
  const [liveAgent,setLiveAgent]=useState('');
  const [lastStreamActivity,setLastStreamActivity]=useState(0);
  const [streamError,setStreamError]=useState('');
  const streamParts=useRef<Record<string,string>>({});
  const autoStarted=useRef(false);
  async function startExecution(){
    if(executing)return;setExecuting(true);setStreamText('');setStreamError('');setLastStreamActivity(Date.now());const abort=new AbortController();requestAbort.current=abort;
    try{const {data:session}=await supabase.auth.getSession();if(!session.session)throw new Error('Sign in to run research.');const response=await fetch('/api/research-execute',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.session.access_token}`},body:JSON.stringify({id}),signal:abort.signal});if(!response.ok){const body=await response.json();throw new Error(body.error||'Execution unavailable.');}const reader=response.body?.getReader();if(!reader)throw new Error('No execution stream.');const decoder=new TextDecoder();let buffer='';while(true){const part=await reader.read();if(part.done)break;buffer+=decoder.decode(part.value,{stream:true});let n=buffer.indexOf('\n');while(n>=0){const event=JSON.parse(buffer.slice(0,n));setLastStreamActivity(Date.now());buffer=buffer.slice(n+1);if(event.type==='delta'){const agent=String(event.agent??'analyst');streamParts.current[agent]=((streamParts.current[agent]??'')+event.text).slice(-12000);setLiveAgent(agent);setStreamText(streamParts.current[agent]??'');}if(event.type==='error'){setStreamError(String(event.message));toast.error(event.message);}if(event.type==='completed')void nav({to:'/reports/$id',params:{id:event.reportId}});if(event.type!=='delta')void qc.invalidateQueries({queryKey:['execution',id]});n=buffer.indexOf('\n');}}}catch(e){if(!abort.signal.aborted){const message=e instanceof Error?e.message:'Execution stopped.';setStreamError(message);toast.error(message);}}finally{setExecuting(false);requestAbort.current=null;void qc.invalidateQueries({queryKey:['execution',id]});}
  }
  useEffect(()=>{if(autoStarted.current||data.run.is_demo||data.run.status!=='pending'||sessionStorage.getItem('research-execution-intent')!==id)return;autoStarted.current=true;sessionStorage.removeItem('research-execution-intent');void startExecution();},[id,data.run.status,data.run.is_demo]);
  const [now,setNow]=useState(Date.now());
  const [selected,setSelected]=useState<string|null>(null);
  const [demoError,setDemoError]=useState('');
  const active=['pending','running'].includes(data.run.status);
  const resume=useServerFn(resumeAnalysis);
  const canResume=!data.run.is_demo&&['failed','cancelled'].includes(data.run.status)&&(data.run.resume_count??0)<3;
  const resumeMut=useMutation({mutationFn:() => resume({data:{id}}),onSuccess:async (r) => {toast.success(`Resuming from ${r.from}. Finished steps are kept.`);await qc.invalidateQueries({queryKey:['execution',id]});void startExecution();},onError:(e:Error) => toast.error(e.message)});
  const cancelMut=useMutation({mutationFn:() => cancel({data:{id}}),onSuccess:() => qc.invalidateQueries({queryKey:['execution',id]}),onError:(e:Error) => toast.error(e.message)});
  useEffect(() => { const timer=window.setInterval(() => setNow(Date.now()),1000);return () => window.clearInterval(timer); },[]);
  useEffect(() => {
    const channel=supabase.channel(`execution-${id}-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'research_events',filter:`run_id=eq.${id}`},() => { void qc.invalidateQueries({queryKey:['execution',id]}); }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'research_runs',filter:`id=eq.${id}`},() => { void qc.invalidateQueries({queryKey:['execution',id]}); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  },[id,qc]);
  useEffect(() => {
    if(!data.run.is_demo || !active || demoError) return;
    let disposed=false;
    let timer:ReturnType<typeof setTimeout>;
    const tick=async () => { try { await advance({data:{id}});if(disposed) return;await qc.invalidateQueries({queryKey:['execution',id]});if(!disposed) timer=setTimeout(tick,1200); } catch(e) { if(!disposed) setDemoError(e instanceof Error?e.message:'Demo simulation stopped.'); } };
    timer=setTimeout(tick,1200);
    return () => { disposed=true;clearTimeout(timer); };
  },[id,data.run.is_demo,active,advance,qc,demoError]);
  const agents=Array.isArray(data.run.selected_agents)?data.run.selected_agents.filter((a):a is string => typeof a==='string'):[];
  const elapsed=Math.max(0,Math.floor(((data.run.completed_at?new Date(data.run.completed_at).getTime():now)-new Date(data.run.started_at ?? data.run.created_at).getTime())/1000));
  const selectedOutput=data.outputs.find(o => o.agent_id===selected);
  const report=data.reports[0];
  const lastEvent = Math.max(Date.parse(data.run.started_at ?? data.run.created_at), ...data.events.map(e => Date.parse(e.created_at)).filter(Number.isFinite), lastStreamActivity);
  const quiet = !data.run.is_demo && isExecutionQuiet(data.run.status, now, lastEvent);
  const failureEvent = data.events.find(e => e.event_type === 'failed');
  const failureStatus = failureEvent?.data && typeof failureEvent.data === 'object' && !Array.isArray(failureEvent.data) ? failureEvent.data['status'] : undefined;
  const visibleError = data.run.error_message || streamError;
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-mono text-xl font-semibold">{data.run.ticker} <span className="text-sm font-normal text-muted-foreground">/ Execution</span></h1><p className="mt-1 text-xs text-muted-foreground">{data.run.analysis_date} · {data.run.research_depth} · {data.run.status}{data.run.is_demo?' · DEMO':''} · Lookback {data.run.lookback_days} days · {String((data.run.model_config as {preset?:string})?.preset??'Custom')}</p></div><div className="flex items-center gap-3"><span className="font-mono text-xs">{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</span><Button variant="outline" size="sm" disabled={!active||cancelMut.isPending} onClick={() => {requestAbort.current?.abort();cancelMut.mutate();}}><Square className="h-3 w-3" />Cancel Run</Button>{canResume && <Button size="sm" disabled={resumeMut.isPending||executing} onClick={() => resumeMut.mutate()}><RotateCcw className="h-3 w-3" />Resume run</Button>}</div></header>
    <UsageMetrics input={data.run.total_input_tokens} output={data.run.total_output_tokens} cost={Number(data.run.total_cost_usd)} demo={data.run.is_demo} />
    {data.run.is_demo && <p className="text-xs text-warning">Demo simulation · mock agent events · hypothetical cost shown above · actual charge $0.</p>}
    <CreditMetric credits={data.run.is_demo?0:data.run.lovable_credits} basis={data.run.credit_basis} />
    {!data.run.is_demo&&active&&<Button disabled={executing||data.run.status!=='pending'} size="sm" onClick={()=>void startExecution()}><Activity className="h-4 w-4"/>{executing?'Research in progress…':'Execute research'}</Button>}
    {streamText&&<details open className="border-y border-border py-3"><summary className="text-xs font-semibold">Live output · {liveAgent==='synthesis'?'Final Synthesis':AGENTS.find(a=>a.id===liveAgent)?.name??liveAgent}</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{streamText}</pre></details>}
    {quiet && <div role="status" className="space-y-2 border-l-2 border-warning pl-3 text-xs"><p className="font-medium text-warning">No new activity for {Math.floor((now-lastEvent)/1000)} seconds · {AGENTS.find(a => a.id === liveAgent)?.name ?? data.outputs.find(o => o.status === 'running')?.agent_id ?? 'Research'}</p><p className="text-muted-foreground">The model may still be processing; this does not prove it is stuck or out of quota. You can wait, check activity, or cancel. Reloading will not restart billed work.</p></div>}
    {visibleError&&<div role="alert" className="space-y-2 border-l-2 border-negative pl-3 text-xs"><p className="font-medium text-negative">{visibleError}</p><p className="text-muted-foreground">{executionFailureHelp(failureStatus, visibleError)}</p><Button asChild variant="outline" size="sm"><Link to="/settings">Check provider settings</Link></Button></div>}
    {demoError && <p role="alert" className="text-xs text-negative">{demoError}</p>}
    <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
      <section className="min-w-0"><h2 className="mb-3 text-xs uppercase text-muted-foreground">Agent graph</h2><div className="flex items-center gap-2 border-b border-border pb-4 font-mono text-xs"><Activity className="h-4 w-4 text-primary" />{data.run.ticker} → {agents.length} agents → Consensus report</div><div className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-3">{[...agents,...(!data.run.is_demo?['synthesis']:[])].map(id => {
        const o=data.outputs.find(out => out.agent_id===id);const status=o?.status ?? (data.run.status==='cancelled'?'cancelled':'queued');const Icon=status==='completed'?CheckCircle2:status==='failed'||status==='cancelled'?XCircle:status==='running'?Activity:Circle;
        return <Button key={id} variant="outline" className={cn('h-28 flex-col items-start justify-center gap-2 whitespace-normal border-t-2',status==='completed'?'border-t-positive':status==='running'?'border-t-primary':'border-t-border',selected===id&&'bg-accent')} onClick={() => setSelected(selected===id?null:id)}><span className="text-xs font-semibold">{AGENTS.find(a => a.id===id)?.name ?? (id==='synthesis'?'Final Synthesis':id)}</span><span className={cn('flex items-center gap-1.5 font-mono text-[10px]',status==='completed'?'text-positive':status==='running'?'text-primary':'text-muted-foreground')}><Icon className={cn('h-3.5 w-3.5',status==='running'&&'motion-safe:animate-pulse')} />{status}</span></Button>;
      })}</div>{selected && <div className="border-y border-border py-3 text-xs"><strong>{AGENTS.find(a=>a.id===selected)?.name ?? selected}</strong><p className="mt-2 font-mono text-muted-foreground">{selectedOutput?.model_used ?? 'Awaiting execution'} · Input {selectedOutput?.input_tokens ?? 0} · Output {selectedOutput?.output_tokens ?? 0} · USD ${Number(selectedOutput?.cost_usd ?? 0).toFixed(4)}</p></div>}</section>
      <section className="min-w-0"><h2 className="mb-3 text-xs uppercase text-muted-foreground">Live activity stream</h2><div className="h-96 overflow-y-auto border-y border-border py-3 font-mono text-[11px]" aria-live="polite">{data.events.length===0?<p className="text-muted-foreground">Awaiting first agent event…</p>:data.events.map(e => <div key={e.id} className="flex gap-3 border-b border-border/50 py-2"><time className="shrink-0 text-muted-foreground">{new Date(e.created_at).toISOString().slice(11,19)}</time><span className={e.event_type==='completed'?'text-positive':'text-foreground'}>{e.message}</span></div>)}</div></section>
    </div>
    {report && <section className="space-y-4 border-t border-border pt-4"><header><h2 className="text-lg font-semibold">{report.ticker} Research Report</h2><p className="mt-1 text-xs text-muted-foreground">{data.run.is_demo?'Demo report · not investment advice':report.recommendation} · {new Date(report.created_at).toLocaleString()}</p></header><UsageMetrics input={report.total_input_tokens} output={report.total_output_tokens} cost={Number(report.total_cost_usd)} demo={data.run.is_demo} /><p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{report.executive_summary}</p><Button asChild variant="outline" size="sm"><Link to="/reports/$id" params={{id:report.id}}><FileText className="h-4 w-4" />Research Reports</Link></Button></section>}
  </div>;
}