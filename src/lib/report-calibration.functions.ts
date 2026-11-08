import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { reportScorecard } from './report-scorecard.server';
import { calibration } from './report-scorecard';
export const getReportCalibration=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:runs,error}=await context.supabase.from('research_runs').select('id,analysis_date').eq('user_id',context.userId).eq('status','completed').eq('is_demo',false).order('analysis_date',{ascending:false}).limit(50);
  if(error)throw error;
  if(!runs?.length)return {bins:calibration([]),reports:0,limit:50};
  const {data:reports,error:reportError}=await context.supabase.from('research_reports').select('*').in('run_id',runs.map(r=>r.id));
  if(reportError)throw reportError;
  const scored=[];
  // Sequential bounded reports keep provider requests within the worker budget.
  for(const report of reports??[]){const run=runs.find(r=>r.id===report.run_id);if(!run)continue;scored.push({conviction:report.conviction_score,recommendation:report.recommendation,score:await reportScorecard(context.supabase,context.userId,report,run.analysis_date)});}
  return {bins:calibration(scored),reports:scored.length,limit:50};
});