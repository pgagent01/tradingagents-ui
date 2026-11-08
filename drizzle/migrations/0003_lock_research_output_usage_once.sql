CREATE OR REPLACE FUNCTION public.save_agent_result(_output_id uuid, _result jsonb) RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE o public.agent_outputs; r public.research_runs; run_uuid uuid; BEGIN
 SELECT a.run_id INTO run_uuid FROM public.agent_outputs a JOIN public.research_runs x ON x.id=a.run_id WHERE a.id=_output_id AND x.user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Output unavailable'; END IF;
 SELECT * INTO r FROM public.research_runs WHERE id=run_uuid AND user_id=auth.uid() FOR UPDATE;
 SELECT * INTO o FROM public.agent_outputs WHERE id=_output_id AND run_id=run_uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Output unavailable'; END IF;
 IF o.status='completed' THEN RETURN; END IF;
 IF r.status<>'running' OR o.status<>'running' THEN RAISE EXCEPTION 'Run or output is not active'; END IF;
 IF COALESCE((_result->>'input')::integer,0)<0 OR COALESCE((_result->>'output')::integer,0)<0 OR COALESCE((_result->>'cost')::numeric,0)<0 THEN RAISE EXCEPTION 'Invalid usage'; END IF;
 UPDATE public.agent_outputs SET content=_result->>'text',status='completed',input_tokens=COALESCE((_result->>'input')::integer,0),output_tokens=COALESCE((_result->>'output')::integer,0),cost_usd=COALESCE((_result->>'cost')::numeric,0),lovable_credits=(_result->>'credit')::numeric,credit_basis='calculated',usage_details=_result->'details' WHERE id=o.id;
 UPDATE public.research_runs SET total_input_tokens=total_input_tokens+COALESCE((_result->>'input')::integer,0),total_output_tokens=total_output_tokens+COALESCE((_result->>'output')::integer,0),total_cost_usd=total_cost_usd+COALESCE((_result->>'cost')::numeric,0),lovable_credits=CASE WHEN (_result->>'credit') IS NULL OR (lovable_credits IS NULL AND total_input_tokens+total_output_tokens>0) THEN NULL ELSE COALESCE(lovable_credits,0)+(_result->>'credit')::numeric END,credit_basis='calculated',last_heartbeat_at=now() WHERE id=o.run_id AND user_id=auth.uid();
 END; $function$;
REVOKE ALL ON FUNCTION public.save_agent_result(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_agent_result(uuid,jsonb) TO authenticated;