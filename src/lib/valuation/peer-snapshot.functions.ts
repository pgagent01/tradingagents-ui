import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { parsePeerSuggestions } from './peer-suggestions';
/** Uses peers already proposed by the report's own fundamentals model; never makes a new billed AI call. */
export const getReportPeerSnapshot=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:{id:string})=>z.object({id:z.string().uuid()}).parse(input)).handler(async({data,context})=>{
  const {data:report,error}=await context.supabase.from('research_reports').select('ticker,run_id,sections').eq('id',data.id).single();
  if(error||!report) throw new Error('Report unavailable.');
  const {data:run}=await context.supabase.from('research_runs').select('id').eq('id',report.run_id).eq('user_id',context.userId).single();
  if(!run) throw new Error('Report unavailable.');
  const {data:out}=await context.supabase.from('agent_outputs').select('content,model_used').eq('run_id',report.run_id).eq('agent_id','fundamentals').maybeSingle();
  let candidates=parsePeerSuggestions(out?.content??'',report.ticker); let model:string|null=candidates.length?out?.model_used??null:null;
  if(!candidates.length){
    const s=(report.sections??{}) as Record<string,unknown>; const peers=(((s['valuation']??{}) as Record<string,unknown>)['comparables'] as {peers?:{ticker:string}[]}|undefined)?.peers??[];
    candidates=peers.map(p=>p.ticker);
  }
  if(!candidates.length){ const { yahooPeerCandidates }=await import('./peer-fallback.server'); candidates=await yahooPeerCandidates(report.ticker); }
  const { peerSnapshot }=await import('./peer-snapshot.server');
  const snap=await peerSnapshot(context.supabase,context.userId,report.ticker,candidates,model);
  return model?snap:{...snap,note:snap.note.replace('suggested by the report’s own AI model','taken from saved verified peers or Yahoo “similar stocks” (the report’s AI model did not propose any)')};
});
