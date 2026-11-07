import { describe, expect, it } from 'vitest';
import { averageTone, earningsFilings, exhibitName, parseGdeltArticles, parseShortInterest, parseWorldBank } from '@/lib/sources/free-sources';
import { evidenceContext } from '@/lib/data-evidence';

describe('free sources', () => {
  it('drops GDELT articles seen after the cutoff and duplicate titles', () => {
    const a = parseGdeltArticles({ articles: [
      { url: 'https://a.com/1', title: 'Lumentum rises', seendate: '20261101T120000Z' },
      { url: 'https://b.com/1', title: 'Lumentum Rises', seendate: '20261101T130000Z' },
      { url: 'https://c.com/1', title: 'Future story', seendate: '20261110T000000Z' },
      { url: 'http://d.com/1', title: 'Insecure', seendate: '20261101T000000Z' },
    ] }, '2026-11-05');
    expect(a.map(x => x.url)).toEqual(['https://a.com/1']);
  });
  it('excludes zero-coverage days from average tone', () => {
    expect(averageTone([{ value: 0 }, { value: -2 }, { value: 4 }])).toBe(1);
    expect(averageTone([{ value: 0 }])).toBeNull();
  });
  it('keeps only FINRA rows on or before the cutoff, newest first', () => {
    const r = parseShortInterest([
      { symbolCode: 'LITE', settlementDate: '2026-10-15', currentShortPositionQuantity: 100, daysToCoverQuantity: 2 },
      { symbolCode: 'LITE', settlementDate: '2026-10-31', currentShortPositionQuantity: 120 },
      { symbolCode: 'LITE', settlementDate: '2026-11-14', currentShortPositionQuantity: 130 },
      { symbolCode: 'OTHER', settlementDate: '2026-10-31', currentShortPositionQuantity: 1 },
    ], 'LITE', '2026-11-07');
    expect(r.map(x => x.settlementDate)).toEqual(['2026-10-31', '2026-10-15']);
  });
  it('World Bank keeps only completed years before the analysis year', () => {
    const p = parseWorldBank([{ lastupdated: '2026-10-08' }, [
      { country: { value: 'China' }, indicator: { id: 'X' }, date: '2026', value: 9 },
      { country: { value: 'China' }, indicator: { id: 'X' }, date: '2025', value: 4.96 },
      { country: { value: 'China' }, indicator: { id: 'X' }, date: '2024', value: 5 },
    ]], 'GDP', '2026-03-01');
    expect(p.rows).toEqual([{ country: 'China', indicator: 'X', name: 'GDP', year: '2025', value: 4.96 }]);
  });
  it('selects only 8-K Item 2.02 earnings filings inside the window', () => {
    const f = earningsFilings({ filings: { recent: { form: ['8-K', '8-K', '10-Q', '8-K'], filingDate: ['2026-11-02', '2026-11-02', '2026-11-03', '2026-12-01'], items: ['1.01,5.02', '2.02,9.01', '', '2.02'], accessionNumber: ['a', 'b', 'c', 'd'] } } }, '2026-11-07', '2026-07-01');
    expect(f).toEqual([{ filed: '2026-11-02', accession: 'b' }]);
    expect(exhibitName({ directory: { item: [{ name: 'lite-20261102.htm' }, { name: 'lite_ex991xq1fy27.htm' }] } })).toBe('lite_ex991xq1fy27.htm');
  });
  it('routes new sources to the existing analysts', () => {
    const base = { macro: { status: 'unavailable', asOf: '', fetchedAt: null, note: '', metrics: [] }, predictions: { status: 'unavailable', fetchedAt: null, note: '', markets: [] } } as never;
    const feed = { status: 'available', source: 's', sourceUrl: null, cutoff: '2026-11-07', fetchedAt: '', cached: false, note: '', items: [] };
    const ev = { ...(base as object), free: { gdelt: { ...feed, tone: [], averageTone: 1 }, shortInterest: feed, globalMacro: { ...feed, lastUpdated: null }, earningsReleases: feed, social: { ...feed, status: 'unavailable' } } } as never;
    expect(evidenceContext('news', ev)).toContain('gdelt_global_news');
    expect(evidenceContext('technical', ev)).toContain('finra_short_interest');
    expect(evidenceContext('technical', ev)).not.toContain('gdelt_global_news');
    expect(evidenceContext('sentiment', ev)).toContain('social_media');
    expect(evidenceContext('macro', ev)).toContain('world_bank_macro');
    expect(evidenceContext('fundamentals', ev)).toContain('sec_earnings_releases');
  });
});
