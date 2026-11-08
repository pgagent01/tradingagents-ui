# Data and report quality improvement plan

Goal: make every report rest on more complete, internally consistent and traceable figures, and make the written analysis provably match those figures. No new user-facing features beyond quality labels.

## 1. Reliable dated headlines (news and sentiment)
- Add Yahoo ticker RSS and Google News ticker RSS as headline sources alongside GDELT and SEC filing titles.
- Deduplicate by normalized title and URL, keep publication date and source, drop items after the analysis date for historical runs.
- GDELT becomes optional enrichment; its failure no longer leaves news/sentiment empty.
- Report shows headline count per source and "no headlines found" explicitly.

## 2. Wider financial coverage (pharma, banks, foreign filers)
- Fallback concept lists for operating income (e.g. pre-tax income plus interest expense where tagged), revenue variants, and bank lines (net interest income, provision for credit losses, deposits).
- Read `ifrs-full` facts for foreign SEC filers (ASML, TSM, AZN style): revenue, profit, operating profit, cash flow, capex, equity, shares.
- Every fallback is labeled with the exact concept used; nothing is mixed across taxonomies within one period.
- Rolls-Royce style non-SEC listings: show company name correctly and state "no filed statements available".

## 3. Internal consistency checks on filed figures
- Balance check: assets vs liabilities plus equity within 0.5%.
- Cash flow check: operating cash flow minus capex vs computed free cash flow.
- Period checks: quarter sums vs annual, TTM components from the same fiscal calendar.
- Restatement flag when an amended filing changes a previously used value.
- Failures appear in a "Data checks" block and are passed to the analysts as warnings; valuation is withheld when core checks fail.

## 4. Numbers in the prose must match the evidence
- Scan report text for dollar amounts, percentages and multiples; match each to the evidence bundle within rounding tolerance.
- Unmatched figures are flagged in the report's quality review (not silently removed).
- Prompts ask analysts to cite the source label (SEC period, Yahoo TTM, FRED date) for key figures.
- Synthesis cannot state a price target that differs from the calculated range without an explicit reason (extends existing check).

## 5. Comparable-company hygiene
- Withhold cross-currency or minor-unit (GBp) multiples unless converted with a dated exchange rate.
- Flag peer metrics more than 3x the cohort median as outliers, excluded from medians.
- Show per-row data date so stale peers are visible.

## 6. Freshness and provenance labels
- Every evidence block shows retrieval time and the underlying period/date.
- Report header shows the oldest core input date and warns when the latest filing is over 120 days old.

## Order
1, 2, 3 first (inputs), then 4 (output checking), then 5 and 6.

## Verification
- Unit tests per rule (concept fallbacks, IFRS mapping, identity tolerances, number matcher, currency withholding).
- Live reports on PFE, JPM, TSM, RR.L and GOOGL; confirm coverage gaps close, checks appear, and existing saved reports remain unchanged.

## Technical details
- Sources: new `src/lib/sources/headlines.server.ts` (RSS, owner cache, bounded fetch); extend `research-evidence.ts` concept maps and taxonomy selection; new pure `src/lib/data-checks.ts`; number matcher in `report-quality.ts`; currency guard in `peer-snapshot.server.ts`.
- Bump affected cache keys; saved report snapshots stay immutable.
