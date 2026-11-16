import { twelveMonthTarget } from './methods';
import type { IndustryNorm } from './industry-norms';
/** Present value of excess returns that fade linearly from the normalized ROE to the cost of equity over `years`; no perpetual excess return is assumed, so one unusually profitable year cannot dominate. */
export function fadedExcessReturnValue(i: { bookEquity: number; shares: number; startRoe: number; costOfEquity: number; growth: number; years?: number }): number | null {
  const n = i.years ?? 10; const { bookEquity: b0, shares, startRoe, costOfEquity: ke, growth: g } = i;
  if (!(b0 > 0 && shares > 0 && ke > 0) || !Number.isFinite(startRoe)) return null;
  let b = b0, pv = 0;
  for (let t = 1; t <= n; t++) { const roe = startRoe + (ke - startRoe) * (t - 1) / (n - 1); pv += (roe - ke) * b / (1 + ke) ** t; b *= 1 + g; }
  const v = (b0 + pv) / shares;
  return Number.isFinite(v) && v > 0 ? v : null;
}
/** Excess-return valuation for banks and insurers. Normalized ROE averages trailing ROE, the multi-year annual average (when at least three fiscal years are filed) and the dated industry ROE. */
export function bankValuation(i: { netIncome: number | null; equity: number | null; shares: number | null; riskFree: number; beta: number; dividendsPerShare?: number; norm: IndustryNorm | null; price: number | null; annualRoes?: number[] }) {
  const fail = (reason: string) => ({ status: 'unavailable' as const, reason, value: null, target: null, roe: null as number | null, normalizedRoe: null as number | null, costOfEquity: null as number | null, priceToBook: null as number | null, notes: [] as string[] });
  if (i.netIncome === null || i.equity === null || i.equity <= 0 || i.shares === null || i.shares <= 0) return fail('Excess-return valuation needs aligned trailing net income, positive common equity and shares.');
  const roe = i.netIncome / i.equity;
  const hist = (i.annualRoes ?? []).filter(Number.isFinite);
  const avg = hist.length >= 3 ? hist.reduce((a, b) => a + b, 0) / hist.length : null;
  const parts = [roe, ...(avg !== null ? [avg] : []), ...(i.norm?.roe != null ? [i.norm.roe] : [])];
  const normalizedRoe = parts.reduce((a, b) => a + b, 0) / parts.length;
  const ke = i.riskFree + i.beta * .05;
  const growth = Math.min(.03, Math.max(0, i.riskFree - .015));
  const value = fadedExcessReturnValue({ bookEquity: i.equity, shares: i.shares, startRoe: normalizedRoe, costOfEquity: ke, growth });
  if (value === null) return fail('Projected equity value is non-positive.');
  const bookPerShare = i.equity / i.shares;
  const target = twelveMonthTarget(value, ke, i.dividendsPerShare ?? 0);
  return { status: 'estimated' as const, reason: null, value, target, roe, normalizedRoe, costOfEquity: ke, priceToBook: i.price !== null && i.price > 0 ? i.price / bookPerShare : null, notes: [
    `Excess-return model: book equity USD ${i.equity} + PV of (ROE − cost of equity) × book over 10 years, with ROE fading to the cost of equity by year 10 (no perpetual excess return); book grows ${(growth * 100).toFixed(1)}% a year.`,
    `Normalized ROE ${(normalizedRoe * 100).toFixed(1)}% = average of trailing ${(roe * 100).toFixed(1)}%${avg !== null ? `, ${hist.length}-year filed average ${(avg * 100).toFixed(1)}%` : ' (fewer than three filed years for a history average)'}${i.norm?.roe != null ? ` and ${i.norm.industry} ROE ${(i.norm.roe * 100).toFixed(1)}% (Damodaran ${i.norm.effectiveDate})` : ' (no industry ROE available)'}. Cost of equity ${(ke * 100).toFixed(2)}% = risk-free + beta ${i.beta.toFixed(2)} × 5% premium.`,
    `Book value per share USD ${bookPerShare.toFixed(2)}${i.price ? `; market price/book ${(i.price / bookPerShare).toFixed(2)}×` : ''}. Tangible book, capital ratios, catastrophe and credit-loss cycles are not modelled.`,
  ] };
}
