# Roadmap

- [x] Validate SEC duration alignment and derive compatible same-filing YTD quarters with per-fact provenance; refresh parsed caches. Missing compatible comparative facts stay unavailable rather than subtracting across restatements.
- [x] Add bounded indicator-availability/annual-financial-age claim checks before synthesis, preserve warnings in new reports, and show limited-scope review on saved reports. This is not a full factual audit; old report content remains unchanged.
- [x] Align visible glossary and Markdown export, include saved technical evidence, repair invalid comparison selections and distinguish same-day saves. Authenticated saved report, section shortcuts, Markdown download, PDF glossary and invalid comparison warning verified without runtime errors; 190 automated tests passed.
- [ ] Verify comparison using two real reports for one ticker — blocked: four saved reports belong to four distinct tickers; no second billed run started in this task.
- [ ] Verify new claim checks in a fresh live LLM report — pending a fresh user-started analysis; simulated execution-to-persistence tests passed, but no new billed run was started here.

- [x] Show snapshot-based agents in dashboard report rows and accessible financial/technical explanations, including saved RSI/MACD indicators; hover and keyboard checks passed.
- [x] Run one real AVGO six-analyst NVIDIA report: saved HOLD / 45 conviction / High risk, all seven model stages completed, 153,022 tokens, estimated USD $0.0883. Authenticated report/dashboard/stock flow verified without runtime errors. Model claim inconsistencies remain documented future quality work, not silently corrected in the saved report.
- [x] Identify social source candidates and access/retention limitations: Bluesky public pilot, approved Reddit, Stocktwits partner access, instance-based Mastodon; no new feed connected.
- [x] Add persistent stream errors, quota/credit guidance and 90-second inactivity warning without declaring a model dead or restarting billed work. Add dashboard recent/frequent completed stocks and links to quarterly Stock Info. 176 tests/build passed; mobile and desktop links/tooltips verified. No natural quota outage induced.
- [x] Explain stored data, owner-scoped caching, latest financial sources and prioritized quality/usability improvements; document cache semantics and model-claim validation gaps.

- [x] Fix same-company comparison: honor explicit right selection, retain both selections, read stored risk/metadata and actual models, refresh history. Authenticated LITE one-report state verified; two-real-report browser comparison unavailable because remix has one report. Distinct-report selection covered by tests.
- [x] Add safe staged execution diagnostics and immutable specialist content/model snapshots in new reports; report rendering falls back to stored content. 171 tests passed and build OK. Existing reports unchanged; no new billed run started. Atomic report/run finalization confirmed in database; cleanup writes remain separate and future live failure verification is pending.

- [x] Improve financial evidence consistency: withhold non-positive P/E and contradictory SEC gross profit, preserve losses, bound annual durations, refresh evidence cache versions and add regression coverage. Exact per-fact provenance/cross-provider reconciliation remain future work.
- [x] Identify verified free evidence sources and limitations: SEC full text, GDELT, World Bank, OECD, FINRA; documented as candidates, not connected feeds.
- [x] Document safe TradingAgents upstream review and add weekly/manual GitHub issue monitor. Activation/execution waits for an app-owned GitHub repository with Actions/Issues enabled; no automatic Python imports or deployments.

- [x] Configure the remixed account's three encrypted NVIDIA slots and FRED, FMP, Alpha Vantage credentials; NVIDIA slots, FRED and FMP passed live tests. Alpha Vantage saved but access unconfirmed (tracked below).
- [x] Grant gprithvi@gmail.com admin access; keep all supplied credentials scoped only to that account. Role and authenticated admin controls verified.
- [x] Audit imported analyst evidence routing and fix handoffs with regressions; 162 tests and build passed. Fresh NVIDIA LITE six-agent report saved and viewed with HOLD, conviction 45, High risk, 64 daily bars, SEC fundamentals and linked filings/headlines. Social posts remain unavailable and labeled; headline/prediction proxies are not measured social sentiment.

- [x] Fix current-date technical research evidence: daily year retrieval, selected-lookback OHLCV, moving averages/RSI/MACD/Bollinger/ATR, dated source/cache metadata and persisted evidence. Missing-history regression reproduced then passed; 144 tests/build OK. Fresh NVIDIA LITE report completed with 63 daily bars and verified saved indicators. Existing runs untouched; historical-date stock retrieval remains unavailable by design.

- [x] Add missing-key warnings throughout analysis setup, provider acquisition/update guidance and retry controls in Settings. Confirmed requesting account has FRED/FMP/NVIDIA saved; authenticated warning→Settings flow verified at desktop/mobile sizes without runtime errors.
- [x] Assess free fundamentals and add owner-encrypted Alpha Vantage key controls, validation, quote/daily-history fallback and separately labeled TTM enrichment through stock/research snapshots. Owner/version-scoped overview caching and quota/error safeguards tested; 137 tests passed, build OK, authenticated LITE stock page verified.
- [ ] Validate Alpha Vantage live enrichment — blocked: supplied key saved, but provider did not confirm endpoint access; quota or entitlement may be responsible. Free SEC/Yahoo evidence remains usable.

- [x] Verify additional symbols (LITE, COHR, PLTR, CRM, ADBE), add five-minute cached free Yahoo backup with secondary endpoint and saved SEC fallback, and explicit direct-ticker entry in the shared selector. Live Siemens backup → SIE.DE and direct COHR navigation/LITE wizard persistence verified; 123 tests passed, build OK.

- [x] Fix company-name submission as a ticker using the dated SEC company catalog; verified dashboard Enter and wizard Continue resolve Lumentum → LITE. Authenticated LITE page returned Yahoo quote/history and SEC filings. Existing LUMENTUM run was not changed or replayed.

- [x] Diagnose NVIDIA key rejection and unify Settings management for up to three keys without overwriting backups. Latest META run recorded rejection; live rechecks returned temporary 503 then successful replies for key 1, and successful replies for keys 2/3. Dedicated add/replace/test/select controls and backup-preservation tests added; 112 tests passed, build OK.
- [x] Set NVIDIA NIM as the requesting account's default and verify saved settings and key/model testing. Preference persisted after reload and all seven wizard roles initialized to NVIDIA. No failed billed run was automatically retried.
- [x] Recheck active key 1 and replace with the supplied credential only if rejection persists, not to bypass quota. Key 1 returned successful replies on two rechecks; no replacement needed and supplied fourth key was not stored.

- [x] Add NVIDIA transient-outage model backups: simulated 503→502→success coverage, terminal-status safeguards, actual-model accounting; all three models returned live replies.
- [x] Add encrypted NVIDIA backup-key management: all three account-owned keys returned live replies, explicit selection persisted after reload; quota exhaustion stops rather than bypassing provider limits. 110 tests passed and build OK. No natural provider outage was induced and no new full report was run in this verification.

- [x] Explain visible versus AI-spendable credits: current balance shows 3.70 daily credits, but the AI Gateway applicability balance is 0.00.

- [x] Add regression coverage for required live report ratings, conviction and risk classification while preserving unavailable targets and legacy reports.
- [x] Verify a fresh rated live report through execution and saved report view — NVIDIA LITE report completed November 6 with SELL, 55 conviction, High risk and saved technical evidence; no old run replayed. Built-in AI Gateway balance not rechecked.

- [x] Add Stock Info routes, cached multi-source market data, interactive charts/financial statements, sidebar integration and regression/live verification.
- [x] Add encrypted owner-only FMP credentials, validation, owner-key market fallbacks and annual/quarterly statements; verify masking and fallback tests.
- [x] Run authenticated end-to-end app integration checks after Stock Info/FMP completion; report any credential-dependent gaps.
- [x] Persist researched-stock market snapshots alongside reports and readable agent/model metadata, preserving historical-date correctness and owner isolation.
- [x] Add same-stock report comparisons across analysis dates, including conclusions, target prices, models/agents and saved market values.
- [x] Add trusted-source company details to Stock Info, free sources first; linked citations, cached retrieval and freshness indicators across important app data.

- [x] Rank model choices by equal-weight input/output blended cost; numbered ranks and Cheapest badges verified in triggers/lists, selection updates checked, 60 tests passed and build/typechecks passed.

- [x] Integrate encrypted FRED credential management, dated/cache-aware macro ingestion and public Polymarket context/report evidence; authenticated live report verified with cached prediction evidence and explicit missing-FRED-key state.
- [x] Apply final requested OpenAI/Lovable GPT-6 Luna defaults, retain GPT-5.4 Mini and low-cost Claude/Gemini choices; 55 tests passed and a live Luna/Gemini report saved.
- [x] Make Claude Haiku 4.5 and current Gemini 3.1 Flash-Lite selectable per role; verified dropdowns and provider-specific execution protocols.
- [x] Validate live FRED observations with saved owner key — fresh November 6 LITE report displayed dated macro observations through the authenticated research flow.

- [x] Correct reported wizard navigation and analytics string-state errors; confirmed clean build.

- [x] Phase 4 analytics: interactive usage/cost history, total runs, model efficiency, and admin aggregate per-user costs without exposing private research or credentials.
- [x] Phase 4 live execution: built-in AI verified with six specialists plus synthesis and saved report; BYOK OpenAI, Anthropic, Groq, OpenRouter wired, with real-key verification tracked below.
- [x] Phase 4 settings: active provider selection, provider-key management/testing, and primary-admin invite management verified.

- [x] Attribution note: sidebar bottom + dashboard footer crediting the open-source TradingAgents framework (link to github.com/TauricResearch/TradingAgents) — verified rendering
- [x] Invite code required at sign-up (existing logins unaffected); valid codes only
- [x] Designate gprithvi@gmail.com as primary admin with full access
- [x] BYOK: each user stores their own LLM API key in settings and must have one to run research
- [x] Strict isolation: keys and research runs scoped to own user_id; primary account's keys never shared or readable
- [x] Per-report token metrics (input, output, total) and dollar cost shown in report header and recent research list
- [x] Phase 2 company/ticker finder shared by dashboard and analysis wizard
- [x] Three-step /analysis/new wizard: date, presets, agents, role models, cost preview
- [x] /analysis/$id execution graph, realtime activity, cancellation, timer and usage
- [x] Settings demo simulation toggle and isolated mock execution fallback
- [x] Report-first detail viewer with analyst sections, synthesis, catalysts/risks, snapshot, compact metadata and exports
- [x] Searchable/filterable reports archive with card/table views and direct report links
- [x] Automatically open report on execution completion; recent research links directly to report
- [x] Provider/model choices with BYOK status; Quick Scan, Standard Due Diligence, Deep Value & Risk bundles
- [x] Quick/Standard/Deep/Exhaustive depth and 30-day/90-day/1-year lookback stored and shown on execution/report
- [x] Admin-only built-in Lovable AI execution, per-agent/run/report calculated credit accounting and cumulative analytics
- [x] Dedicated Lovable Credits Used badges across report metadata/audit, archive and recent research
- [x] Settings AI & Credentials: OpenAI API key link/subscription note and explicit provider-key validation
- [x] Verify AES-GCM key storage, owner-only RLS, HTTPS/WSS and sanitized errors/events for all execution paths

- [x] Validate real BYOK NVIDIA credentials — all three account-owned slots returned test replies; live fundamental and technical analysts completed.
- [ ] Verify production HTTPS/WSS delivery — blocked: app has not been published; preview uses HTTPS and secure cloud connections.

- [x] Validate real FMP basic access — supplied owner key accepted; statement/history coverage remains provider-plan dependent, with free SEC/Yahoo fallback.
- [x] Side-by-side ticker comparison (valuation, Piotroski, macro sensitivity, agent consensus)
- [x] Watchlist with anomaly triggers (sentiment shift, valuation divergence, earnings)
- [x] Branded PDF and Markdown report exports
- [x] Store FRED and FMP keys encrypted for gprithvi@gmail.com

- [x] Fix analyst evidence gaps: SEC filings/headlines for news, point-in-time SEC fundamentals, historical daily bars, prior findings for risk/debate
- [x] Remix setup: update API_KEY_ENCRYPTION_SECRET
- [x] Remix setup: clear copied migrations and rescaffold for new database

- [ ] Review all saved reports for accuracy and data collation (after data-source integration)
- [ ] Integrate GDELT, FINRA short interest, Bluesky, World Bank, SEC earnings releases into reports
- [x] Answered: no new agents needed; existing analysts consume new sources
