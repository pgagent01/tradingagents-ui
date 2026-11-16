import { excessReturnValue, twelveMonthTarget } from './methods';
import type { IndustryNorm } from './industry-norms';
/** Excess-return valuation for banks and insurers: book equity plus the present value of returns above the cost of equity. Normalized ROE blends the company's trailing ROE with the dated industry ROE. */
export function bankValuation(i: { netIncome: number | null; equity: number | null; shares: number | null; riskFree: number; beta: number; dividendsPerShare?: number; norm: IndustryNorm | null; price: number | null }) {
  const fail = (reason: string) => ({ status: 'unavailable' as const, reason, value: null, target: null, roe: null as number | null, normalizedRoe: null as number | null, costOfEquity: null as number | null, priceToBook: null as number | null, notes: [] as string[] });
  if (i.netIncome === null || i.equity === null || i.equity <= 0 || i.shares === null || i.shares <= 0) return fail('Excess-return valuation needs aligned trailing net income, positive common equity and shares.');
  const roe = i.netIncome / i.equity;
  const normalizedRoe = i.norm?.roe != null ? (roe + i.norm.roe) / 2 : roe;
  const ke = i.riskFree + i.beta * .05;
  const growth = Math.min(.03, Math.max(0, i.riskFree - .015));
  const r = excessReturnValue({ bookEquity: i.equity, shares: i.shares, returnOnEquity: normalizedRoe, costOfEquity: ke, growth });
  if (r.value === null) return fail(r.reason ?? 'Excess-return value unavailable.');
  const bookPerShare = i.equity / i.shares;
  const target = twelveMonthTarget(r.value, ke, i.dividendsPerShare ?? 0);
  return { status: 'estimated' as const, reason: null, value: r.value, target, roe, normalizedRoe, costOfEquity: ke, priceToBook: i.price !== null && i.price > 0 ? i.price / bookPerShare : null, notes: [
    `Excess-return model: book equity USD ${i.equity} + PV of (ROE − cost of equity) × book, perpetual growth ${(growth * 100).toFixed(1)}%.`,
    `Trailing ROE ${(roe * 100).toFixed(1)}%${i.norm?.roe != null ? ` blended 50/50 with ${i.norm.industry} ROE ${(i.norm.roe * 100).toFixed(1)}% (Damodaran ${i.norm.effectiveDate})` : ' (no industry ROE available)'} → normalized ${(normalizedRoe * 100).toFixed(1)}%. Cost of equity ${(ke * 100).toFixed(2)}% = risk-free + beta ${i.beta.toFixed(2)} × 5% premium.`,
    `Book value per share USD ${bookPerShare.toFixed(2)}${i.price ? `; market price/book ${(i.price / bookPerShare).toFixed(2)}×` : ''}. Tangible book, capital ratios and credit-loss cycles are not modelled.`,
  ] };
}
