# News and social analysis quality

## Objective
Improve the evidence used by the existing news, sentiment, risk and synthesis analysts. Preserve account isolation, selected report models, historical cutoffs and immutable reports. No new agents or automatic paid retries.

## Review findings
- News currently combines recent Yahoo search/RSS, Google News RSS, dated SEC filings and optional GDELT. Article bodies are not retrieved; headline tone is not business impact.
- Duplicate headline filtering exists, but related coverage is not yet grouped into events.
- Social evidence is currently unavailable. A live Bluesky public-search probe returned HTTP 403; public-read documentation alone does not establish search access from this deployment. Do not claim authentication will fix that response or ask for a password without verifying the supported access path.
- Current cache infrastructure is owner-scoped and reusable. Reports already save evidence; improve existing storage rather than introduce duplicate tables.

## 1. News quality foundation
- Apply company/ticker relevance checks consistently to every headline source, including Yahoo search and GDELT. Handle ambiguous symbols and foreign-company aliases conservatively.
- Normalize canonical links and remove tracking duplicates. Conservatively group near-identical same-event coverage within a bounded time window; keep distinct developments separate.
- Preserve every contributing source, publication time and original link. Identify independent publishers versus aggregators; syndication counts are not independent corroboration.
- Add event categories such as earnings/guidance, regulation, litigation, products and financing. Label deterministic categories as classifications, not verified facts or impact scores.
- Retrieve bounded excerpts only from explicitly permitted sources or publisher-provided feeds. Continue using verified SEC release excerpts. Unsupported, paywalled or inaccessible articles remain headline-only.
- Separate publication time, retrieval time, source failure, empty results and stale fallback. Future-dated or undated items cannot establish historical evidence.

## 2. Better analyst conclusions
- Give news and sentiment analysts grouped evidence and available excerpts through their existing selected model calls, including NIM.
- Require dated citations for material claims; distinguish reported facts, company statements, opinions and model interpretations.
- Require a business-impact explanation, opposing evidence and coverage limitations. Do not infer changes in sentiment from a single snapshot.
- Keep news tone, social opinion and prediction probabilities separate. None alone sets intrinsic value or a price target.
- Treat all external content as untrusted input; no instructions from articles or posts enter the execution policy.

## 3. Social-source pilot, gated by access
- Verify a supported read path before activation. Start with Bluesky only if live search access succeeds; otherwise leave it explicitly unavailable and document the result.
- X public search is an alternative through its supported connector, subject to provider entitlement and costs. Workspace-owned credentials must never reuse Prithvi's owner-only credentials or expose private account data. Do not connect a paid service without the user's choice.
- Reddit or other platforms follow only with approved access and retention terms; no access circumvention or unrestricted scraping.
- For an accessible source, collect a bounded dated public-post sample with source links, stable identifiers and minimal author information. Deduplicate posts and repeated text, filter relevance and flag suspicious promotion without claiming bots are proven.
- Show sample size and unique authors. Sparse samples mean insufficient evidence, not neutral sentiment. Any bullish/bearish/neutral classification must declare its method and sample coverage; it is not market-wide sentiment.
- Changes across windows require comparable collection coverage. Omit shifts when earlier snapshots or coverage are missing.
- Respect provider deletion and retention requirements; decide what excerpts can be snapshotted before saving social content permanently.

## 4. Storage, caching and report presentation
- Extend the shared news evidence contract with optional grouped events and excerpt provenance; keep old reports readable.
- Reuse owner-scoped durable caches and bounded in-flight deduplication across stock/report consumers of identical evidence. Include ticker, date, lookback and parser version in keys; include credential version where applicable.
- Retain current 30-minute headline freshness initially. Do not renew stale snapshots on failed refreshes; show their original retrieval time and reason.
- Persist the exact evidence supplied to each new report. Never refresh old report conclusions or silently mix live social results into saved historical reports.
- Show linked event evidence, source coverage and explicit social availability in the existing report sections. Export the same saved evidence and limitations.

## 5. Verification and acceptance
- Add concrete regression tests for relevance, ambiguous tickers, duplicate/event grouping, publication cutoffs, malformed feeds, timeouts, empty results, stale fallback, owner-scoped cache reuse and analyst handoffs.
- Label a small multi-sector news sample manually to assess false relevance and event merges; report sample results, not an unsupported accuracy claim.
- Verify authenticated evidence retrieval, durable-cache readback and reuse, plus saved report rendering/export on desktop and mobile.
- Run one fresh authorized live report after evidence tests pass; review news, sentiment, risk and synthesis citations against saved sources and verify run/report consistency. Record actual costs and never replay interrupted billed stages automatically.
- Mark social integration complete only after live posts reach the selected analyst and saved report. Provider access failures remain named blockers; do not mark unavailable coverage as implemented.

## Technical details
- Browser-safe pure normalization/grouping helpers with adjacent tests; server-only bounded fetch adapters using Web APIs compatible with the existing runtime.
- Existing authenticated execution remains the only AI entry point. Continue using the user-scoped client for cache and research reads/writes; no broader permission policies or credential sharing.
- External article fetching uses an explicit host allowlist, HTTPS, redirect validation, bounded response sizes and timeouts. Never fetch arbitrary links supplied by a model or user, internal addresses or unrestricted redirects.
- Source failures are nonfatal and recorded separately. Aggregate independent source requests with settled results to avoid unhandled rejected promises.
- Keep initial event grouping conservative and versioned; a shared keyword alone cannot merge unrelated stories.

## Execution order
Implement and test news grouping, source status and analyst guidance first; then permitted excerpts and saved display/export. Verify social access before adding its collection adapter. Finish with authenticated cache and report checks, keeping access-dependent work explicitly open.