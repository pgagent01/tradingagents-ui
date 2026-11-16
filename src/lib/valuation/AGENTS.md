# Valuation modules

- Reuse owner-scoped durable Yahoo statistics across stock views, comparable snapshots and valuation rates; provider TTM ratios remain distinct from annual/quarterly filing ratios and never replace historical report evidence.

- Keep valuation math pure and browser-safe here; fetching lives in server helpers. Trailing figures use same-filing comparatives only, and provider differences are flagged rather than silently resolved.
- Cache bounded peer evidence by owner and credential version; exclude current peers from historical runs and keep relative multiples distinct from intrinsic forecasts to prevent unsupported targets.
- Persist labeled scenario assumptions, dated rate sources and filing-aligned equity-conversion inputs with each calculated forecast; never substitute historical OCF-minus-capex for enterprise FCFF.
- Free peer discovery verifies bounded Yahoo suggestions against exact SEC SIC, never blends SIC and text-industry cohorts, and exposes only aligned SEC-denominator ratios; broad classifications do not prove business-model similarity.
- Optional model peer suggestions come from the existing report-selected fundamentals call, are verified before subsequent analyst handoffs, and reuse saved output on resume; never introduce a separate billed discovery call or infer financial figures.
- Owner forecast estimates and peer selections are snapshotted into new current-date runs; resume never reads mutable preferences, custom peers remain independently verified and cash-flow ratios are all-or-none.
- Withhold calculated 12-month targets when base intrinsic value falls outside 0.25x–4x market price, and Blume-adjust measured betas; default assumptions cannot capture one-off charges.
- The report's comparable-companies snapshot is descriptive only: it reuses the fundamentals model's saved suggestions (no new AI call), skips the SIC gate, and never feeds valuation math.
- Comparable snapshot extras (ROIC, net debt/EBITDA, payouts, beta) use the latest fiscal-year same-filing facts; its labeled debt fallback is snapshot-only so valuation keeps strict debt rules.
- Current descriptive standard metrics prefer compatible Yahoo-reported trailing values, retain per-metric source labels, and calculate only missing equivalents; annual growth and one-year daily beta stay separate from provider quarterly growth and five-year beta. Minor-unit currencies withhold price-based provider ratios. Valuation prefers provider five-year beta (Blume-adjusted) before fetching fallback benchmark history.
- Cover-page share fallback requires one unambiguous positive same-filing count/date; deduplicate identical facts and withhold differing dimensionless values rather than inventing class totals. Complete debt components recognize explicit zero commercial paper without assuming absent borrowings are zero.
- Hot-cache reuse never extends provider quote freshness; bound descriptive snapshot retrieval to two rows at a time to stay within six outbound connections.
- Capex split (upkeep ≈ D&A) and the operating→net profit bridge inform analysts and the bear case but never raise base value; unexplained remainders stay labeled.
- Industry norms come from a dated, versioned Damodaran snapshot mapped by SEC SIC plurality; they set margin fade targets and flags only, are withheld for analysis dates before the snapshot, and never replace reported figures.
- Banks/insurers use the pure excess-return model with ROE blended toward the dated industry norm; a deterministic report review (no AI call) withholds model targets unsupported by the calculated range.
