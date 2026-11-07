# Plan: Integrate new free data sources into research reports

## Goal
Give each analyst real, dated, linked evidence from free sources, show that evidence in the report and exports, and never invent data when a source is down or has no data.

## Sources and who uses them

| Source | Evidence | Analysts | Key |
|---|---|---|---|
| SEC 8-K filings + earnings exhibits | Recent company announcements, earnings releases | Fundamentals, News, Risk, Synthesis | None |
| GDELT | Global news articles and tone over time | News, Sentiment, Risk | None |
| Bluesky public search | Real social posts mentioning the ticker or company | Social/Sentiment | Optional free account (app password) |
| FINRA short interest | Short interest and days-to-cover | Risk, Technical | None |
| World Bank / OECD | GDP, inflation and leading indicators for the company's main markets | Macro, Synthesis | None |

## Phases (one source per phase, each shipped and tested on its own)
1. **SEC 8-K**: list recent 8-Ks from the existing SEC submissions feed and pull earnings-release text (exhibit 99.1), shortened, each item dated and linked.
2. **GDELT**: article list plus a tone timeline for the company name and ticker, with duplicates removed.
3. **FINRA short interest**: latest twice-monthly figures plus their trend.
4. **Bluesky**: post search with counts, a sample of posts and a simple tone summary. The report's "no social feed" label is replaced only when real posts were retrieved.
5. **World Bank / OECD**: a small, fixed set of indicators, stored with their release dates.
6. **Report and UI**: a per-source evidence card in the report, a "Sources used / unavailable" panel, the same sources in the Markdown and PDF exports, and settings for each source.

## Rules every source follows
- Retrieved on the server for signed-in users only, with time limits and retries limited so one slow source can't stall a run.
- Cached per account and versioned; nothing private is shared between accounts.
- Every item keeps its source link, publish or effective date and retrieval time.
- Past-date analyses drop anything published after the chosen date (no look-ahead).
- Missing or failed sources are recorded as "unavailable: reason" and never block a run.
- Saved reports keep the evidence that was used at the time and are never changed afterwards.
- The claim check is extended: it flags a report that says "no news/social data" when such evidence was supplied.

## Verification
- Unit tests for each source's parser, date cut-off, unavailable handling and analyst routing.
- One fresh live LITE run after phase 6 (uses NVIDIA credits; only with your go-ahead). That run also creates the first same-stock pair for the comparison check.

## Technical details
- New server modules `src/lib/sources/{sec-8k,gdelt,finra,bluesky,worldbank}.server.ts` with browser-safe parsers in `src/lib/sources/*.ts`.
- Cache via existing `research_data_cache` (owner + source + version keys); the Bluesky credential uses the existing encrypted credential storage as a data provider, separate from AI providers.
- Evidence is added to the existing external-evidence bundle in `research-evidence.server.ts` and routed per analyst in `execution.server.ts`; stored under `sections.external_evidence`.
- Rendering in `report-evidence.tsx`, exports in `report-content.ts`; docs and AGENTS.md rule updated.
