# Roadmap

- [ ] Correct reported wizard navigation and analytics string-state errors; confirm a clean build.

- [ ] Phase 4 analytics: interactive usage/cost history, total runs, model efficiency, and admin aggregate per-user costs without exposing private research or credentials.
- [ ] Phase 4 live execution: built-in AI and BYOK OpenAI, Anthropic, Groq, OpenRouter; live specialist and synthesis output with persisted report usage.
- [ ] Phase 4 settings: active provider selection, provider-key management/testing, and existing primary-admin invite management.

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
