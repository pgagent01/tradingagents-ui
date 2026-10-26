CREATE TABLE public.watchlist_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 ticker text NOT NULL,
 valuation_threshold_pct numeric NOT NULL DEFAULT 15,
 notify_sentiment boolean NOT NULL DEFAULT true,
 notify_earnings boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, ticker)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist_items TO authenticated;
GRANT ALL ON public.watchlist_items TO service_role;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner-only watchlist" ON public.watchlist_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);