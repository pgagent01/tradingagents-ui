# Data and report quality improvement plan

Goal: make every report rest on more complete, internally consistent and traceable figures, and make the written analysis provably match those figures. No new user-facing features beyond quality labels.

## 0. Measure first (new)
- Build a fixed test set of about 15 tickers (tech, pharma, bank, insurer, REIT, loss-maker, foreign SEC filer, non-SEC listing).
- Record today's coverage: which core figures are missing, headline counts, valuation status, flagged claims.
- Re-run the same set after each step so improvements are measured, not assumed.

## 1. Reliable dated headlines (news and sentiment)
- Add Yahoo ticker RSS and Google News ticker RSS alongside GDELT and SEC filing titles.
- Deduplicate by normalized title and URL; keep publication date and source.
- Relevance filter: keep items that mention the company name or ticker, so generic market stories don't pass as company news.
- Historical runs: RSS only covers recent days, so older dates rely on SEC filings and GDELT and say so; never use items dated after the analysis date.
- Report shows headline count per source, and "no headlines found" explicitly.

## 2. Wider financial coverage (pharma, banks, foreign filers)
- Revenue variants and bank lines (net interest income, provision for credit losses, deposits) added per company type.
- Operating income is never synthesized from other lines. When it isn't reported, show a clearly named substitute (e.g. "pre-tax income") and don't feed it into margin or DCF math as operating income.
- Read `ifrs-full` facts for foreign SEC filers: revenue, profit, operating profit, cash flow, capex, equity, shares, in the reported currency.
- Never mix taxonomies or currencies within one period.
- Non-SEC listings (e.g. Rolls-Royce): show the company name correctly and state "no filed statements available".

## 3. Internal consistency checks on filed figures
- Balance check: assets vs liabilities plus equity (including minority interest) within 0.5%; skipped and labeled "not checkable" when a component isn't tagged.
- Cash flow check: free cash flow recomputed from the same filing's operating cash flow and capex.
- Period checks: four quarters vs annual, TTM components on the same fiscal calendar.
- Restatement flag when an amended filing changes a value already used.
- Severity levels: warnings are shown and passed to analysts; only failures in figures the valuation actually uses withhold the valuation.

## 4. Numbers in the prose must match the evidence
- Scan report text for dollar amounts, percentages and multiples; normalize units (B/M, %, x) and match to the evidence bundle within rounding tolerance.
- Allow simple derived values (growth rates, differences) computed from evidence; flag the rest as "unverified figure" rather than removing them.
- Track the flag rate per report so false alarms can be tuned on the test set.
- Prompts ask analysts to cite the source label (SEC period, Yahoo TTM, FRED date) for key figures.
- A price target outside the calculated range needs an explicit reason (extends the existing check).

## 5. Comparable-company hygiene
- Withhold cross-currency or minor-unit (GBp) multiples unless converted with a dated exchange rate.
- Flag peer metrics far from the cohort (outside 3x the interquartile range) and exclude them from medians, keeping them visible.
- Show each row's data date so stale peers are visible.

## 6. Freshness and provenance labels
- Every evidence block shows retrieval time and the underlying period/date.
- Report header shows the oldest core input and warns when the latest filing is over 120 days old.

## Order
0, then 2 and 3 (inputs), 1, then 4 (output checking), then 5 and 6.

## Success criteria
- Core figures present for pharma, banks and foreign SEC filers in the test set.
- Every current-date report has at least 5 relevant dated headlines, or states why not.
- Unverified-figure flags shown on every report, with false alarms under 1 in 10 on the test set.
- Saved reports remain unchanged.

## Known weaknesses kept honest
- Free RSS sources can change or block without notice; failures degrade to labeled "unavailable", never silent.
- Prose matching can't prove the reasoning is right, only that figures match evidence.
- Bank and insurer valuation is still not added here; this plan only makes their figures available.

## Technical details
- New `src/lib/sources/headlines.server.ts` (RSS, owner cache, bounded fetch, two-host retry); extend `research-evidence.ts` concept maps and taxonomy selection; new pure `src/lib/data-checks.ts`; number matcher in `report-quality.ts`; currency/outlier guard in `peer-snapshot.server.ts`; test-set script under `src/test/`.
- Bump affected cache keys; saved report snapshots stay immutable. One test per rule.
