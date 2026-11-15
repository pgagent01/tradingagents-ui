# Shared data-quality pipeline and Massive integration

## Outcome
Make every displayed figure and analyst input traceable, compatible and reusable without counting repeated coverage as independent evidence. Strengthen the existing retrieval services rather than replace them with a separate pipeline platform.

## 1. Baseline and acceptance checks
- Measure retained, rejected, duplicate, stale and conflicting evidence across Alphabet, Dell, Tesla, Pfizer, JPMorgan and Rolls-Royce.
- Check company identity, dates, financial periods, units/currencies, source selection and account-isolated cache reuse.
- Keep unavailable coverage explicit; passing automated checks is not proof that every provider fact or model claim is correct.

## 2. Shared evidence contract
- Source-specific adapters feed separate contracts for news, financial facts, prices and company references.
- Preserve security/company identifiers, original URL/provider record ID, publication/effective/filing date, retrieval time, units/currency, annual/quarter/TTM basis, adjustment state, source version and calculation lineage where applicable.
- Represent available, empty, failed, disabled, rejected, conflicting and stale states explicitly. Do not manufacture dates or collapse failures into empty results.
- Record bounded rejection/conflict reasons and counts without credentials, full unlicensed articles or sensitive provider responses.

## 3. Deduplication and conflict handling
- Standardize links without dropping semantic parameters; keep one canonical article and all retrieval services.
- Add conservative syndication detection using publisher attribution, verified original links and sufficiently strong content/title matches. Do not guess resolved URLs or fetch arbitrary redirects.
- Preserve opposing claims, different numbers, dates and distinct events. Group uncertain overlaps rather than delete them.
- Record conflicting dates/excerpts on same-URL records; retain original alternatives and avoid implying independent confirmation from publisher counts.
- Never let articles rejected from the short display list silently disappear from the audit counts.

## 4. Financial and price compatibility
- Match facts by entity/security, concept, period, filing/accession, units and currency before reconciliation or calculation.
- Prefer directly sourced compatible standard values; calculate only missing values and preserve inputs/formulas.
- Keep annual, quarterly and TTM figures separate. Preserve share-class versus company-wide shares; do not silently substitute one for the other.
- Add applicable accounting identities and relative/absolute tolerances; retain valid losses and withhold only affected invalid inputs.
- Keep last trade, previous-day close and adjusted history separate. Never call delayed or previous-day data live; do not certify retrospective adjustments as point-in-time evidence.

## 5. Integration, caching and storage
- Retrieve once per compatible evidence request and distribute role-specific subsets to existing analysts, Stock Info and comparables.
- Use existing owner-scoped durable caches and bounded in-flight deduplication. Keys include credential/provider settings version, normalization version, symbol, period/cutoff and adjustment mode as relevant.
- Authorize and check enable settings before cache lookup; settings-read errors fail closed.
- Preserve original evidence time during stale fallback; immutable reports and completed-agent evidence remain unchanged on refresh/resume.
- Store licensed normalized evidence and bounded audit records only. Explicitly surface cache write failures rather than promise durability that did not occur.

## 6. Massive pilot and activation gate
### Already authorized and verified
- Private Massive connection linked securely; supplied credential remains exclusive to the verified gprithvi@gmail.com account.
- GOOGL ticker overview and previous-day adjusted bar both returned HTTP 200.
- Add account-specific encrypted BYOK support and a Settings access check using authenticated server functions. Other accounts default off and cannot use the supplied connection.

### Before production evidence use
- Confirm the actual subscription's endpoint coverage, quota and permission for caching/retention, account-only display, reports/exports and LLM processing. Successful endpoint access does not prove these rights.
- Verify CIK/security identity, currency, timestamps and share-class distinctions against existing evidence. Ticker overview's historical date parameter is not sufficient proof of filing-publication availability.
- Start with approved reference/identity enrichment and dated price fallback; only add ratios/statements/news when entitled endpoints and compatibility are verified. Do not replace SEC filing financials with unmatched provider values.
- Honor denial, quota and missing coverage without automatic retries or alternate credential bypass. Existing free sources remain usable.
- Until rights are established, the pilot returns access status only: no provider facts are cached, exported or sent to analysts.

## 7. Verification and rollout
- Regression tests for account isolation, personal-key precedence, disabled/settings-failure behavior, URL and syndication overlaps, conflicts, fiscal/currency/share-class mismatches, historical cutoffs and cache invalidation.
- Authenticated Stock Info → comparables → report readback checks demonstrate shared retrieval and consistent provenance once licensed ingestion is enabled.
- Review one explicitly authorized fresh report for evidence routing and grounded claims; no billed LLM retry or new report is implied by approving this plan.
- Report before/after coverage and rejection/conflict counts; retain unresolved source and model limitations.

## Technical approach
Keep the TanStack application, existing authenticated server helpers, research_data_cache and immutable report snapshots. Build browser-safe contracts and pure validation helpers first, then migrate source adapters incrementally. A dedicated workflow service or scheduler is not required for this request-driven workload; reconsider only if scheduled bulk ingestion becomes necessary.

## Out of scope
New agents, Webz.io activation, social scraping, full-article redistribution, automatic paid model retries and certified historical backtesting.