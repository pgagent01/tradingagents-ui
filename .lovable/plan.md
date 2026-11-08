# Price Target and Intrinsic Value Plan

Goal: every report shows a **calculated, reproducible** intrinsic value and 12-month price target range, with its method, inputs and sources. If key inputs are missing, it shows a clear reason instead.

## What the user will see

- A new **Valuation** card in each new report: bear / base / bull value per share, the 12-month target, upside or downside versus the current price, the method used, and key assumptions with linked source dates.
- A **sensitivity grid** (discount rate vs. long-term growth) so readers can see how the value changes.
- On the Stock Info page, a **"Valuation snapshot"** panel using the same calculation.
- In Markdown/PDF exports, the same valuation section.
- When no target is possible: the exact missing input (e.g. "no positive free cash flow history", "share count unreconciled").

## Phases

### 1. Reconciled inputs (foundation)
Build one checked input set per stock from SEC filings first, then Yahoo / FMP / Alpha Vantage as backups: revenue, operating income, free cash flow, cash, debt, diluted shares, trailing-12-month values from filing-matched quarters. Flag a mismatch between sources over a set tolerance instead of picking one silently.

### 2. Method selection by company type
- Profitable operating companies: discounted cash flow, plus a check against peer multiples.
- Banks and insurers: excess-return model, plus price-to-book.
- REITs: funds-from-operations multiple and net asset value.
- Loss-making or early-stage companies: revenue and margin scenarios with wider ranges.
- Cyclical companies: earnings and cash flow normalized over several years.
- Pre-revenue biotech and similar: no target, with an explanation.

Sector and industry come from SEC SIC codes, with the company profile as backup.

### 2b. Comparable companies (comps)
- Peer set: 5–8 companies from the same SEC industry code, then filtered by size (market value roughly 0.25x to 4x). Users can add or remove peers on the Stock Info page, and the peer list is saved with each report.
- Multiples: price/earnings (trailing and forward when available), EV/sales, EV/EBITDA, price/free cash flow and price/book (banks and REITs). Each is calculated from the peer's own filings and dated quote.
- Use the peer median and interquartile range, not the average, so outliers have less effect. Exclude a peer from a multiple when its value is negative or missing.
- Output: an implied value per share from each multiple. Also show a comps table in the report: ticker, market value, each multiple and data date, with links.
- Comps serve as both a cross-check on the cash-flow value and a weighted part of the target. Their weight depends on company type and is shown in the report.
- Historical runs use peer prices and filings as of the analysis date.

### 3. Calculation engine
- Bear / base / bull scenarios: growth, margin, reinvestment and discount rate.
- Discount rate from the FRED 10-year Treasury yield plus a documented equity risk premium and beta. Use defaults only when they are labelled as defaults.
- 12-month target = base value rolled forward one year, less expected dividends, then blended with the peer-multiple check.
- Pure, tested functions. The AI never produces these numbers.

### 4. Feed the analysts and final report
- The fundamentals analyst and final synthesis get the calculated values. They may comment on them or adjust them only with a stated reason.
- The current price-target review stays in place. It also rejects an AI target that falls outside the bear-to-bull range without a reason.
- The calculation and its inputs are saved with each report and never change afterwards.

### 5. Display, exports and comparisons
Add the Valuation card, sensitivity grid, export section and Stock Info panel. Same-stock report comparison shows how the target changed between dates.

### 6. Verification
- Unit tests with fixed inputs for each method: AAPL-style operating company, JPM-style bank, REIT, loss-maker.
- One live report run (uses NVIDIA credits; only with your approval) on Amazon, then compare it with the two existing Amazon reports.

## Rules
- Historical-date runs use only filings and rates available on that date.
- Unavailable inputs stay unavailable. No guessed values.
- Valuation assumptions are labelled as estimates, not advice.

## Technical details
- New `src/lib/valuation/` with pure modules: `inputs.ts` (reconcile), `methods/{dcf,excess-return,ffo,scenario}.ts`, `select-method.ts`, `target.ts`. Add `inputs.server.ts` for fetching through the existing stock service and SEC period helpers. Cache in `research_data_cache`, scoped to the owner and versioned.
- Add a `valuation` evidence field in `data-evidence.ts`, routed to fundamentals, risk, debate and synthesis. Extend `reviewPriceTarget` with a range check, and bump the `quality_review` version.
- Save it in the report sections as a `valuation` section. Render it in `report-evidence.tsx`. Add it to exports in `report-content.ts`.
- Tests go in `src/test/valuation-*.test.ts`. Record the module rule in `src/lib/valuation/AGENTS.md`.
