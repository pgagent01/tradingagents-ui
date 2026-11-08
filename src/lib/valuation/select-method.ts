export type ValuationMethod = 'dcf' | 'excess_return' | 'ffo_nav' | 'revenue_scenario' | 'normalized_cycle' | 'unavailable';
export function selectMethod(industry: string | null, revenue: number | null, netIncome: number | null): { method: ValuationMethod; reason: string } {
  if (!industry) return { method: 'unavailable', reason: 'Verified industry classification unavailable.' };
  if (/bank|insurance|depository/i.test(industry)) return { method: 'excess_return', reason: 'Financial issuer: equity-based valuation rather than enterprise DCF.' };
  if (/reit|real estate investment trust/i.test(industry)) return { method: 'ffo_nav', reason: 'REIT: reported FFO and property NAV required.' };
  if (revenue === null || revenue <= 0) return { method: 'unavailable', reason: 'No positive reported revenue; milestone probabilities are not estimated.' };
  if (/oil|gas|steel|mining|coal|automotive/i.test(industry)) return { method: 'normalized_cycle', reason: 'Cyclical issuer: normalized multi-year forecasts required.' };
  if (netIncome === null) return { method: 'unavailable', reason: 'Reported earnings unavailable for method selection.' };
  return netIncome > 0 ? { method: 'dcf', reason: 'Profitable operating issuer: FCFF DCF with a peer cross-check.' } : { method: 'revenue_scenario', reason: 'Loss-making issuer: explicit future margin scenarios required.' };
}