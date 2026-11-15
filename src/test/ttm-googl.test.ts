import { describe, it, expect } from 'vitest';
import { ttmFigure } from '@/lib/valuation/ttm';

// Real Alphabet NetIncomeLoss facts from SEC companyfacts (filed through 2026-10-29).
const r = (start: string, end: string, val: number, form: string, filed: string, accn: string) => ({ start, end, val, form, filed, accn });
const facts = { NetIncomeLoss: { units: { USD: [
  r('2025-01-01', '2025-09-30', 97715e6, '10-Q', '2026-10-29', 'A84'),
  r('2025-07-01', '2025-09-30', 34979e6, '10-Q', '2026-10-29', 'A84'),
  r('2025-01-01', '2025-12-31', 132170e6, '10-K', '2026-02-05', 'A18'),
  r('2026-01-01', '2026-09-30', 201239e6, '10-Q', '2026-10-29', 'A84'),
  r('2026-07-01', '2026-09-30', 26468e6, '10-Q', '2026-10-29', 'A84'),
] } } };

describe('Alphabet TTM net income from SEC filings', () => {
  it('equals FY2025 + 9M 2026 − 9M 2025 = $235.694B, sourced from the 10-Q', () => {
    const f = ttmFigure(facts, ['NetIncomeLoss']);
    expect(f.method).toBe('annual_plus_ytd');
    expect(f.value).toBe(235694e6);
    expect(f.inputs.ytd?.accession).toBe('A84');
  });
});
