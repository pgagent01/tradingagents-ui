import { describe, expect, it } from 'vitest';
import { savedFinancialComparisons } from '@/lib/financial-comparison';
import { reconcileFigures } from '@/lib/valuation/reconcile';
describe('saved financial comparison handoff', () => {
  const sec = { provider: 'SEC', periodEnd: '2025-12-31', values: { revenue: 100, netIncome: -10 } };
  it('preserves the 2% tolerance, signed differences and SEC selection through a saved snapshot', () => {
    const evidence = reconcileFigures(sec, [{ provider: 'FMP', periodEnd: '2025-12-31', values: { revenue: 103, netIncome: -8 } }]);
    const rows = savedFinancialComparisons(JSON.parse(JSON.stringify(evidence)));
    expect(rows[0]).toMatchObject({ sec: 100, value: 103, diffPct: 3, used: 'SEC', flagged: true });
    expect(rows[1]).toMatchObject({ sec: -10, value: -8, diffPct: 20 });
  });
  it('does not display a different fiscal period as a comparable provider', () => {
    const rows = savedFinancialComparisons(reconcileFigures(sec, [{ provider: 'FMP', periodEnd: '2024-12-31', values: { revenue: 200 } }]));
    expect(rows[0]).toMatchObject({ sec: 100, provider: null, value: null, diffPct: null });
  });
  it('never fabricates comparison data for legacy snapshots or invalid numbers', () => {
    expect(savedFinancialComparisons(undefined)).toEqual([]);
    expect(savedFinancialComparisons([{ metric: 'revenue', sec: Infinity, others: [{ provider: 'FMP', value: '100', diffPct: NaN }] }])[0]).toMatchObject({ sec: null, value: null, diffPct: null });
  });
});