ALTER TABLE public.user_settings ADD COLUMN simulate_demo_run boolean NOT NULL DEFAULT false;
ALTER TABLE public.research_runs ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.research_reports ADD COLUMN total_input_tokens integer NOT NULL DEFAULT 0;
ALTER TABLE public.research_reports ADD COLUMN total_output_tokens integer NOT NULL DEFAULT 0;
ALTER TABLE public.research_reports ADD COLUMN total_cost_usd numeric NOT NULL DEFAULT 0;
ALTER TABLE public.research_reports ADD COLUMN usage_recorded boolean NOT NULL DEFAULT false;
UPDATE public.research_reports p SET total_input_tokens=r.total_input_tokens, total_output_tokens=r.total_output_tokens, total_cost_usd=r.total_cost_usd, usage_recorded=true FROM public.research_runs r WHERE p.run_id=r.id;
CREATE INDEX research_events_run_time_idx ON public.research_events(run_id, created_at);
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='research_events') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.research_events; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='research_runs') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.research_runs; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.advance_demo_run(_run_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r public.research_runs; a text; i integer; n integer; cfg jsonb; inp integer; outp integer; cost numeric; phase text;
BEGIN
SELECT * INTO r FROM public.research_runs WHERE id=_run_id AND user_id=auth.uid() FOR UPDATE;
IF r.id IS NULL THEN RAISE EXCEPTION 'Run unavailable'; END IF;
IF NOT r.is_demo THEN RAISE EXCEPTION 'Simulation is restricted to demo runs'; END IF;
IF r.status NOT IN ('pending','running') THEN RETURN; END IF;
IF r.status='pending' THEN
UPDATE public.research_runs SET status='running', started_at=now() WHERE id=r.id;
INSERT INTO public.research_events(run_id,event_type,message) VALUES(r.id,'started','Demo simulation started. No LLM calls or charges.');
RETURN;
END IF;
SELECT count(*) INTO n FROM public.agent_outputs WHERE run_id=r.id AND status='completed';
a := r.selected_agents->>n;
IF a IS NULL THEN RETURN; END IF;
IF EXISTS(SELECT 1 FROM public.agent_outputs WHERE run_id=r.id AND agent_id=a AND status='running') THEN
cfg := r.model_config->'roles'->a;
inp := CASE r.research_depth WHEN 'deep' THEN 4000 WHEN 'quick' THEN 1000 ELSE 2000 END;
outp := CASE r.research_depth WHEN 'deep' THEN 1000 WHEN 'quick' THEN 250 ELSE 500 END;
cost := (inp*coalesce((cfg->>'inputRate')::numeric,0)+outp*coalesce((cfg->>'outputRate')::numeric,0))/1000000;
UPDATE public.agent_outputs SET status='completed', input_tokens=inp, output_tokens=outp, cost_usd=cost, content='Simulated agent output. Not investment research.' WHERE run_id=r.id AND agent_id=a;
UPDATE public.research_runs SET total_input_tokens=total_input_tokens+inp,total_output_tokens=total_output_tokens+outp,total_cost_usd=total_cost_usd+cost WHERE id=r.id;
INSERT INTO public.research_events(run_id,agent_id,event_type,message,data) VALUES(r.id,a,'completed',a||' completed (simulated)',jsonb_build_object('input_tokens',inp,'output_tokens',outp,'cost_usd',cost));
IF n+1=jsonb_array_length(r.selected_agents) THEN
SELECT * INTO r FROM public.research_runs WHERE id=r.id;
INSERT INTO public.research_reports(run_id,ticker,recommendation,executive_summary,sections,total_input_tokens,total_output_tokens,total_cost_usd,usage_recorded) VALUES(r.id,r.ticker,'HOLD','DEMO ONLY — simulated agent outputs; no market data was fetched and no investment recommendation is made.',jsonb_build_object('demo',true),r.total_input_tokens,r.total_output_tokens,r.total_cost_usd,true);
UPDATE public.research_runs SET status='completed',completed_at=now() WHERE id=r.id;
INSERT INTO public.research_events(run_id,event_type,message) VALUES(r.id,'report_ready','Demo report ready. Displayed cost is hypothetical; actual charge $0.');
END IF;
ELSE
INSERT INTO public.agent_outputs(run_id,agent_id,model_used,status) VALUES(r.id,a,coalesce(r.model_config->'roles'->a->>'model','demo'),'running');
INSERT INTO public.research_events(run_id,agent_id,event_type,message) VALUES(r.id,a,'running',a||' running (simulated)');
END IF;
END $$;
REVOKE ALL ON FUNCTION public.advance_demo_run(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.advance_demo_run(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.record_report_usage() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
SELECT total_input_tokens,total_output_tokens,total_cost_usd INTO new.total_input_tokens,new.total_output_tokens,new.total_cost_usd FROM public.research_runs WHERE id=new.run_id;
new.usage_recorded := true;
RETURN new;
END $$;
CREATE TRIGGER record_report_usage BEFORE INSERT ON public.research_reports FOR EACH ROW EXECUTE FUNCTION public.record_report_usage();