# Plan: Integrate open-source ideas to raise report quality

Goal: close the weak areas from the four-stock comparison (targets far below Wall Street, 7-10 untraceable figures per report, no bank/pharma calculated targets) by adopting proven approaches from edgartools, FinanceToolkit, Damodaran data, FinRobot and VYNN. No Python is run; approaches are ported into the existing TypeScript modules.

## Principle: works for any stock
Every step is ticker-independent. Method selection is driven by data the app already gets for any company (SIC code / sector, filing type, currency, available figures): general DCF for operating companies, excess-return for banks/insurers, FFO/NAV for REITs, scenario methods for loss-makers, and "no target, explained" when inputs are insufficient. No stock-specific rules or hardcoded tickers. The four stocks (GOOGL, DELL, PFE, JPM) are only a test sample, plus a few unseen tickers (e.g. a REIT, an insurer, a non-US filer) to prove it generalises.

## 1. Industry-norm margin and growth forecasts (Damodaran)
- Import Damodaran's free yearly industry tables (operating margin, ROIC, sales-to-capital, beta, growth) as a dated, versioned snapshot stored in the app.
- Map each company to an industry via its SEC SIC code (fallback: Yahoo sector).
- Forecast margins and reinvestment to fade from the company's current level toward the industry norm over years 1-10 instead of staying flat.
- Flag assumptions that sit outside the industry range; show the norm beside each assumption in the valuation panel.
- Historical reports use only the snapshot year available at their analysis date.

## 2. Bank and insurer valuation (FinanceToolkit formulas)
- Add an excess-return model: value = book equity + PV of (ROE - cost of equity) x book equity, with P/TBV cross-check.
- Source net interest margin, CET1-style capital, tangible book and ROE from SEC filings; mark missing values unavailable.
- Any bank or insurer (detected by SIC code) get a calculated range and target, or a stated reason if inputs are missing.

## 3. Pharma / mature-company coverage
- For any mature operating company, run the full DCF with industry-norm fades plus a peer-multiple cross-check, so a target is produced when inputs are sufficient.
- Keep the existing "no target, explained" path for pre-revenue biotech.

## 4. Traceable figures (edgartools approach)
edgartools (MIT, Python) cannot run inside the app, so its methods are ported, not installed:
- Its standardised statement mapping (many company-specific XBRL tags -> one label like "Revenue") to cut missing or mislabeled figures across companies.
- Its handling of amended filings, duplicate facts and dimensional (segment) facts, so the newest non-segment value is chosen consistently.
- Its 8-K / earnings-release parsing as a reference for the existing filing bridge.
- Optionally, use it offline as a test oracle: compare our extracted figures for the fixed stocks against edgartools output and record the snapshot as regression data.
- Label every SEC figure with concept, period, form, accession and filed date (standardised statement labels).
- Code computes all numbers (VYNN rule); the AI may only quote figures from a supplied, ID-tagged figure list.
- Strengthen the figure audit to match numbers to figure IDs, report the untraceable count, and flag them in the report. Target: under 3 per report.

## 5. Report review step (FinRobot approach)
- Add a final checking pass (code, not a new paid agent) that verifies: rating matches conviction rules, target matches calculated range, each cited firm/date exists in evidence, and required sections are present.
- Failures are listed in the report's quality section; severe failures withhold the target.

## 6. Keeping data current (scheduled refreshes)
A scheduled background job checks sources and refreshes only what changed; each refresh is dated and versioned so old reports keep the data they used.
- **Industry norms (Damodaran):** checked monthly; Damodaran republishes each January (mid-year updates sometimes). A new year becomes a new snapshot; the previous one is kept for historical reports.
- **SEC filings and figure labels:** checked daily against SEC's recent-filings feed for watchlisted and recently researched stocks; a new 10-K/10-Q/8-K marks that company's cached figures stale so the next view or report fetches fresh ones. The tag-to-label mapping is reviewed when tests flag unmapped tags.
- **Analyst targets and ratings:** refreshed daily for watchlisted stocks; otherwise on view, with a cache age shown.
- **Prices:** unchanged (fetched on demand with short caches).
- **Health check:** the job records success/failure per source; the Data Flow page shows last-updated dates and any failed source.
- Runs server-side under the owner's own keys only; free sources (SEC, Damodaran) need no key. No paid AI runs are triggered automatically.

## 7. Verification
- Unit tests for industry fades, bank excess-return math, figure-ID matching and review checks, with concrete values.
- Re-run the four-stock set (GOOGL, DELL, PFE, JPM) plus 2-3 untested tickers from other industries after approval for paid runs, and compare targets, Wall Street gap, untraceable figures and citations against the 16 Nov results.

## Technical details
- New modules: `src/lib/valuation/industry-norms.ts` (pure, dated snapshot), `src/lib/valuation/bank.ts`, `src/lib/report-review.ts`.
- Extend `scenarios.ts` fades, `research-evidence.ts` figure IDs, the figure audit, valuation panels and Markdown export.
- Bump fundamentals cache version; keep owner-scoped caching and historical-date cutoffs.

## Order
1 -> 4 -> 2 -> 3 -> 5 -> 6 (biggest target-quality gain first, then traceability).
