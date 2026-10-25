import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export const analyticsQuery=queryOptions({queryKey:['usage-analytics'],queryFn:async()=>{
  const {data,error}=await supabase.from('research_runs').select('id,ticker,status,is_demo,total_input_tokens,total_output_tokens,total_cost_usd,lovable_credits,credit_basis,created_at').order('created_at',{ascending:false});
  if(error)throw error;const rows=data??[],live=rows.filter(r=>!r.is_demo);
  return {rows,input:live.reduce((n,r)=>n+r.total_input_tokens,0),output:live.reduce((n,r)=>n+r.total_output_tokens,0),usd:live.reduce((n,r)=>n+Number(r.total_cost_usd),0),credits:live.reduce((n,r)=>n+Number(r.lovable_credits??0),0),unknown:live.filter(r=>r.lovable_credits===null).length};
}});