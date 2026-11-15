# Report quality verification and scoring plan

## Goal
Prove the new data pipeline reaches every analyst, measure report quality with one consistent score, and catch silent data gaps before they reach a report.

## Phase 1 - Fresh verification report and baseline comparison
- Run one fresh Alphabet report using the same models as report f840e55b (paid; run only after approval).
- Confirm the saved report contains the data map, news audit (duplicates, conflicts, possible syndication) and price cross-checks.
- Check each analyst output cites its assigned evidence (fundamentals uses SEC, technical uses dated price history, news uses grouped events).
- Compare against the two earlier Alphabet reports: untraced figure rate (baseline about 11.6%), target consistency with the valuation range, explicit acknowledgement of missing data, cost.
- Record findings in the roadmap; fix any break found.

## Phase 2 - Report quality score
- Pure, tested scoring helper combining: traceable figure share, evidence freshness, source agreement (price/financial cross-checks), unavailable-data count, and data-check failures.
- Each component shown separately with its inputs; no single hidden number. Missing inputs lower confidence rather than being treated as perfect.
- Snapshot the score into each new report on finalization; legacy reports show "not scored".
- Display on the report page and list a trend on the scorecard page.

## Phase 3 - Citation enforcement on the final summary
- Reuse the existing figure audit to flag every number in the synthesis without a matching source.
- Unsupported figures are marked "unverified" in the report and export (not silently deleted), and counted in the quality score.
- Price targets outside the calculated valuation range remain withheld, as today.

## Phase 4 - Run health check
- Collect a per-source status during each run: ok, empty, failed, skipped (disabled or historical).
- Save it with the report and show a warning banner when a primary source failed or returned nothing, naming which analysts were affected.
- No automatic paid retries; the existing Resume flow stays the only re-execution path.

## Phase 5 - Fixed comparison set
- Define a small stock set (e.g. AAPL, JPM, PFE, TSLA, GLW) with fixed models and dates.
- An admin-only page lists the latest quality score per stock and change versus the previous run, so improvements are measured rather than assumed.
- Runs are started manually by the user (each costs credits); no scheduled paid runs.

## Pending outside dependencies (not built)
- Massive: stays in the Settings access check until plan rights for storage, display, export and AI processing are confirmed.
- Tiingo News: blocked by account entitlement.

## Technical details
- New pure modules: src/lib/report-quality-score.ts, src/lib/run-health.ts, with vitest coverage per rule (score bounds, missing inputs, failed-source warnings, unverified-figure marking).
- Quality score and run health stored in report sections JSON at finalization through the existing owner-scoped commit function; no new tables or policies needed.
- Comparison page reads owner-scoped completed reports only; account isolation unchanged.
