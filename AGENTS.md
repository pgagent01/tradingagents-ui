<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Authenticate every account mutation with requireSupabaseAuth and scope queries to context.userId; roles never grant access to another user's credentials or research.
- API keys are encrypted with Web Crypto AES-GCM and decrypted only in server helpers; server functions never return plaintext keys.
- Use shared browser-safe credential guidance for provider setup links and selected-role missing-key checks; optional data credentials never block AI research, and saved status never implies validation.
- Alpha Vantage uses owner-encrypted credentials, not shared environment keys; cache sanitized overview evidence by owner and credential version, keep TTM ratios separate from filing-period statements, and feed enrichment through the shared stock service into current-date research.
- NVIDIA stores up to three keys in a versioned encrypted envelope in the existing owner-only credential row; all credential writes preserve unrelated slots and Settings uses dedicated slot controls. Active-key selection is explicit, never quota-driven. NVIDIA model fallback is bounded to pre-stream transient HTTP failures, records actual models, and never replays quotas, denials, refusals or partial output to avoid bypassing limits or duplicate billing.
- Use shared company matching with a dated SEC catalog snapshot for dashboard/wizard/server submission; resolve exact or unique normalized names, never arbitrary ambiguous fragments. The shared selector offers direct symbols and authenticated, bounded, cached Yahoo backup search; saved SEC matches survive remote failures. Research configuration stays shared for role-specific USD estimates.
- Use the shared RankedModelSelect and research-config ranking helpers for model dropdowns; compare equal uncached input/output weights within each provider/currency and leave unknown prices unranked.
- Stock data uses authenticated fetches, owner/version-scoped durable research_data_cache plus bounded hot caches, Yahoo fallback, owner-encrypted FMP keys and SEC filings; annual/quarterly periods stay separate, unavailable values remain null, and charts load after hydration. Research finalization stores immutable stock snapshots and role metadata in report sections; current market snapshots are excluded from historical-date runs.
- Store demo execution progress in Lovable Cloud and advance one atomic locked step per request; demo mode never calls an LLM and costs are labeled hypothetical.
- Snapshot run token totals and USD cost into each report on insert; report views use the report snapshot rather than account-wide totals.
- Keep /new-analysis as a compatibility redirect to /analysis/new; /analysis/$id owns execution and redirects completed runs to the report-first /reports/$id viewer.

- Execute AI only through the authenticated streaming research endpoint; claim pending runs once and never reclaim running work, preventing duplicate billed execution.
- Commit agent usage totals and final reports through owner-scoped transactional database functions so cancellation and usage snapshots remain consistent.
- Keep gateway catalogs and credit-rate snapshots server-side; displayed credits are calculated token estimates, not verified billed deductions, and unknown usage is not zero.
- Admin analytics use a role-checked cost-only aggregate RPC; no broader research or credential SELECT policies are added, preserving account isolation.
- Saved active providers initialize wizard role defaults once; each run retains its own role configuration so later setting changes cannot alter execution.
- Wizard submission uses a consumed, run-specific session intent to start execution once; server-side pending-run claiming remains the authority against duplicate charges.
- Keep macro/data credential providers separate from execution providers; use the same authenticated encrypted key storage without granting FRED access to LLM selection.
- Persist sanitized external evidence in owner-only caches and report sections; use FRED point-in-time vintages and omit current prediction quotes from historical analysis to prevent look-ahead bias.
- Route built-in OpenAI through Responses, Claude through Messages and Gemini through Chat Completions; validate Gemini synthesis JSON server-side because its compatible SDK does not reliably enforce report schemas.
- Same-stock comparisons read completed owner-scoped reports through authenticated functions, use analysis dates separately from creation timestamps, and never invent missing snapshots or compare different tickers.

- Company context prefers cached free SEC filings and dated Wikipedia references before owner-encrypted FMP enrichment; each fact retains its source/effective date, unresolved facts stay unavailable, and retrieval freshness is separate from evidence age.
- Clear private query caches on account identity transitions so a new session cannot display the previous account’s research.
- Ticker comparison and watchlist alerts share pure helpers in src/lib/ticker-insights.ts (Piotroski from SEC annual facts, beta vs SPY, consensus from owner's non-demo reports); missing inputs never trigger alerts or estimated values.
- Keep live synthesis validation in the shared research-result schema so structured and JSON-only providers enforce the same required rating contract under regression tests; legacy and demo reports may remain unrated.
- Technical research uses cached daily history with lookback-filtered OHLCV and technicalindicators warm-up calculations; persist dated evidence and omit unavailable values rather than inventing signals. Current stock snapshots remain excluded from historical research.
- Route dated filings/headlines to fundamentals as well as news, sentiment, risk and synthesis; use both Yahoo hosts for headline retrieval, and label absent social feeds explicitly so proxies cannot be mistaken for measured sentiment.
- Share filing-aligned SEC period selection across stock and research; derive quarters only from same-filing same-concept comparatives to avoid YTD mislabeling.
