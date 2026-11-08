# Valuation modules

- Keep valuation math pure and browser-safe here; fetching lives in server helpers. Trailing figures use same-filing comparatives only, and provider differences are flagged rather than silently resolved.
- Cache bounded peer evidence by owner and credential version; exclude current peers from historical runs and keep relative multiples distinct from intrinsic forecasts to prevent unsupported targets.
- Persist labeled scenario assumptions, dated rate sources and filing-aligned equity-conversion inputs with each calculated forecast; never substitute historical OCF-minus-capex for enterprise FCFF.
- Free peer discovery verifies bounded Yahoo suggestions against exact SEC SIC, never blends SIC and text-industry cohorts, and exposes only aligned SEC-denominator ratios; broad classifications do not prove business-model similarity.
- Optional model peer suggestions come from the existing report-selected fundamentals call, are verified before subsequent analyst handoffs, and reuse saved output on resume; never introduce a separate billed discovery call or infer financial figures.
