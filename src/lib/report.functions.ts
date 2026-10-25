import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
export const getReport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:{id:string})=>z.object({id:z.string().uuid()}).parse(input)).handler(async({data,context})=>{
  const {data:report,error}=await context.supabase.from('research_reports').select('*').eq('id',data.id).single();
  if(error) throw new Error('Report not found or unavailable to this account.');
  const {data:run,error:runError}=await context.supabase.from('research_runs').select('*').eq('id',report.run_id).eq('user_id',context.userId).single();
  if(runError) throw new Error('Report not found or unavailable to this account.');
  const {data:outputs,error:outputError}=await context.supabase.from('agent_outputs').select('agent_id,content,model_used,status').eq('run_id',run.id).order('created_at');
  if(outputError) throw outputError;
  return {report,run,outputs:outputs ?? []};
});