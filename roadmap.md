# Roadmap

- [x] Attribution note: sidebar bottom + dashboard footer crediting the open-source TradingAgents framework (link to github.com/TauricResearch/TradingAgents) — verified rendering
- [ ] Invite code required at sign-up (existing logins unaffected); valid codes only — DB rules applied, signup form next
- [ ] Designate gprithvi@gmail.com as primary admin with full access — roles table applied, admin role row + admin UI next
- [ ] BYOK: each user stores their own LLM API key in settings and must have one to run research
- [ ] Strict isolation: keys and research runs scoped to own user_id; primary account's keys never shared or readable
- [ ] Per-report token metrics (input, output, total) and dollar cost shown in report header and recent research list
- [ ] Phase 2 company/ticker finder shared by dashboard and analysis wizard
- [ ] Three-step /analysis/new wizard: date, presets, agents, role models, cost preview
- [ ] /analysis/$id execution graph, realtime activity, cancellation, timer and usage
- [ ] Settings demo simulation toggle and isolated mock execution fallback
- [ ] Report-first detail viewer with analyst sections, synthesis, catalysts/risks, snapshot, compact metadata and exports
- [ ] Searchable/filterable reports archive with card/table views and direct report links
- [ ] Automatically open report on execution completion; recent research links directly to report
- [ ] Provider/model choices with BYOK status; Quick Scan, Standard Due Diligence, Deep Value & Risk bundles
- [ ] Quick/Standard/Deep/Exhaustive depth and 30-day/90-day/1-year lookback stored and shown on execution/report
