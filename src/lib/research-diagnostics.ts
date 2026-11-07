export type ResearchStage = 'initialization'|'evidence'|'agent_start'|'model_stream'|'result_save'|'report_finalize'|'completed';
export type ResearchProgress = { stage: ResearchStage; agent: string | null };
/** Never serialize exceptions, credentials, prompts, headers or provider response bodies. */
export function failureDiagnostic(runId: string, progress: ResearchProgress, status: number, cancelled: boolean) {
  const code=cancelled?'cancelled':progress.stage==='report_finalize'?'report_storage_failed':status===401?'credential_rejected':status===429?'rate_limited':status===422?'invalid_output':'execution_failed';
  return { code, run_id: runId, stage: progress.stage, agent: progress.agent, status: cancelled?499:status, cancelled, automatic_retry: false };
}