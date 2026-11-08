/** All rates are decimals, amounts are USD; forecasts are explicit estimates, not facts. */
export type ValueResult = { value: number | null; reason: string | null };
const unavailable = (reason: string): ValueResult => ({ value: null, reason });
const positive = (n: number) => Number.isFinite(n) && n > 0;
export function dcfValue(input: { cashFlows: number[]; discountRate: number; terminalGrowth: number; netDebt: number; shares: number }): ValueResult {
  const { cashFlows, discountRate: r, terminalGrowth: g, netDebt, shares } = input;
  if (!cashFlows.length || cashFlows.some(c => !Number.isFinite(c)) || !positive(shares) || !Number.isFinite(netDebt) || !positive(r) || !Number.isFinite(g) || g <= -1 || r <= g) return unavailable('DCF requires explicit cash-flow forecasts, shares, net debt and a discount rate above terminal growth.');
  const last = cashFlows.at(-1);
  if (last === undefined || last <= 0) return unavailable('Positive terminal cash flow is required.');
  const pv = cashFlows.reduce((sum, c, i) => sum + c / (1 + r) ** (i + 1), 0);
  const terminal = last * (1 + g) / (r - g) / (1 + r) ** cashFlows.length;
  const value = (pv + terminal - netDebt) / shares;
  return positive(value) ? { value, reason: null } : unavailable('Projected equity value is non-positive.');
}
export function excessReturnValue(input: { bookEquity: number; shares: number; returnOnEquity: number; costOfEquity: number; growth: number }): ValueResult {
  const { bookEquity: b, shares: s, returnOnEquity: roe, costOfEquity: r, growth: g } = input;
  if (![b, s, r].every(positive) || !Number.isFinite(roe) || !Number.isFinite(g) || g <= -1 || r <= g) return unavailable('Excess-return valuation requires positive book equity, shares and a cost of equity above growth.');
  const value = (b + b * (roe - r) / (r - g)) / s;
  return positive(value) ? { value, reason: null } : unavailable('Projected equity value is non-positive.');
}
export function ffoValue(ffo: number, shares: number, multiple: number): ValueResult {
  return [ffo, shares, multiple].every(positive) ? { value: ffo / shares * multiple, reason: null } : unavailable('Reported FFO, shares and an evidenced FFO multiple are required.');
}
export function scenarioValue(input: { revenue: number; growth: number; years: number; margin: number; earningsMultiple: number; shares: number; discountRate: number }): ValueResult {
  const { revenue, growth, years, margin, earningsMultiple, shares, discountRate } = input;
  if (![revenue, earningsMultiple, shares].every(positive) || !Number.isInteger(years) || years < 1 || years > 10 || !Number.isFinite(growth) || growth <= -1 || !positive(margin) || margin > 1 || !Number.isFinite(discountRate) || discountRate < 0) return unavailable('Revenue scenarios require explicit growth, positive margin, evidenced multiple, shares and discount rate.');
  const value = revenue * (1 + growth) ** years * margin * earningsMultiple / shares / (1 + discountRate) ** years;
  return positive(value) ? { value, reason: null } : unavailable('Scenario value is invalid.');
}
export function blendedCostOfCapital(input: { equity: number; debt: number; costOfEquity: number; costOfDebt: number; taxRate: number }): number | null {
  const { equity, debt, costOfEquity, costOfDebt, taxRate } = input;
  if (!positive(equity) || !Number.isFinite(debt) || debt < 0 || !positive(costOfEquity) || !Number.isFinite(costOfDebt) || costOfDebt < 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) return null;
  return (equity * costOfEquity + debt * costOfDebt * (1 - taxRate)) / (equity + debt);
}
export function twelveMonthTarget(value: number, rate: number, dividends: number): number | null {
  if (!positive(value) || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(dividends) || dividends < 0) return null;
  const target = value * (1 + rate) - dividends;
  return positive(target) ? target : null;
}