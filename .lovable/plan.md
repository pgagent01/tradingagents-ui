# Plan: Integrate open-source ideas to raise report quality

Goal: close the weak areas from the four-stock comparison (targets far below Wall Street, 7-10 untraceable figures per report, no bank/pharma calculated targets) by adopting proven approaches from edgartools, FinanceToolkit, Damodaran data, FinRobot and VYNN. No Python is run; approaches are ported into the existing TypeScript modules.

## 1. Industry-norm margin and growth forecasts (Damodaran)
- Import Damodaran's free yearly industry tables (operating margin, ROIC, sales-to-capital, beta, growth) as a dated, versioned snapshot stored in the app.
- Map each company to an industry via its SEC SIC code (fallback: Yahoo sector).
- Forecast margins and reinvestment to fade from the company's current level toward the industry norm over years 1-10 instead of staying flat.
- Flag assumptions that sit outside the industry range; show the norm beside each assumption in the valuation panel.
- Historical reports use only the snapshot year available at their analysis date.

## 2. Bank and insurer valuation (FinanceToolkit formulas)
- Add an excess-return model: value = book equity + PV of (ROE - cost of equity) x book equity, with P/TBV cross-check.
- Source net interest margin, CET1-style capital, tangible book and ROE from SEC filings; mark missing values unavailable.
- JPMorgan-style reports get a calculated range and target, or a stated reason if inputs are missing.

## 3. Pharma / mature-company coverage
- For Pfizer-type firms, run the full DCF with industry-norm fades plus a peer-multiple cross-check, so a target is produced when inputs are sufficient.
- Keep the existing "no target, explained" path for pre-revenue biotech.

## 4. Traceable figures (edgartools approach)
- Label every SEC figure with concept, period, form, accession and filed date (standardised statement labels).
- Code computes all numbers (VYNN rule); the AI may only quote figures from a supplied, ID-tagged figure list.
- Strengthen the figure audit to match numbers to figure IDs, report the untraceable count, and flag them in the report. Target: under 3 per report.

## 5. Report review step (FinRobot approach)
- Add a final checking pass (code, not a new paid agent) that verifies: rating matches conviction rules, target matches calculated range, each cited firm/date exists in evidence, and required sections are present.
- Failures are listed in the report's quality section; severe failures withhold the target.

## 6. Verification
- Unit tests for industry fades, bank excess-return math, figure-ID matching and review checks, with concrete values.
- Re-run the fixed four-stock set (GOOGL, DELL, PFE, JPM) after approval for paid runs, and compare targets, Wall Street gap, untraceable figures and citations against the 16 Nov results.

## Technical details
- New modules: `src/lib/valuation/industry-norms.ts` (pure, dated snapshot), `src/lib/valuation/bank.ts`, `src/lib/report-review.ts`.
- Extend `scenarios.ts` fades, `research-evidence.ts` figure IDs, the figure audit, valuation panels and Markdown export.
- Bump fundamentals cache version; keep owner-scoped caching and historical-date cutoffs.

## Order
1 -> 4 -> 2 -> 3 -> 5 -> 6 (biggest target-quality gain first, then traceability).
