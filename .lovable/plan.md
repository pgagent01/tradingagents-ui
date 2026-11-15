# Plan: Strengthen weak areas and add Wall Street analyst targets and ratings

## Goal
Show analyst price targets and ratings from several sources, with links to where each came from, next to our own calculated target. Pass them, sources included, to the AI analysts that need them. Also fix the weak areas the latest reviews found.

## 1. Analyst targets and ratings from several sources
- **Main source: Yahoo (free, already used).** The average, middle, high and low target, the number of analysts, the overall rating, and the Strong Buy to Strong Sell counts for recent months.
- **Backup and cross-check: FMP (uses your own FMP key).** The average target plus individual firms' recent targets: firm, analyst, rating, old and new target, and date.
- **Finnhub (optional, your own key, off by default):** monthly rating counts, used only to cross-check.
- Every value keeps its source, link, the time we fetched it, and the date the analyst published it.
- When sources disagree by more than 10%, both values are shown and flagged; they are never averaged together.
- Targets older than 12 months are dropped. If a firm has several targets, only its newest counts.
- Results are saved per account and reused for 12 hours, so the stock page and the report don't fetch them twice.
- Reports run for a past date only use targets published on or before that date. Yahoo's current average can't be checked against a past date, so those reports leave it out.

## 2. Which analysts receive this data
| Analyst | What it receives |
| --- | --- |
| Fundamentals | Average and range of targets, plus how far they are from our calculated value |
| News | Recent rating and target changes by firm (upgrades, downgrades, target cuts) |
| Sentiment | How ratings have changed over time and how the Buy/Hold/Sell counts have shifted |
| Bull / bear debate | The highest and lowest targets, with the firm and the reason |
| Risk | How spread out the targets are, plus recent downgrades |
| Final decision | All of the above, plus our own value, side by side |
- **New instructions for the AI:** treat these as outside opinion, not proof. Cite the firm and the date. Explain any large gap between our target and the average. Never copy the average as our target.
- **Check after the AI answers:** if our target matches the analyst average almost exactly (within 0.5%) without its own calculation behind it, the target is held back.

## 3. Report and stock page display
- A new **"Wall Street view"** panel on the stock page and in the report shows:
  - the average target and its range
  - the rating breakdown
  - a table of each firm's recent target with links
  - a chart with our target, the analyst range and the current price
- The panel can be collapsed and prints in full. It is added to the Markdown export, the sources-to-analysts map and the Data Flow page.

## 4. Fixing weak areas
1. **Growth too cautious:** the growth limit follows recent results (by default, blending the 3-year growth rate with the last 12 months' growth). The 15% limit becomes an editable setting, and the report says which was used.
2. **Spending on equipment and data centres:** split it into upkeep and growth spending, so heavy investment doesn't sink the estimated value of the business. Show a version both with and without the growth spending.
3. **Gap check:** when our target is more than 40% from the analyst average, the report shows a clear note saying which assumptions cause the gap.
4. **Figures in the written text:** each number in the text must match a source figure. Unmatched numbers are shown in the data-quality checks, with a goal of under 5% unmatched.
5. **Comparison companies:** if the strict same-industry rule finds fewer than three companies, widen to related industries and label it as wider. AI suggestions are used only with clear labels.
6. **Excerpts overstated:** the AI must say "according to [source]" and must not call single-source claims confirmed.

## 5. Testing
- Automated checks for:
  - picking the main source and switching to the backup
  - flagging source disagreements
  - keeping each firm's newest target only
  - dates in reports run for past dates
  - holding back copied targets
  - the growth limit and how growth spending is split
  - account isolation
- Live checks on Alphabet, JP Morgan, Pfizer and Rolls-Royce, all in the same run with the same AI models. Each is compared with its earlier report on: target gap, unmatched figures, citations and cost.
- Scorecards track the outcome at 30, 90 and 180 days.

## Technical notes
- A new shared module for analyst views. Yahoo uses the financialData and recommendationTrend data sets through the existing stats cache. FMP's price-target and upgrade/downgrade data uses the owner's encrypted key. Each value records which source and key version it came from.
- The saved report keeps a fixed copy of the Wall Street view. The data-quality and source-to-analyst lists get new rows.
- Valuation preferences gain a growth setting with options: fixed limit, follow recent results, or a blend. The default is the blend.
