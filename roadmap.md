# Roadmap

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
- [ ] Validate live FRED observations with a real key — blocked: no FRED credential supplied; encrypted settings and unavailable-data path verified.

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
- [ ] Side-by-side ticker comparison (valuation, Piotroski, macro sensitivity, agent consensus)
- [ ] Watchlist with anomaly triggers (sentiment shift, valuation divergence, earnings)
- [ ] Branded PDF and Markdown report exports
- [ ] Store FRED and FMP keys encrypted for gprithvi@gmail.com
