import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export const analyticsQuery=queryOptions({queryKey:['usage-analytics'],queryFn:async()=>{
  const {data,error}=await supabase.from('research_runs').select('id,ticker,status,is_demo,total_input_tokens,total_output_tokens,total_cost_usd,lovable_credits,credit_basis,created_at').order('created_at',{ascending:false});
  if(error)throw error;const rows=data??[],live=rows.filter(r=>!r.is_demo);
  const {data:outputs,error:outputError}=await supabase.from('agent_outputs').select('model_used,input_tokens,output_tokens,cost_usd,lovable_credits,created_at,status,run_id').eq('status','completed').in('run_id',live.map(r=>r.id));
  if(outputError)throw outputError;
  return {rows,outputs:outputs??[],input:live.reduce((n,r)=>n+r.total_input_tokens,0),output:live.reduce((n,r)=>n+r.total_output_tokens,0),usd:live.reduce((n,r)=>n+Number(r.total_cost_usd),0),credits:live.reduce((n,r)=>n+Number(r.lovable_credits??0),0),unknown:live.filter(r=>r.lovable_credits===null).length};
}});