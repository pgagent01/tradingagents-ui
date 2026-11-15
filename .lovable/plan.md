# Shared evidence and analyst-quality improvement plan

## Objective
Use the sources already connected more consistently across Stock Info and research, reduce duplicate retrieval and repeated news, and give each existing analyst only relevant, dated evidence. Add providers only where they improve measured coverage or reliability. No new agents or automatic paid retries.

## Review findings
- Wikipedia company profiles and research references use separate retrieval and caches, with different company-match rules.
- Firecrawl and Tiingo references already reach fundamentals, news, sentiment, risk, debate and synthesis, but remain separate from the main grouped news events. The same story can appear through several services.
- Some role instructions still emphasize headlines/feed summaries instead of distinguishing all supplied excerpt types.
- Tiingo is connected, but its News API returned HTTP 403: the account has no News API permission. Tiingo price history is not integrated.
- Research references are displayed, but Markdown primarily serializes external evidence generically rather than providing a dedicated, readable reference export.
- Existing tests verify routing and persistence; the latest evidence additions need a fresh completed live-report review. Passing evidence to a model does not establish that its interpretation is correct.
- Optional-provider choices must also govern derived/profile caches. A previously cached FMP company profile must not silently remain active evidence after FMP is disabled. A failed settings read must not be mistaken for a missing setting and restore an owner's default-on state.
- TradingAgents upstream `main` currently matches the recorded reference commit. No base upgrade is required for this work.

## Phase 1 — One company-context service
- Share exact-company resolution, Wikipedia revision retrieval and reusable SEC company context across Stock Info and research.
- Prefer dated primary filings; use verified Wikipedia revision links for background, not financial-statement substitutions.
- Keep effective dates, publication/revision dates and retrieval times separate. Missing leaders, products and competitors stay unavailable.
- Retain structured context such as business lines, geography and sourced competitors when extraction is reliable; secondary competitor mentions are candidates, not valuation peers.
- Include cutoff, parsing version and enabled-provider/credential versions in relevant derived caches. Disable/delete/replacement must prevent active reads of earlier provider-derived results; immutable old reports stay unchanged.
- Make settings-read failures explicitly unavailable and fail closed for optional paid sources; retain free evidence and explain the failure.

**Acceptance:** Stock Info and a same-day research run reuse the same verified Wikipedia revision; concurrent requests share one retrieval. Ambiguous companies, source outages, account changes and provider disable/replacement are tested.

## Phase 2 — One news/event evidence set
- Normalize Yahoo/RSS, GDELT, Firecrawl and available Tiingo items into a shared contract with original publisher, retrieval service, publication time, URL, evidence ID, excerpt type and coverage status.
- Deduplicate canonical URLs and conservatively group near-identical dated stories; preserve distinct events and opposing reporting. Syndication is not independent corroboration.
- Keep original items and their provenance even when grouped. Do not upgrade a search snippet or feed description into a full article.
- Bound retained items, excerpt lengths and prompt size; prioritize company relevance, recency and distinct events, not a single sentiment direction.
- Share the owner-scoped news cache for active views and research; retain the exact selected evidence in each report.
- Treat entitlement failures separately from empty results. No stale access-denied fallback, quota bypass or automatic credential rotation.

**Acceptance:** One story arriving from multiple services counts as one event; conflicting headlines remain distinct; future/undated items are withheld; sparse coverage stays insufficient rather than neutral.

## Phase 3 — Relevant evidence for existing agents

| Existing agent | Evidence to use | Guardrails |
|---|---|---|
| Fundamentals | SEC statements/releases, verified business/geography context, dated guidance and financing events; compatible provider-reported ratios | Filing-period numbers remain authoritative; news or Wikipedia cannot overwrite them. |
| News | Unified events, permitted excerpts, publication dates, original publishers and independent coverage counts | Separate reported facts, company statements, opinion and analyst interpretation. |
| Sentiment | Dated publisher opinion and labelled provider news-tone/entity-sentiment evidence when available | News sentiment, engagement and actual social posts remain separate; none implies representative investor sentiment. |
| Technical | Supported OHLCV, corporate-action/adjustment metadata and dated event markers relevant to the chart | Prose news cannot establish RSI, price movement or volume. Event association is not causation. |
| Risk | Regulatory, litigation, financing and operational events; sourced geography/concentration context; market-data coverage flags | Require supplied denominators for numeric stress impacts; missing facts remain unavailable. |
| Debate | Same bounded evidence set and actual prior findings, including contradictory sources | Challenge dated facts and assumptions, not invented alternative data. |
| Final synthesis | Findings, source conflicts, material events, valuation evidence and coverage limitations | Cite evidence IDs; sentiment alone cannot determine a price target. |

- Update shared guidance and role instructions together so they do not contradict excerpt provenance.
- Use the report-selected models, including NVIDIA NIM. Optional LLM peer identification stays within the selected fundamentals call; no separate paid discovery call.
- Give technical analysis event context only when the event falls within its chart window. New numerical provider inputs require structured adapters and tests first.
- Save the exact per-stage evidence selection and provider settings used. Resume preserves completed findings and identifies refreshed evidence for unfinished stages.

**Acceptance:** Integration tests assert concrete evidence reaches the intended agents and saved report, with irrelevant/current-only evidence excluded. A source-tagged claim sample is manually checked against saved passages.

## Phase 4 — Readable reports and verification
- Show company context and unified events with linked citations, original publication/revision dates, retrieval dates and failed/disabled/insufficient states.
- Add dedicated Markdown reference/event export and keep print output consistent with saved evidence.
- Build labelled fixtures spanning technology, manufacturing, pharma, banking and a non-US listing. Include ambiguous symbols, syndicated stories, contrary claims and stale results.
- Run regressions for owner isolation, default-off settings, encryption, cache readback/reuse, historical cutoffs, malformed payloads, timeouts, entitlement failures and cancellation/resume.
- Run one explicitly authorized fresh paid report after tests pass; inspect all analyst sections, citations, new references, costs and saved evidence on reload and mobile. Do not restart billed work automatically.
- Publish an honest review summary: factual matches, unsupported claims, source coverage and remaining failures. Do not label the entire report factually verified based on ingestion tests.

**Acceptance:** No duplicate final report or analyst billing, run/report usage snapshots match, saved evidence and exports agree, and all reviewed unsupported interpretations are recorded rather than silently rewriting an old report.

## Phase 5 — Provider decisions and gated pilots

### Webz.io: useful for structured news and broader coverage
**Potential value:** structured article text, organization/entity metadata, entity sentiment, source metadata and syndication clusters could materially improve relevance and duplicate-event handling. Separate forums/blogs products may later supply genuine discussions, but a news engagement count is not a social-post sample.

**Recommendation:** pilot only after Phases 1–4 establish a baseline. Compare incremental relevant events and permitted usable excerpts against current sources before expanding. Provider sentiment/trust fields are annotations, not verified truth.

**Access/rights gate:** confirm allowed article storage, excerpt display, export, third-party LLM processing, retention/deletion and historical use for the chosen plan. Current docs describe a 31-day news search window, extended history options and usage-based pricing; archive availability does not establish point-in-time revisions or redistribution rights. No unrestricted full-article retrieval or dark-web collection is proposed.

Sources: [News API](https://docs.webz.io/docs/webz/news-api), [fields](https://docs.webz.io/docs/webz/news-api-post-fields), [pricing](https://webz.io/pricing/).

### Massive.com: useful for structured market-data reliability
**Potential value:** standardized US OHLCV, ticker identifiers, corporate actions, financial statements, provider-calculated TTM ratios and ticker news. These could improve technical inputs, stock/comparable metrics and cross-provider consistency more directly than another general news search service.

**Recommendation:** prioritize a narrow market-data/ratio pilot over another overlapping news feed, subject to access and licensing. Compare dated daily bars and compatible standard ratios with current Yahoo/SEC/FMP evidence; prefer sourced compatible standard values before calculating missing equivalents. Preserve adjustment, session, period and currency distinctions. Never call its computed ratios filing-reconciled or forward forecasts.

**Access/rights gate:** verify endpoint-specific plan entitlements, delayed versus real-time prices, exchange permissions, caching/retention, report export and processing by external LLM providers. Massive explicitly says redistribution requires commercial licensing; individual BYOK does not automatically establish that this hosted app or its report exports are permitted. Default all new accounts off; no connection or billing commitment until this is resolved.

Sources: [Stocks overview](https://massive.com/docs/rest/stocks/overview), [TTM ratios](https://massive.com/docs/rest/stocks/fundamentals/ratios), [news](https://massive.com/docs/rest/stocks/news?assetClass=stocks&license=personal&name=stocks_basic), [redistribution policy](https://massive.com/knowledge-base/article/how-can-i-redistribute-massives-market-data).

### Tiingo follow-up
Keep the current news failure visible. If the account's plan supports EOD price history, evaluate it as an optional shared market-data fallback after confirming access and adjustment semantics. Do not claim its financial ratios or news permission exist. News activation waits for Tiingo News API permission.

**Pilot acceptance:** demonstrate incremental coverage or reliability on the labelled stock set, document endpoint access and rights, and disclose provider cost/quotas before enabling ongoing retrieval. Reject an integration that merely duplicates current evidence without measurable improvement.

## Technical implementation and safeguards
- Preserve TanStack authenticated server boundaries, existing encrypted user-key storage and owner-only policies. No shared credential exposure or broader admin access.
- Reuse `research_data_cache` for evidence, not as a substitute for immutable report snapshots. Distinguish missing records from failed reads; version derived caches by configuration, parsing and relevant credentials.
- Keep normalization, event matching and evidence selection pure/browser-safe with focused tests; network adapters remain server-only, bounded and redirect-safe.
- Respect connector transport mode for supplied credentials; use authenticated direct APIs for personal keys. New integrations remain optional, disabled for other accounts until explicitly enabled with their own credentials.
- Treat article text, posts and model findings as untrusted material; never execute embedded instructions or follow arbitrary supplied fetch URLs.
- Keep historical analysis excluded until publication/revision and market-data semantics are proven; historical availability alone is not certified backtesting.

## Execution order and dependencies
1. Shared company context and safe settings/cache semantics.
2. Unified news events and bounded analyst-specific evidence.
3. Guidance, readable reports/exports and regression checks.
4. Authorized live report and labelled accuracy review.
5. Massive market-data pilot first if permissions and licensing fit; Webz.io news pilot if baseline coverage gaps justify its cost.

**External dependencies:** Tiingo News API permission; selected Webz.io/Massive plans and applicable storage, display, export and LLM-processing rights. Neither new service will be connected by approving this plan alone, and no new API keys are requested now.
