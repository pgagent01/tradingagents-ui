import { describe, expect, it } from 'vitest';
import { cacheStaleAfterFiling, industrySnapshotDue, latestFilingDate } from '@/lib/data-refresh';
import { derivedOperatingIncome, type TtmFigure } from '@/lib/valuation/ttm';

const fig = (value: number | null, periodEnd = '2026-09-30'): TtmFigure => ({ value, method: 'annual_plus_ytd', periodEnd, inputs: { annual: null, ytd: null, priorYtd: null } });

describe('scheduled refresh', () => {
  it('finds the newest 10-K/10-Q/8-K and ignores other forms', () => {
    expect(latestFilingDate({ filings: { recent: { form: ['4', '10-Q', '8-K', 'S-8'], filingDate: ['2026-11-10', '2026-10-29', '2026-11-03', '2026-11-12'] } } })).toBe('2026-11-03');
  });
  it('marks a cache stale only when fetched before the filing day', () => {
    expect(cacheStaleAfterFiling('2026-11-02T10:00:00Z', '2026-11-03')).toBe(true);
    expect(cacheStaleAfterFiling('2026-11-03T10:00:00Z', '2026-11-03')).toBe(false);
  });
  it('flags the Damodaran snapshot due from February of the next year', () => {
    expect(industrySnapshotDue('2026-01-05', '2026-11-16')).toBe(false);
    expect(industrySnapshotDue('2026-01-05', '2027-01-20')).toBe(false);
    expect(industrySnapshotDue('2026-01-05', '2027-02-01')).toBe(true);
  });
});

describe('derived operating income', () => {
  const lines = (sga: number | null) => [
    { label: 'Cost of revenue', required: true, figure: fig(20) },
    { label: 'Selling, general & administrative', required: true, figure: fig(sga) },
    { label: 'Research & development', required: false, figure: fig(10) },
    { label: 'Restructuring', required: false, figure: fig(5, '2025-12-31') },
  ];
  it('subtracts same-period lines and skips misaligned optional ones', () => {
    const r = derivedOperatingIncome(fig(100), lines(30), fig(35));
    expect(r?.value).toBe(40);
    expect(r?.derivedFrom).toEqual(['Cost of revenue', 'Selling, general & administrative', 'Research & development']);
  });
  it('withholds when a required line is missing', () => {
    expect(derivedOperatingIncome(fig(100), lines(null), null)).toBeNull();
  });
  it('withholds when far from pre-tax income (unreported lines likely)', () => {
    expect(derivedOperatingIncome(fig(100), lines(30), fig(-20))).toBeNull();
  });
});
