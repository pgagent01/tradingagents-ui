import { describe, expect, it } from 'vitest';
import { capexSplit, profitBridge, discountRateCheck, wallStreetGapReview } from '@/lib/valuation/cash-bridge';
import { reinvestmentDefaults } from '@/lib/valuation/scenarios';
import type { TtmFigure } from '@/lib/valuation/ttm';
const f = (value: number, periodEnd = '2026-09-30'): TtmFigure => ({ value, method: 'annual_plus_ytd', periodEnd, inputs: { annual: null, ytd: null, priorYtd: null } });

describe('capital spending split', () => {
  it('treats depreciation as upkeep and the rest as growth spending', () => {
    const s = capexSplit({ operatingCashFlow: f(179.6), capex: f(159.8), depreciation: f(28) });
    expect(s.status).toBe('available');
    expect(s.upkeep).toBe(28);
    expect(s.growth).toBeCloseTo(131.8);
    expect(s.reportedFcf).toBeCloseTo(19.8);
    expect(s.ownerCashFlow).toBeCloseTo(151.6);
  });
  it('caps upkeep at capex', () => {
    const s = capexSplit({ operatingCashFlow: f(100), capex: f(10), depreciation: f(30) });
    expect(s.upkeep).toBe(10); expect(s.growth).toBe(0);
  });
  it('falls back to reported free cash flow when depreciation is missing or misaligned', () => {
    const s = capexSplit({ operatingCashFlow: f(100), capex: f(40), depreciation: f(20, '2025-12-31') });
    expect(s.status).toBe('unavailable'); expect(s.reportedFcf).toBe(60); expect(s.upkeep).toBeNull();
  });
});

describe('profit bridge', () => {
  it('reconciles operating to net income using filed non-operating items and tax', () => {
    const b = profitBridge({ operatingIncome: f(157), nonOperating: f(130.6), pretaxIncome: f(287.6), incomeTax: f(51.9), netIncome: f(235.7) });
    expect(b.status).toBe('available'); expect(b.unexplained).toBe(0);
  });
  it('labels a remainder instead of guessing', () => {
    const b = profitBridge({ operatingIncome: f(100), netIncome: f(150) });
    expect(b.status).toBe('partial'); expect(b.unexplained).toBe(50);
    expect(b.rows.some(r => r.kind === 'remainder')).toBe(true);
  });
});

describe('discount rate check', () => {
  it('flags rates outside 6–14%', () => {
    expect(discountRateCheck(0.05).ok).toBe(false);
    expect(discountRateCheck(0.15).ok).toBe(false);
    expect(discountRateCheck(0.10).ok).toBe(true);
  });
});

describe('Wall Street gap review', () => {
  const base = { growth: 0.14, margin: 0.39, reinvestment: 0.4, discountRate: 0.102 };
  it('explains drivers when the target is more than 40% from the analyst average', () => {
    const r = wallStreetGapReview({ ...base, target: 139.41, consensus: 400, growthSpendingShare: 0.82 });
    expect(r.triggered).toBe(true); expect(r.drivers.length).toBe(5);
  });
  it('stays quiet within 40%', () => {
    expect(wallStreetGapReview({ ...base, target: 300, consensus: 400 }).triggered).toBe(false);
  });
});

describe('reinvestment defaults', () => {
  it('keeps the 40% base and caps the cautious bear rate at 70%', () => {
    const split = capexSplit({ operatingCashFlow: f(180), capex: f(160), depreciation: f(28) });
    const r = reinvestmentDefaults({ split, nopat: 118, growth: 0.14, equity: 400, debt: 125, cash: 20 });
    expect(r.base).toBe(0.4); expect(r.bear).toBe(0.7);
  });
});
