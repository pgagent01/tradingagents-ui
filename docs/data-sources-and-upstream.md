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