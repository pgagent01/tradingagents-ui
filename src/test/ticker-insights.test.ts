import { describe, it, expect } from 'vitest';
import { detectAnomalies, agentConsensus, marketSensitivity, piotroskiScore } from '@/lib/ticker-insights';

const base = { latestRec: null, previousRec: null, price: null, target: null, thresholdPct: 15, lastFiling: null, lastFilingForm: null, lastReportDate: null, sentiment: true, earnings: true, now: Date.parse('2026-10-26') };
describe('watchlist triggers', () => {
  it('flags a recommendation shift', () => expect(detectAnomalies({ ...base, latestRec: 'SELL', previousRec: 'BUY' })[0]?.kind).toBe('sentiment'));
  it('flags price diverging past threshold only', () => {
    expect(detectAnomalies({ ...base, price: 120, target: 100 }).map(a => a.kind)).toEqual(['valuation']);
    expect(detectAnomalies({ ...base, price: 110, target: 100 })).toEqual([]);
  });
  it('flags a filing newer than last research', () => expect(detectAnomalies({ ...base, lastFiling: '2026-08-01', lastFilingForm: '10-Q', lastReportDate: '2026-07-01T00:00:00Z' })[0]?.kind).toBe('earnings'));
  it('stays quiet with missing data or disabled alerts', () => expect(detectAnomalies({ ...base, latestRec: 'SELL', previousRec: 'BUY', sentiment: false })).toEqual([]));
});
describe('insights', () => {
  it('averages agent consensus', () => expect(agentConsensus(['BUY', 'STRONG BUY', null]).label).toBe('STRONG BUY'));
  it('beta of identical series is 1', () => {
    const c = Array.from({ length: 30 }, (_, i) => ({ time: 1700000000 + i * 86400, open: 1, high: 1, low: 1, close: 100 + Math.sin(i) * 5, volume: null }));
    expect(marketSensitivity(c, c).beta).toBeCloseTo(1);
  });
  it('piotroski without filings is unavailable', () => expect(piotroskiScore({}).score).toBeNull());
});
