CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY,
  default_provider text NOT NULL DEFAULT 'openai',
  default_depth text NOT NULL DEFAULT 'standard' CHECK (default_depth IN ('quick','standard','deep')),
  daily_budget_usd numeric NOT NULL DEFAULT 10,
  theme text NOT NULL DEFAULT 'dark',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  ticker text NOT NULL,
  analysis_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  research_depth text NOT NULL DEFAULT 'standard' CHECK (research_depth IN ('quick','standard','deep')),
  selected_agents jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_input_tokens int NOT NULL DEFAULT 0,
  total_output_tokens int NOT NULL DEFAULT 0,
  total_cost_usd numeric NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_runs TO authenticated;
GRANT ALL ON public.research_runs TO service_role;
ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own runs" ON public.research_runs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.research_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.research_runs(id) ON DELETE CASCADE,
  agent_id text, event_type text NOT NULL, message text, data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.research_runs(id) ON DELETE CASCADE,
  agent_id text NOT NULL, model_used text, content text, status text DEFAULT 'pending',
  input_tokens int NOT NULL DEFAULT 0, output_tokens int NOT NULL DEFAULT 0, cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.research_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.research_runs(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  recommendation text CHECK (recommendation IN ('BUY','HOLD','SELL')),
  conviction_score int, price_target numeric, executive_summary text,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_events, public.agent_outputs, public.research_reports TO authenticated;
GRANT ALL ON public.research_events, public.agent_outputs, public.research_reports TO service_role;
ALTER TABLE public.research_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.research_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.research_runs r WHERE r.id = run_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.research_runs r WHERE r.id = run_id AND r.user_id = auth.uid()));
CREATE POLICY "own outputs" ON public.agent_outputs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.research_runs r WHERE r.id = run_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.research_runs r WHERE r.id = run_id AND r.user_id = auth.uid()));
CREATE POLICY "own reports" ON public.research_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.research_runs r WHERE r.id = run_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.research_runs r WHERE r.id = run_id AND r.user_id = auth.uid()));
CREATE INDEX ON public.research_runs(user_id, created_at DESC);
CREATE INDEX ON public.research_reports(run_id);