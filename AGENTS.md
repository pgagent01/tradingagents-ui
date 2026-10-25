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
- Use shared company matching and research configuration modules for dashboard/wizard behavior and role-specific USD estimates.
- Use the shared RankedModelSelect and research-config ranking helpers for model dropdowns; compare equal uncached input/output weights within each provider/currency and leave unknown prices unranked.
- Stock data uses authenticated server fetches with bounded owner/version-scoped caches, Yahoo chart-host fallback, owner-encrypted FMP keys, optional server-held Alpha Vantage and SEC filings; unavailable values remain null, annual/quarterly periods stay separate, and charts dynamically import Lightweight Charts after hydration.
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
