import { describe, it, expect } from 'vitest';
import { reitValuation } from '@/lib/valuation/reit';
import { valuationBalance } from '@/lib/valuation/financial-inputs';
import { reviewReport } from '@/lib/report-review';
describe('REIT FFO valuation', () => {
  it('computes FFO = net income + depreciation − sale gains', () => {
    const v = reitValuation({ netIncome: 900, depreciation: 2400, saleGains: 100, shares: 900, riskFree: 0.045, beta: 0.8, price: 58 });
    expect(v.ffo).toBe(3200); expect(v.affo).toBeCloseTo(2720);
    expect(v.value!).toBeCloseTo(2720 / 900 * 1.03 / (0.085 - 0.03), 4);
  });
  it('is unavailable without depreciation', () => {
    expect(reitValuation({ netIncome: 900, depreciation: null, saleGains: null, shares: 900, riskFree: 0.045, beta: 0.8, price: 58 }).status).toBe('unavailable');
  });
});
describe('annual debt fallback', () => {
  const row = (end: string, val: number, accn: string, form: string, filed: string) => ({ end, val, accn, form, filed, fy: 2025, fp: 'FY' });
  const facts = {
    LongTermDebtNoncurrent: { units: { USD: [row('2025-12-31', 30696, 'k', '10-K', '2026-02-15')] } },
    LongTermDebtMaturitiesRepaymentsOfPrincipalInNextTwelveMonths: { units: { USD: [row('2025-12-31', 7120, 'k', '10-K', '2026-02-15')] } },
    ShortTermBorrowings: { units: { USD: [row('2025-12-31', 5514, 'k', '10-K', '2026-02-15')] } },
  };
  it('uses the latest annual report when the quarter has only custom debt tags', () => {
    const b = valuationBalance(facts, { end: '2026-09-30', accn: 'q', filed: '2026-11-01' }, '2026-11-16', undefined, { end: '2025-12-31', accn: 'k', filed: '2026-02-15' });
    expect(b.debt?.value).toBe(43330); expect(b.debt?.derived).toBe(true); expect(b.note).toMatch(/latest annual report/);
  });
});
describe('rating/target consistency', () => {
  const base = { conviction: 50, calculatedTarget: 624, scenarioRange: null, text: '', citedFirms: [], evidenceFirms: [], sections: {} };
  it('flags HOLD with 55% upside', () => {
    expect(reviewReport({ ...base, rating: 'HOLD', target: 624, price: 401 }).checks.find(c => c.id === 'rating-target-consistency')?.passed).toBe(false);
  });
  it('passes HOLD within 30%', () => {
    expect(reviewReport({ ...base, rating: 'HOLD', target: 450, price: 401 }).checks.find(c => c.id === 'rating-target-consistency')?.passed).toBe(true);
  });
});
import { reviewFigures } from '@/lib/report-quality';
describe('figure tracing with anchors', () => {
  it('verifies a percentage gap between target and consensus but not an invented one', () => {
    const r = reviewFigures({ s: 'Our target is 65.2% below the analyst average; a 12.3% gap elsewhere.' }, {}, [139.41, 400.37]);
    expect(r.checked).toBe(2); expect(r.unverified).toBe(1);
  });
});
import { keyNumbers } from '@/lib/report-key-numbers';
describe('report key numbers', () => {
  it('computes upside and Wall Street gap from saved sections only', () => {
    const k = keyNumbers({ valuation: { price: 100, intrinsicValue: 110, method: 'dcf' }, external_evidence: { analystViews: { consensus: [{ source: 'Yahoo Finance', mean: 150 }] } }, quality_review: { figures: { checked: 40, unverified: 3 }, warnings: [1, 2] } }, 120);
    expect(k.upsidePct).toBe(20); expect(k.gapToWallStreetPct).toBe(-20); expect(k.untracedFigures).toBe(3); expect(k.warnings).toBe(2);
  });
  it('leaves missing values empty', () => { const k = keyNumbers({}, null); expect(k.price).toBeNull(); expect(k.upsidePct).toBeNull(); });
});
