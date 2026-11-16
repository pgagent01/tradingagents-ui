import { describe, expect, it } from 'vitest';
import { industryNorm, marginTargets, normFlags } from '@/lib/valuation/industry-norms';
import { bankValuation } from '@/lib/valuation/bank';
import { forecastScenario } from '@/lib/valuation/forecast';
import { reviewReport, citedFirms, unknownFirms } from '@/lib/report-review';
import { selectMethod } from '@/lib/valuation/select-method';

describe('industry norms', () => {
  it('maps SIC 6021 to regional banks and 2834 to pharma from the Jan 2026 snapshot', () => {
    expect(industryNorm('6021', '2026-11-16')?.industry).toBe('Banks (Regional)');
    expect(industryNorm('2834', '2026-11-16')?.industry).toBe('Drugs (Pharmaceutical)');
  });
  it('withholds the snapshot for analysis dates before it was published', () => {
    expect(industryNorm('2834', '2025-12-31')).toBeNull();
  });
  it('fades margin half-way toward the norm', () => {
    const n = industryNorm('2834', '2026-11-16')!;
    const t = marginTargets(0.1, { ...n, operatingMargin: 0.3 })!;
    expect(t.base).toBeCloseTo(0.2); expect(t.bear).toBe(0.1); expect(t.bull).toBe(0.3);
  });
  it('flags a discount rate more than 3 points from industry cost of capital', () => {
    const n = { ...industryNorm('2834', '2026-11-16')!, costOfCapital: 0.07, mappingShare: 0.9 };
    expect(normFlags({ margin: n.operatingMargin, discountRate: 0.107, norm: n })).toHaveLength(1);
  });
  it('reaches the target margin in year 5 of the forecast', () => {
    const a = { growth: 0, margin: 0.1, targetMargin: 0.2, taxRate: 0, reinvestment: 0, terminalGrowth: 0.02, riskFree: 0.04, beta: 1, equityPremium: 0.05, creditSpread: 0.02, dividendsPerShare: 0 };
    const s = forecastScenario({ revenue: 100, debt: 0, cash: 0, shares: 1, marketCap: 1000, assumptions: a }, 'Base');
    expect(s.forecasts[4]!.operatingIncome).toBeCloseTo(20); expect(s.forecasts[0]!.operatingIncome).toBeCloseTo(12);
  });
  it('treats Damodaran REIT naming as REIT', () => {
    expect(selectMethod('R.E.I.T.', 100, 10).method).toBe('ffo_nav');
  });
});

describe('bank excess-return valuation', () => {
  it('fades ROE 15% to ke 9% over 10 years instead of a perpetual premium', () => {
    const v = bankValuation({ netIncome: 15, equity: 100, shares: 1, riskFree: 0.04, beta: 1, norm: null, price: 150 });
    expect(v.costOfEquity).toBeCloseTo(0.09); expect(v.priceToBook).toBeCloseTo(1.5);
    expect(v.value!).toBeGreaterThan(120); expect(v.value!).toBeLessThan(100 + 100 * 0.06 / 0.065);
  });
  it('averages a one-off 28.7% ROE year with filed history and industry ROE', () => {
    const v = bankValuation({ netIncome: 28.7, equity: 100, shares: 1, riskFree: 0.045, beta: 0.6, price: 100, annualRoes: [0.12, 0.14, 0.11, 0.15, 0.13],
      norm: { industry: 'Insurance (Prop/Cas.)', roe: 0.12, effectiveDate: '2026-01-05' } as never });
    expect(v.normalizedRoe!).toBeCloseTo((0.287 + 0.13 + 0.12) / 3, 4);
    expect(v.value!).toBeLessThan(165);
  });
  it('is unavailable without positive equity', () => {
    expect(bankValuation({ netIncome: 15, equity: 0, shares: 1, riskFree: 0.04, beta: 1, norm: null, price: 150 }).status).toBe('unavailable');
  });
});

describe('report review', () => {
  const base = { rating: 'HOLD', conviction: 50, target: 120, calculatedTarget: 118, scenarioRange: { low: 90, high: 150 }, text: '', citedFirms: [], evidenceFirms: [], sections: { executive_summary: 'x', final_synthesis: 'x', risk_debate: 'x' } };
  it('withholds a target outside the calculated range', () => {
    expect(reviewReport({ ...base, target: 200 }).withholdTarget).toBe(true);
  });
  it('withholds a target with no calculated valuation', () => {
    expect(reviewReport({ ...base, calculatedTarget: null }).withholdTarget).toBe(true);
  });
  it('passes a supported target', () => {
    expect(reviewReport(base).withholdTarget).toBe(false);
  });
  it('flags BUY with conviction below 40', () => {
    expect(reviewReport({ ...base, rating: 'BUY', conviction: 30 }).checks.find(c => c.id === 'hold-conviction')?.passed).toBe(false);
  });
  it('finds cited firms missing from evidence', () => {
    const c = citedFirms('Goldman Sachs raised its target while Mizuho cut.');
    expect(unknownFirms(c, ['Goldman Sachs & Co'])).toEqual(['Mizuho']);
  });
});
