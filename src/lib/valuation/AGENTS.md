# Valuation modules

- Keep valuation math pure and browser-safe here; fetching lives in server helpers. Trailing figures use same-filing comparatives only, and provider differences are flagged rather than silently resolved.
- Cache bounded peer evidence by owner and credential version; exclude current peers from historical runs and keep relative multiples distinct from intrinsic forecasts to prevent unsupported targets.
- Persist labeled scenario assumptions, dated rate sources and filing-aligned equity-conversion inputs with each calculated forecast; never substitute historical OCF-minus-capex for enterprise FCFF.
