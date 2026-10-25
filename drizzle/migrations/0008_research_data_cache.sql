CREATE TABLE public.research_data_cache (
 user_id uuid NOT NULL,
 provider text NOT NULL,
 cache_key text NOT NULL,
 payload jsonb NOT NULL,
 fetched_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY (user_id, provider, cache_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_data_cache TO authenticated;
GRANT ALL ON public.research_data_cache TO service_role;
ALTER TABLE public.research_data_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner-only data cache" ON public.research_data_cache FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX research_data_cache_expiry ON public.research_data_cache(expires_at);