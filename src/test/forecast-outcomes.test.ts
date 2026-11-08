import { describe, expect, it, vi } from 'vitest';
import { forecastOutcomes } from '@/lib/forecast-outcomes';
const sections = { valuation: { analysisDate: '2025-02-15', inputs: { trailing: { revenue: { method: 'annual', periodEnd: '2024-12-31', inputs: { annual: { start: '2024-01-01', end: '2024-12-31' } } } } }, intrinsic: { scenarios: [{ name: 'Base', forecasts: [{ year: 1, revenue: 120, operatingIncome: 24 }, { year: 2, revenue: 144, operatingIncome: 28.8 }] }] } } };
const row = (val: number, extra = {}) => ({ val, start: '2025-01-01', end: '2025-12-31', filed: '2026-02-01', accn: '2026-001', form: '10-K', ...extra });
const raw = (rev = [row(100)], op = [row(20)]) => ({ cik: 101, facts: { 'us-gaap': { Revenues: { units: { USD: rev } }, OperatingIncomeLoss: { units: { USD: op } } } } });
describe('saved forecast outcomes', () => {
  it('uses saved estimates after serialization and returns dated same-filing actuals', () => {
    const s = forecastOutcomes(JSON.parse(JSON.stringify(sections)), raw(), '2026-02-15');
    expect(s.rows[0]).toMatchObject({ expected: 120, actual: 100, errorPct: 20, filed: '2026-02-01', accession: '2026-001', actualEnd: '2025-12-31', status: 'available' });
    expect(s.rows[1]).toMatchObject({ actual: 20, errorPct: 20 });
    expect(s.rows[2]?.status).toBe('pending');
  });
  it('does not compare quarterly TTM baselines to fiscal-year actuals', () => {
    const s = structuredClone(sections); s.valuation.inputs.trailing.revenue.method = 'annual_plus_ytd';
    expect(forecastOutcomes(s, raw(), '2026-02-15').rows[0]).toMatchObject({ actual: null, status: 'unavailable' });
  });
  it('withholds later filings and mismatched fiscal-year durations', () => {
    expect(forecastOutcomes(sections, raw(), '2026-01-15').rows[0]?.actual).toBeNull();
    expect(forecastOutcomes(sections, raw([row(100, { start: '2025-07-01' })]), '2026-02-15').rows[0]?.actual).toBeNull();
  });
  it('never mixes filing versions and does not divide by zero', () => {
    expect(forecastOutcomes(sections, raw([row(100)], [row(20, { accn: 'other' })]), '2026-02-15').rows[1]?.actual).toBeNull();
    expect(forecastOutcomes(sections, raw([row(0)], [row(-10)]), '2026-02-15').rows[0]?.errorPct).toBeNull();
    expect(forecastOutcomes(sections, raw([row(0)], [row(-10)]), '2026-02-15').rows[1]?.errorPct).toBe(340);
  });
  it('excludes actual periods already complete before the forecast was made', () => {
    const s = structuredClone(sections); s.valuation.analysisDate = '2026-01-15';
    expect(forecastOutcomes(s, raw(), '2026-02-15').rows[0]?.actual).toBeNull();
  });
  it('matches 52/53-week fiscal years and keeps legacy reports empty', () => {
    expect(forecastOutcomes(sections, raw([row(100, { end: '2026-01-03' })], [row(20, { end: '2026-01-03' })]), '2026-02-15').rows[0]?.actual).toBe(100);
    expect(forecastOutcomes({}, raw(), '2026-02-15').rows).toEqual([]);
  });
});
const cache = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), facts: vi.fn() }));
vi.mock('@/lib/data-cache.server', () => ({ readDataCache: cache.read, writeDataCache: cache.write }));
vi.mock('@/lib/stock-data.server', () => ({ secFacts: cache.facts }));
import { reportForecastOutcomes } from '@/lib/forecast-outcomes.server';
it('scopes cached outcomes to the owner and skips filing fetches for TTM reports', async () => {
  cache.read.mockResolvedValue(null); cache.write.mockResolvedValue(undefined); cache.facts.mockClear();
  const sb = {} as Parameters<typeof reportForecastOutcomes>[0];
  const s = structuredClone(sections); s.valuation.inputs.trailing.revenue.method = 'annual_plus_ytd';
  const result = await reportForecastOutcomes(sb, 'owner-1', { id: 'report-1', ticker: 'AMZN', sections: s });
  expect(cache.read).toHaveBeenCalledWith(sb, 'owner-1', 'forecast-outcomes', expect.stringContaining('report-1'));
  expect(cache.write).toHaveBeenCalledWith(sb, 'owner-1', 'forecast-outcomes', expect.any(String), result, 21600000);
  expect(cache.facts).not.toHaveBeenCalled();
});