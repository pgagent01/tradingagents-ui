ALTER TABLE public.research_runs ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz, ADD COLUMN IF NOT EXISTS resume_count integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS last_error_kind text;

CREATE OR REPLACE FUNCTION public.claim_research_execution(_run_id uuid) RETURNS boolean LANGUAGE plpgsql SET search_path TO 'public' AS $$ DECLARE affected integer; BEGIN UPDATE public.research_runs SET status='running',started_at=COALESCE(started_at,now()),last_heartbeat_at=now(),execution_lease_until=NULL WHERE id=_run_id AND user_id=auth.uid() AND status='pending' AND NOT is_demo; GET DIAGNOSTICS affected=ROW_COUNT; RETURN affected=1; END; $$;

CREATE OR REPLACE FUNCTION public.touch_research_run(_run_id uuid) RETURNS void LANGUAGE sql SET search_path TO 'public' AS $$ UPDATE public.research_runs SET last_heartbeat_at=now() WHERE id=_run_id AND user_id=auth.uid() AND status='running'; $$;

CREATE OR REPLACE FUNCTION public.heartbeat_from_event() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$ BEGIN UPDATE public.research_runs SET last_heartbeat_at=now() WHERE id=NEW.run_id AND status='running'; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS research_events_heartbeat ON public.research_events;
CREATE TRIGGER research_events_heartbeat AFTER INSERT ON public.research_events FOR EACH ROW EXECUTE FUNCTION public.heartbeat_from_event();

CREATE OR REPLACE FUNCTION public.expire_stale_research_run(_run_id uuid) RETURNS boolean LANGUAGE plpgsql SET search_path TO 'public' AS $$ DECLARE affected integer; BEGIN
 UPDATE public.research_runs SET status='failed',last_error_kind='interrupted',error_message='The run stopped making progress (connection lost or server timeout). Finished steps are saved; you can resume.',completed_at=now(),execution_lease_until=NULL
 WHERE id=_run_id AND user_id=auth.uid() AND status='running' AND NOT is_demo AND COALESCE(last_heartbeat_at,started_at,created_at) < now()-interval '5 minutes';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected=1 THEN
  UPDATE public.agent_outputs SET status='failed' WHERE run_id=_run_id AND status='running';
  INSERT INTO public.research_events(run_id,event_type,message,data) VALUES(_run_id,'failed','Run marked interrupted after 5 minutes without progress.',jsonb_build_object('kind','interrupted'));
 END IF;
 RETURN affected=1; END; $$;

CREATE OR REPLACE FUNCTION public.resume_research_run(_run_id uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $$ DECLARE r public.research_runs; first_agent text; BEGIN
 SELECT * INTO r FROM public.research_runs WHERE id=_run_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Run not found'; END IF;
 IF r.is_demo THEN RAISE EXCEPTION 'Demo runs cannot be resumed'; END IF;
 IF r.status NOT IN ('failed','cancelled') THEN RAISE EXCEPTION 'Only failed or cancelled runs can be resumed'; END IF;
 IF r.resume_count >= 3 THEN RAISE EXCEPTION 'This run has been resumed 3 times; start a new analysis instead'; END IF;
 IF EXISTS (SELECT 1 FROM public.ai_access_state WHERE user_id=auth.uid() AND paused) THEN RAISE EXCEPTION 'AI access is paused (quota or access denied); restore access before resuming'; END IF;
 DELETE FROM public.agent_outputs WHERE run_id=_run_id AND status IN ('running','failed','cancelled','pending');
 SELECT a INTO first_agent FROM jsonb_array_elements_text(r.selected_agents) a WHERE NOT EXISTS (SELECT 1 FROM public.agent_outputs o WHERE o.run_id=_run_id AND o.agent_id=a AND o.status='completed') LIMIT 1;
 UPDATE public.research_runs SET status='pending',error_message=NULL,last_error_kind=NULL,completed_at=NULL,execution_lease_until=NULL,resume_count=resume_count+1 WHERE id=_run_id;
 INSERT INTO public.research_events(run_id,event_type,message,data) VALUES(_run_id,'resumed','Run resumed from '||COALESCE(first_agent,'final synthesis')||' (attempt '||(r.resume_count+2)||'). Finished steps are kept.',jsonb_build_object('from',COALESCE(first_agent,'synthesis'),'attempt',r.resume_count+2,'previous_status',r.status));
 RETURN jsonb_build_object('resumed',true,'from',COALESCE(first_agent,'synthesis'),'attempt',r.resume_count+2);
END; $$;

GRANT EXECUTE ON FUNCTION public.touch_research_run(uuid), public.expire_stale_research_run(uuid), public.resume_research_run(uuid) TO authenticated;