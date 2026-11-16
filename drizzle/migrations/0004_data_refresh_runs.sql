CREATE TABLE public.data_refresh_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','partial','failed','update_due')),
  checked integer NOT NULL DEFAULT 0,
  refreshed integer NOT NULL DEFAULT 0,
  message text,
  ran_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.data_refresh_runs TO authenticated;
GRANT ALL ON public.data_refresh_runs TO service_role;
ALTER TABLE public.data_refresh_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read refresh health" ON public.data_refresh_runs FOR SELECT TO authenticated USING (true);
CREATE INDEX data_refresh_runs_source_ran ON public.data_refresh_runs (source, ran_at DESC);