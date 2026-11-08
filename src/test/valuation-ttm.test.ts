import { describe, expect, it } from 'vitest';
import { ttmFigure } from '@/lib/valuation/ttm';
import { reconcileFigures } from '@/lib/valuation/reconcile';

const row = (val: number, start: string, end: string, form: string, filed: string, accn: string) => ({ val, start, end, form, filed, accn });
const facts = (rows: object[]) => ({ Revenues: { units: { USD: rows } } });
const FY = row(1000, '2025-01-01', '2025-12-31', '10-K', '2026-02-05', 'K25');
const YTD = row(780, '2026-01-01', '2026-09-30', '10-Q', '2026-10-30', 'Q3');
const PRIOR = row(700, '2025-01-01', '2025-09-30', '10-Q', '2026-10-30', 'Q3');

describe('rolling trailing twelve months', () => {
  it('adds current year-to-date and removes prior year-to-date from the same filing', () => {
    const f = ttmFigure(facts([FY, YTD, PRIOR]), ['Revenues']);
    expect(f.value).toBe(1080);
    expect(f.method).toBe('annual_plus_ytd');
    expect(f.periodEnd).toBe('2026-09-30');
  });
  it('falls back to the annual figure when the prior-year comparative is in a different filing', () => {
    const f = ttmFigure(facts([FY, YTD, { ...PRIOR, accn: 'OTHER' }]), ['Revenues']);
    expect(f.value).toBe(1000);
    expect(f.method).toBe('annual');
  });
  it('ignores filings after the analysis date', () => {
    expect(ttmFigure(facts([FY, YTD, PRIOR]), ['Revenues'], '2026-10-01').value).toBe(1000);
  });
  it('is unavailable with no annual anchor', () => {
    expect(ttmFigure(facts([YTD, PRIOR]), ['Revenues']).value).toBeNull();
  });
  it('uses the newest filed revision when same-period YTD figures were amended',()=>{
    const revised={...YTD,val:800,filed:'2026-11-05',accn:'Q3A',form:'10-Q/A'};
    const prior={...PRIOR,filed:'2026-11-05',accn:'Q3A',form:'10-Q/A'};
    expect(ttmFigure(facts([FY,YTD,PRIOR,revised,prior]),['Revenues'],'2026-11-08').value).toBe(1100);
    expect(ttmFigure(facts([FY,YTD,PRIOR,revised,prior]),['Revenues'],'2026-11-01').value).toBe(1080);
  });
});

describe('provider reconciliation', () => {
  const sec = { provider: 'SEC', periodEnd: '2025-12-31', values: { revenue: 100, netIncome: null } };
  it('flags differences above 2% and keeps the SEC value', () => {
    const [r] = reconcileFigures(sec, [{ provider: 'FMP', periodEnd: '2025-12-31', values: { revenue: 103 } }]);
    expect(r?.flagged).toBe(true);
    expect(r?.used).toBe('SEC');
  });
  it('does not flag a 1% difference', () => {
    expect(reconcileFigures(sec, [{ provider: 'FMP', periodEnd: '2025-12-31', values: { revenue: 101 } }])[0]?.flagged).toBe(false);
  });
  it('labels the backup provider when SEC is missing', () => {
    expect(reconcileFigures(sec, [{ provider: 'FMP', periodEnd: '2025-12-31', values: { netIncome: 5 } }])[1]?.used).toBe('FMP');
  });
  it('never compares different periods', () => {
    expect(reconcileFigures(sec, [{ provider: 'FMP', periodEnd: '2024-12-31', values: { revenue: 200 } }])[0]?.others).toHaveLength(0);
  });
});
