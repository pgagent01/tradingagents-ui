# Data quality and upstream maintenance

## Current improvements

- Non-positive P/E values are withheld; real negative earnings and margins remain valid evidence.
- Reported SEC gross profit that conflicts with revenue minus cost by more than 1% is withheld, not replaced with a preferred number. This is a rounding safeguard, not an audit opinion.
- Annual durations are bounded to 300–400 days. Quarterly periods remain separate.
- New stock and SEC evidence cache versions prevent fresh research from using the old parsed evidence. Existing reports are immutable and are not rewritten.
- Financial figures are provider-reported, not independently verified. Cross-provider reconciliation, exact filing/accession provenance for each individual fact and filing-body extraction remain follow-up work.

## Free sources to integrate next

| Priority | Source | Useful evidence | Access and limitations |
|---|---|---|---|
| 1 | [SEC filing archives](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Full 10-K/10-Q notes and 8-K exhibits: explain impairments, accounting charges, deal terms and earnings | No key. Identifying User-Agent, cache aggressively and stay below SEC's 10 requests/second ceiling. Use filing publication dates, bounded document extraction and citations. Current integration already uses indexes/XBRL; full text is not yet integrated. |
| 2 | [GDELT](https://gdeltproject.org/data.html) / [DOC search](https://blog.gdeltproject.org/doc-geo-2-0-api-updates-full-year-searching-and-more/) | Broader dated news discovery, languages and event coverage | Free access, no key for DOC queries. Search window is bounded (documented up to a rolling year); check endpoint availability before promising coverage. Article copyright remains with publishers. Titles/coverage are not social sentiment or permission to redistribute article bodies. |
| 3 | [World Bank Indicators](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation) | Country GDP, trade and sector exposure for multinational companies | Public V2 API, no key. Often annual and revised; do not use latest historical values as point-in-time vintage evidence. Review dataset-specific terms. |
| 4 | [OECD SDMX](https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html) | Economic indicators and cross-country comparisons | Free API, published 60 downloads/hour ceiling. Cache by dataset/version; revised history is not automatically suitable for historical research. |
| 5 | [FINRA short interest](https://www.finra.org/finra-data/browse-catalog/equity-short-interest) | Positioning and crowd-risk context | Twice-monthly delayed snapshots, not daily positioning. Download/API access and redistribution terms must be checked; API onboarding may require credentials. Daily short-sale volume is not short interest. |
| Existing | [FRED/ALFRED](https://fred.stlouisfed.org/docs/api/fred/realtime_period.html) | Vintage-aware macro evidence | Free account key required, already integrated. Use real-time periods, source licenses and observation dates. |

These are researched candidates, not newly connected feeds. Do not invent credentials or silently substitute revised/current data for historical evidence. Each integration should preserve owner-scoped caches, dated citations, coverage/availability notes, bounded fetches and historical safeguards.

## TradingAgents is a reference, not an installed dependency

## Social evidence candidates

- [Bluesky public API](https://docs.bsky.app/docs/api/app-bsky-feed-search-posts): practical public-post pilot; bounded ticker matching, sample sizes, timestamps, source links and deletion/retention policies are required. Search is not a complete historical investor archive.
- [Reddit API access guidance](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki): genuine discussions, but OAuth, approval and commercial-use terms must be confirmed. Do not assume unrestricted free access.
- [Stocktwits](https://api.stocktwits.com/developers): strong finance focus; new API registrations were closed at the November 7 review. Partner access and redistribution rights are unconfirmed.
- [Mastodon search](https://docs.joinmastodon.org/methods/search/): instance-dependent coverage, authentication and limits; not a global representative sample.
- GDELT remains news discovery, not social posts. No new social feed was integrated in this task.

## Storage, caching and freshness

- Owner-scoped records contain run configuration/status, analyst outputs and usage, events with sanitized diagnostics, immutable reports with specialist/model/market/evidence snapshots, settings, encrypted provider credentials and watchlists. Roles and invite codes are separate protected access records. No plaintext keys are returned to the browser.
- External evidence caches are stored in `research_data_cache`, keyed by owner/provider and relevant credential version. Stock snapshots have a 60-second durable/hot cache; SEC company facts have a six-hour server cache. Other evidence sources have their own expiry rules. Provider outages may display a explicitly labeled prior snapshot.
- Refreshing Stock Info retrieves through these caches; it is not an unconditional cache bypass. Quarterly and annual periods stay separate. A fetch timestamp is not the financial period end or filing publication date.
- Saved reports are intentionally unchanged. Current Stock Info → Quarterly and [SEC filings](https://www.sec.gov/search-filings) show newer available periods. FMP coverage depends on the owner's plan; Alpha Vantage overview ratios are separate TTM evidence, not newer filing statements. SEC 8-K earnings exhibits and company investor-relations releases can precede the next 10-Q/10-K, but their full bodies are not yet integrated.

## Next quality and usability priorities

1. Validate every duration-based SEC quarter against start/end dates; distinguish standalone quarters from year-to-date facts and derive quarters only from compatible filings. Preserve exact accession/tag/units for each fact.
2. Add deterministic checks of model claims against stored evidence: the AVGO report incorrectly said SMA200 was unavailable even though the warm-up calculation stored it, and incorrectly described the FY2025 financial period as more than a year old. No saved report was rewritten.
3. Bound specialist handoff summaries and separate provider reasoning tokens from visible output where available. The AVGO run took about 7.5 minutes and recorded 153,022 tokens; configured USD is an estimate, not a verified invoice.
4. Full filing/exhibit retrieval, segment guidance and reconciliation before valuation; auditable forecast assumptions rather than invented targets.
5. Source-level freshness and missing-evidence panel, report-to-report changes, watchlist update alerts and an evidence-linked claim review.
6. Dashboard activity filters, saved research queues and report coverage alerts. Current recent/frequent lists count completed non-demo runs within the latest 500 records, not a whole-account aggregate.

## Upstream relationship

This app independently implements its research flow in TypeScript. The public [TradingAgents](https://github.com/TauricResearch/TradingAgents) core is Python; pulling it into this checkout would not upgrade the app and could destroy custom work. Keep Apache-2.0 attribution and any copied-material notices; review third-party licenses when porting code or prompts.

The monitoring baseline in `upstream/tradingagents.json` was verified against GitHub's API on 2026-11-07: `9fa1196fffbcfd9de5146d2dd2869df84ab99838` (commit dated 2026-11-04). It is a starting comparison point, not proof that upstream changes were ported.

### Safe update process

1. Connect this app to its own **new** private GitHub repository through Lovable Project settings → Git. Lovable Git sync cannot connect an existing upstream repository.
2. Enable GitHub Actions and Issues in that repository. The included weekly/manual workflow opens an issue when the upstream branch differs from the baseline; it never imports or deploys code. Actions billing/permissions depend on repository settings. The monitor has not been executed in a connected repository here.
3. Review the linked diff for agent prompts, data adapters, security fixes, license/dependency changes and execution changes. Selectively reimplement relevant changes in this app, preferably in a reviewed branch/PR.
4. Run the automated suite, then authenticated live research→saved-report, provider-failure, cancellation, historical-cutoff and two-account isolation checks before merging.
5. Apply any necessary database migrations explicitly; Git sync does not apply them. Merge only approved app changes to the synced branch. Publish separately when ready.
6. Advance the baseline only after recording the review outcome. Never blindly merge Python upstream into the app or configure force-push/overwrite updates.

Lovable's two-way Git sync tracks **your app repository**, not the separate TradingAgents repository. Monitoring plus reviewed ports is the appropriate update strategy for this adaptation.