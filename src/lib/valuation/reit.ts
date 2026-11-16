import { twelveMonthTarget } from './methods';
/** REIT value from NAREIT-style FFO (net income + depreciation − property-sale gains). AFFO is FFO less an explicit, labelled maintenance-capex haircut; value is a growing perpetuity of AFFO at the cost of equity. */
export function reitValuation(i: { netIncome: number | null; depreciation: number | null; saleGains: number | null; shares: number | null; riskFree: number; beta: number; price: number | null; maintenanceShare?: number; dividendsPerShare?: number }) {
  const fail = (reason: string) => ({ status: 'unavailable' as const, reason, value: null, target: null, ffo: null as number | null, affo: null as number | null, costOfEquity: null as number | null, priceToFfo: null as number | null, notes: [] as string[] });
  if (i.netIncome === null || i.depreciation === null || i.depreciation <= 0 || i.shares === null || i.shares <= 0) return fail('REIT valuation needs same-period trailing net income, depreciation and shares.');
  const ffo = i.netIncome + i.depreciation - (i.saleGains ?? 0);
  if (!(ffo > 0)) return fail('Calculated FFO is not positive.');
  const m = i.maintenanceShare ?? .15; const affo = ffo * (1 - m);
  const ke = i.riskFree + i.beta * .05; const g = Math.min(.03, Math.max(0, i.riskFree - .015));
  if (ke <= g + .01) return fail('Cost of equity too close to growth for a perpetuity.');
  const value = affo / i.shares * (1 + g) / (ke - g);
  const ffoPs = ffo / i.shares;
  return { status: 'estimated' as const, reason: null, value, target: twelveMonthTarget(value, ke, i.dividendsPerShare ?? 0), ffo, affo, costOfEquity: ke, priceToFfo: i.price && i.price > 0 ? i.price / ffoPs : null, notes: [
    `FFO USD ${ffo.toFixed(0)} = trailing net income + depreciation${i.saleGains !== null ? ' − property-sale gains' : ' (no property-sale gain line filed)'}; FFO per share USD ${ffoPs.toFixed(2)}. This is calculated, not company-reported FFO.`,
    `AFFO assumes ${(m * 100).toFixed(0)}% of FFO goes to recurring property upkeep (assumption). Value = AFFO per share × (1 + ${(g * 100).toFixed(1)}%) / (cost of equity ${(ke * 100).toFixed(2)}% − growth). Property NAV is not modelled.`,
  ] };
}
