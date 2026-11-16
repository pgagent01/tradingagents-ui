# Plan: Fix the weak areas from the latest Alphabet report

## Goal
Make calculated price targets realistic for heavy-investment companies, explain profit gaps from filings, restore debate depth, and prove improvement across several stocks.

## 1. Split capital spending into upkeep vs growth
- Estimate upkeep spending as depreciation (from the latest filings), and treat the rest as growth spending.
- Valuation uses "owner cash flow" = operating cash flow minus upkeep spending, with the growth spending tied to the forecast growth rate (spending must earn a return; no free growth).
- Show both views side by side: "Reported free cash flow" and "Before growth spending", with the chosen method labeled.
- Guardrail: if growth spending is unusually large versus history, keep a cautious scenario that counts all of it as a cost.
- Applies to every stock automatically; falls back to the current method when depreciation is missing.

## 2. Explain profit gaps (net profit vs operating profit)
- Collect non-operating items from SEC filings: investment gains/losses, interest income/expense, other income, tax effects.
- Build a bridge: operating profit -> other items -> net profit, with each figure sourced and dated.
- Valuation uses operating-based figures so one-off investment gains don't inflate or confuse results.
- Pass the bridge to the Fundamentals, Risk and final decision steps; unexplained remainders are labeled, never guessed.

## 3. Discount rate sanity
- Show which interest rate and risk premium were used, with dates and sources.
- Add a check that flags discount rates outside a normal range for the company's size and risk.
- Keep the user's saved assumptions as the authority; no silent overrides.

## 4. Restore debate depth
- Require each side to address the top 3 points from the other, the Wall Street gap, and the valuation bridge.
- Add a minimum-coverage check (required topics present) rather than a length target, so cost doesn't balloon.

## 5. Wall Street gap review
- When the calculated target is far from analyst average (over 40%), the report lists which assumptions explain the gap (growth, margins, spending, discount rate) using the sensitivity table.
- Analyst targets stay outside opinion, never valuation inputs.

## 6. Prove it: fixed comparison set
- Re-run a fixed set (Alphabet, Dell, Pfizer, JPMorgan) with the same models and settings (paid runs, run only with approval).
- Compare against prior reports: target vs analyst range, citation counts, unsupported figures, debate coverage, cost.
- Summarize better/worse per stock.

## Technical details
- New pure module for upkeep/growth split and profit bridge in the valuation layer, sourced from filing-aligned SEC facts (same period/currency/unit rules).
- Extend the shared evidence contract with `profitBridge` and `capexSplit`; route to fundamentals, risk, debate and synthesis.
- Store both in report snapshots and Markdown export; show in Financial and Valuation panels with collapsible sources.
- Unit tests per rule: upkeep = depreciation, fallback when missing, bridge sums to net income or labels remainder, discount-rate range flag, gap-explanation trigger at 40%.

## Order
1 -> 2 -> 3 -> 5 -> 4 -> 6
