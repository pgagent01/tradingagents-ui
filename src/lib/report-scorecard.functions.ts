import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { reportScorecard } from './report-scorecard.server';
export const getReportScorecard=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:{id:string})=>z.object({id:z.string().uuid()}).parse(input)).handler(async({data,context})=>{
  const {data:report,error}=await context.supabase.from('research_reports').select('*').eq('id',data.id).single();
  if(error||!report)throw new Error('Report unavailable.');
  const {data:run,error:runError}=await context.supabase.from('research_runs').select('analysis_date,is_demo').eq('id',report.run_id).eq('user_id',context.userId).single();
  if(runError||!run||run.is_demo)throw new Error('Outcome scoring is available only for your real research reports.');
  return reportScorecard(context.supabase,context.userId,report,run.analysis_date);
});