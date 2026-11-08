CREATE OR REPLACE FUNCTION public.resume_research_run(_run_id uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $$ DECLARE r public.research_runs; first_agent text; BEGIN
 SELECT * INTO r FROM public.research_runs WHERE id=_run_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Run not found'; END IF;
 IF r.is_demo THEN RAISE EXCEPTION 'Demo runs cannot be resumed'; END IF;
 IF r.status NOT IN ('failed','cancelled') THEN RAISE EXCEPTION 'Only failed or cancelled runs can be resumed'; END IF;
 IF r.resume_count >= 3 THEN RAISE EXCEPTION 'This run has been resumed 3 times; start a new analysis instead'; END IF;
 IF EXISTS (SELECT 1 FROM public.ai_access_state WHERE user_id=auth.uid() AND paused) THEN RAISE EXCEPTION 'AI access is paused (quota or access denied); restore access before resuming'; END IF;
 DELETE FROM public.agent_outputs WHERE run_id=_run_id AND status IN ('running','failed','cancelled','pending');
 SELECT a INTO first_agent FROM jsonb_array_elements_text(r.selected_agents) WITH ORDINALITY AS t(a,n) WHERE NOT EXISTS (SELECT 1 FROM public.agent_outputs o WHERE o.run_id=_run_id AND o.agent_id=a AND o.status='completed') ORDER BY CASE a WHEN 'risk' THEN 1000 WHEN 'debate' THEN 1001 ELSE n END LIMIT 1;
 UPDATE public.research_runs SET status='pending',error_message=NULL,last_error_kind=NULL,completed_at=NULL,execution_lease_until=NULL,resume_count=resume_count+1 WHERE id=_run_id;
 INSERT INTO public.research_events(run_id,event_type,message,data) VALUES(_run_id,'resumed','Run resumed from '||COALESCE(first_agent,'final synthesis')||' (attempt '||(r.resume_count+2)||'). Finished steps are kept.',jsonb_build_object('from',COALESCE(first_agent,'synthesis'),'attempt',r.resume_count+2,'previous_status',r.status));
 RETURN jsonb_build_object('resumed',true,'from',COALESCE(first_agent,'synthesis'),'attempt',r.resume_count+2);
END; $$;