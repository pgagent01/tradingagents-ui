ALTER TABLE public.research_runs DROP CONSTRAINT research_runs_research_depth_check;
ALTER TABLE public.research_runs ADD CONSTRAINT research_runs_research_depth_check CHECK (research_depth IN ('quick','standard','deep','exhaustive'));
ALTER TABLE public.research_runs ADD COLUMN lookback_days integer NOT NULL DEFAULT 90 CHECK (lookback_days IN (30,90,365)), ADD COLUMN lovable_credits numeric, ADD COLUMN credit_basis text, ADD COLUMN execution_lease_until timestamptz;
ALTER TABLE public.agent_outputs ADD COLUMN lovable_credits numeric, ADD COLUMN credit_basis text, ADD COLUMN usage_details jsonb;
ALTER TABLE public.research_reports ADD COLUMN lovable_credits numeric, ADD COLUMN credit_basis text;
CREATE TABLE public.ai_access_state (user_id uuid PRIMARY KEY, paused boolean NOT NULL DEFAULT false, reason text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.ai_access_state TO authenticated;
GRANT ALL ON public.ai_access_state TO service_role;
ALTER TABLE public.ai_access_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own AI access state" ON public.ai_access_state FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE FUNCTION public.claim_research_execution(_run_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ BEGIN
UPDATE public.research_runs SET execution_lease_until=now()+interval '15 minutes',status='running',started_at=coalesce(started_at,now()) WHERE id=_run_id AND user_id=auth.uid() AND is_demo=false AND status IN ('pending','running') AND (execution_lease_until IS NULL OR execution_lease_until<now());
RETURN FOUND; END; $$;
REVOKE ALL ON FUNCTION public.claim_research_execution(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_research_execution(uuid) TO authenticated;