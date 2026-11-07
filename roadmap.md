# Roadmap

- [ ] Configure the remixed account's three encrypted NVIDIA slots and FRED, FMP, Alpha Vantage credentials; verify saved status and live connection tests.
- [ ] Audit imported analyst evidence routing, fix remaining delivery gaps with regressions, and verify a fresh multi-agent report through the saved viewer.

- [x] Fix current-date technical research evidence: daily year retrieval, selected-lookback OHLCV, moving averages/RSI/MACD/Bollinger/ATR, dated source/cache metadata and persisted evidence. Missing-history regression reproduced then passed; 144 tests/build OK. Fresh NVIDIA LITE report completed with 63 daily bars and verified saved indicators. Existing runs untouched; historical-date stock retrieval remains unavailable by design.

- [x] Add missing-key warnings throughout analysis setup, provider acquisition/update guidance and retry controls in Settings. Confirmed requesting account has FRED/FMP/NVIDIA saved; authenticated warning→Settings flow verified at desktop/mobile sizes without runtime errors.
- [x] Assess free fundamentals and add owner-encrypted Alpha Vantage key controls, validation, quote/daily-history fallback and separately labeled TTM enrichment through stock/research snapshots. Owner/version-scoped overview caching and quota/error safeguards tested; 137 tests passed, build OK, authenticated LITE stock page verified.
- [ ] Validate Alpha Vantage with a real account key and a live enriched research report — blocked: no Alpha Vantage credential supplied; mocked integration and authenticated Settings controls verified.

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

- [ ] Validate real BYOK provider credentials — blocked: no user-supplied working provider key was available for a real key test. Model-list validation is implemented.
- [ ] Verify production HTTPS/WSS delivery — blocked: app has not been published; preview uses HTTPS and secure cloud connections.

- [ ] Validate real FMP endpoint entitlements — blocked: no working FMP key supplied; encrypted storage, masking, validation and Yahoo→FMP fallback covered by tests.
- [x] Side-by-side ticker comparison (valuation, Piotroski, macro sensitivity, agent consensus)
- [x] Watchlist with anomaly triggers (sentiment shift, valuation divergence, earnings)
- [x] Branded PDF and Markdown report exports
- [x] Store FRED and FMP keys encrypted for gprithvi@gmail.com

- [x] Fix analyst evidence gaps: SEC filings/headlines for news, point-in-time SEC fundamentals, historical daily bars, prior findings for risk/debate
- [x] Remix setup: update API_KEY_ENCRYPTION_SECRET
- [x] Remix setup: clear copied migrations and rescaffold for new database
