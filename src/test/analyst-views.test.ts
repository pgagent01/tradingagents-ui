import { describe, expect, it } from 'vitest';
import { analystGap, analystViewsFor, buildAnalystViews, consensusDisagreements, copiesConsensus, latestPerFirm, parseYahooActions, parseYahooConsensus, trendDisagreement, type AnalystAction, type AnalystConsensus } from '@/lib/analyst-views';
import { defaultGrowth } from '@/lib/valuation/scenarios';
import { parseFinnhubTrend } from '@/lib/finnhub.server';
const act = (firm: string, date: string, target: number | null, extra: Partial<AnalystAction> = {}): AnalystAction => ({ firm, date, toGrade: 'Buy', fromGrade: 'Buy', action: 'main', targetAction: null, target, priorTarget: null, source: 'Yahoo Finance', sourceUrl: 'https://finance.yahoo.com/quote/X/analysis', ...extra });
const cons = (source: AnalystConsensus['source'], mean: number): AnalystConsensus => ({ source, sourceUrl: 'https://x', mean, median: mean, high: mean * 1.2, low: mean * 0.8, analysts: 50, rating: 'buy', ratingMean: 2, currency: 'USD', retrievedAt: '2026-11-15T00:00:00Z' });
describe('analyst views', () => {
  it('parses Yahoo consensus and dated firm actions', () => {
    const res = { financialData: { targetMeanPrice: { raw: 400.37 }, targetHighPrice: { raw: 500 }, targetLowPrice: { raw: 300 }, numberOfAnalystOpinions: { raw: 53 }, recommendationKey: 'strong_buy' }, upgradeDowngradeHistory: { history: [{ epochGradeDate: 1793630407, firm: 'Wells Fargo', toGrade: 'Overweight', currentPriceTarget: 365, priorPriceTarget: 371, priceTargetAction: 'Lowers' }] } };
    expect(parseYahooConsensus(res, 'GOOGL', 'now')?.mean).toBe(400.37);
    const a = parseYahooActions(res, 'GOOGL');
    expect(a[0]).toMatchObject({ firm: 'Wells Fargo', target: 365, priorTarget: 371 });
  });
  it('keeps only each firm\'s newest target within 12 months and before the cutoff', () => {
    const r = latestPerFirm([act('A', '2026-10-01', 300), act('A', '2026-11-01', 350), act('B', '2025-01-01', 200), act('C', '2026-12-01', 999)], '2026-11-15');
    expect(r.map(x => [x.firm, x.target])).toEqual([['A', 350]]);
  });
  it('flags provider consensus more than 10% apart without averaging', () => {
    expect(consensusDisagreements([cons('Yahoo Finance', 400), cons('Financial Modeling Prep', 450)])).toHaveLength(1);
    expect(consensusDisagreements([cons('Yahoo Finance', 400), cons('Financial Modeling Prep', 420)])).toHaveLength(0);
  });
  it('historical runs drop current consensus and trends', () => {
    const v = buildAnalystViews({ ticker: 'X', cutoff: '2026-06-01', today: '2026-11-15', consensus: [cons('Yahoo Finance', 400)], trend: [{ period: '0m', strongBuy: 1, buy: 1, hold: 0, sell: 0, strongSell: 0 }], actions: [act('A', '2026-05-01', 300), act('B', '2026-10-01', 500)], retrievedAt: 'now' });
    expect(v.consensus).toEqual([]); expect(v.trend).toEqual([]);
    expect(v.actions.map(a => a.firm)).toEqual(['A']); expect(v.status).toBe('historical_partial');
  });
  it('withholds a target that copies the analyst average only when no calculated target exists', () => {
    const v = buildAnalystViews({ ticker: 'X', cutoff: '2026-11-15', today: '2026-11-15', consensus: [cons('Yahoo Finance', 400)], trend: [], actions: [], retrievedAt: 'now' });
    expect(copiesConsensus(401, null, v)).toBe(true);
    expect(copiesConsensus(410, null, v)).toBe(false);
    expect(copiesConsensus(401, 390, v)).toBe(false);
  });
  it('notes gaps over 40% from the analyst average', () => {
    const v = buildAnalystViews({ ticker: 'X', cutoff: '2026-11-15', today: '2026-11-15', consensus: [cons('Yahoo Finance', 400)], trend: [], actions: [], retrievedAt: 'now' });
    expect(analystGap(126, v)?.gapPct).toBeCloseTo(-68.5, 1);
    expect(analystGap(300, v)).toBeNull();
  });
  it('routes role-specific slices with sources', () => {
    const v = buildAnalystViews({ ticker: 'X', cutoff: '2026-11-15', today: '2026-11-15', consensus: [cons('Yahoo Finance', 400)], trend: [], actions: [act('A', '2026-11-01', 350, { action: 'down' })], retrievedAt: 'now' });
    expect(JSON.stringify(analystViewsFor('news', v))).toContain('"firm":"A"');
    expect(JSON.stringify(analystViewsFor('risk', v))).toContain('downgrades');
    expect(analystViewsFor('technical', v)).toBeNull();
  });
  it('cross-checks Finnhub rating counts against Yahoo', () => {
    const y = [{ period: '0m', strongBuy: 10, buy: 40, hold: 5, sell: 0, strongSell: 0 }];
    expect(trendDisagreement(y, parseFinnhubTrend([{ period: '2026-11-01', strongBuy: 2, buy: 10, hold: 30, sell: 5, strongSell: 0 }]), 'Yahoo', 'Finnhub')).toContain('Finnhub');
    expect(trendDisagreement(y, y, 'Yahoo', 'Finnhub')).toBeNull();
  });
});
describe('default growth setting', () => {
  const annual = [100, 110, 125, 150].map((revenue, i, a) => ({ revenue, revenueGrowthPct: i ? (revenue / a[i - 1]! - 1) * 100 : null }));
  it('fixed caps latest growth at 15%', () => { expect(defaultGrowth(annual, 'fixed').growth).toBeCloseTo(0.15); });
  it('blend averages latest growth and 3-year CAGR', () => { expect(defaultGrowth(annual, 'blend').growth).toBeCloseTo((0.2 + Math.pow(1.5, 1 / 3) - 1) / 2, 4); });
  it('recent follows latest year up to 35%', () => { expect(defaultGrowth(annual, 'recent').growth).toBeCloseTo(0.2); });
  it('defaults to a labeled 5% without data', () => { expect(defaultGrowth([], 'blend').growth).toBe(0.05); });
});
