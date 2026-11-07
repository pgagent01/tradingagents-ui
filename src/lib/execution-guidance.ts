export function isExecutionQuiet(status: string, now: number, lastActivity: number): boolean {
  return status === 'running' && Number.isFinite(lastActivity) && now - lastActivity >= 90000;
}
export function executionFailureHelp(status: unknown, message: string): string {
  if (status === 429 || /quota|rate.limit|too many requests/i.test(message)) return 'The provider reported a quota or rate limit. Check usage, credits and reset time in your provider account. Wait until access is available, then start a new run. No automatic retry or key rotation is performed.';
  if (status === 402 || /credits.*unavailable|insufficient.*credit/i.test(message)) return 'AI credits are unavailable. Restore the relevant account balance or spending allowance before starting a fresh run.';
  if (status === 401 || /rejected.*key|own provider key/i.test(message)) return 'Check the selected provider key in Settings. Saved does not mean validated.';
  if (status === 403 || /denied access|access is paused/i.test(message)) return 'The provider has blocked access. Resolve the account restriction first; this run will not be retried.';
  return 'Inspect the activity below for the affected analyst. Completed analyst outputs remain saved; a failed run is not automatically restarted.';
}