import { describe, expect, it } from 'vitest';
import { filingEvents, fundamentalEvidence, priorFindingsPrompt, yahooHeadlines } from '@/lib/research-evidence';
import { evidenceContext, type ResearchEvidence } from '@/lib/data-evidence';
import { parseSecFinancials } from '@/lib/stock-data';

const fy = (end: string, start: string, val: number, filed: string, form = '10-K', accn = `0001-${end}`) => ({ start, end, val, filed, form, accn });
const facts = {
  cik: 1633978,
  facts: { 'us-gaap': {
    Revenues: { units: { USD: [fy('2024-06-30', '2023-07-01', 100, '2024-08-20'), fy('2025-06-30', '2024-07-01', 150, '2025-08-20'), fy('2025-09-30', '2025-07-01', 50, '2025-11-05', '10-Q'), fy('2026-06-30', '2025-07-01', 300, '2026-08-20')] } },
    CostOfRevenue: { units: { USD: [fy('2025-06-30', '2024-07-01', 90, '2025-08-20')] } },
    NetIncomeLoss: { units: { USD: [fy('2024-06-30', '2023-07-01', 10, '2024-08-20'), fy('2025-06-30', '2024-07-01', 20, '2025-08-20')] } },
    LiabilitiesAndStockholdersEquity: { units: { USD: [{ end: '2025-06-30', val: 500, filed: '2025-08-20', form: '10-K' }] } },
    StockholdersEquity: { units: { USD: [{ end: '2025-06-30', val: 200, filed: '2025-08-20', form: '10-K' }] } },
  } },
};

describe('point-in-time SEC fundamentals', () => {
  const f = fundamentalEvidence(facts, '2026-01-01');
  it('excludes fiscal years filed after the analysis date', () => {
    expect(f.annual.map(p => p.end)).toEqual(['2024-06-30', '2025-06-30']);
  });
  it('computes year-over-year growth from consecutive fiscal years', () => {
    expect(f.annual[1]?.revenueGrowthPct).toBe(50);
    expect(f.annual[1]?.netIncomeGrowthPct).toBe(100);
  });
  it('derives gross profit and liabilities only from reported totals and flags them', () => {
    expect(f.annual[1]).toMatchObject({ grossProfit: 60, grossProfitDerived: true, liabilities: 300, liabilitiesDerived: true });
    expect(f.annual[0]?.grossProfit).toBeNull();
  });
  it('keeps the latest quarter separate and links the filing', () => {
    expect(f.latestQuarter).toMatchObject({ end: '2025-09-30', revenue: 50, form: '10-Q' });
    expect(f.annual[1]?.filingUrl).toBe('https://www.sec.gov/Archives/edgar/data/1633978/000120250630/');
  });
  it('is unavailable when nothing was filed by the cutoff', () => {
    expect(fundamentalEvidence(facts, '2020-01-01').status).toBe('unavailable');
  });
});

describe('dated news and filing events', () => {
  const submissions = { cik: '1633978', filings: { recent: {
    form: ['8-K', '10-Q', '4', '8-K', 'S-8'], filingDate: ['2026-11-06', '2026-11-03', '2026-10-01', '2026-07-01', '2026-10-15'],
    reportDate: ['', '2026-09-26', '', '', ''], accessionNumber: ['a-1', 'a-2', 'a-3', 'a-4', 'a-5'], primaryDocument: ['x.htm', 'q.htm', 'f.xml', 'y.htm', 's.htm'], items: ['', '', '', '2.02', ''],
  } } };
  it('keeps only filings inside the window and on or before the cutoff', () => {
    const events = filingEvents(submissions, '2026-11-05', '2026-08-07');
    expect(events.map(e => e.form)).toEqual(['10-Q', '4']);
    expect(events[0]?.url).toBe('https://www.sec.gov/Archives/edgar/data/1633978/a2/q.htm');
  });
  it('describes 8-K items', () => {
    expect(filingEvents(submissions, '2026-07-31', '2026-06-01')[0]?.description).toBe('Current report: Results of operations');
  });
  it('drops future-dated and non-https headlines', () => {
    const raw = { news: [
      { title: 'Ok', publisher: 'P', link: 'https://finance.yahoo.com/a', providerPublishTime: Date.parse('2026-11-04T12:00:00Z') / 1000 },
      { title: 'Future', link: 'https://finance.yahoo.com/b', providerPublishTime: Date.parse('2026-11-06T12:00:00Z') / 1000 },
      { title: 'Insecure', link: 'http://x.test', providerPublishTime: Date.parse('2026-11-04T12:00:00Z') / 1000 },
    ] };
    expect(yahooHeadlines(raw, '2026-11-05T23:59:59.999Z', '2026-08-07T00:00:00.000Z').map(h => h.title)).toEqual(['Ok']);
  });
});

describe('analyst evidence routing', () => {
  const evidence = { macro: { status: 'unavailable', asOf: '', fetchedAt: null, note: '', metrics: [] }, predictions: { status: 'unavailable', fetchedAt: null, note: '', markets: [] },
    news: { status: 'partial', cutoff: '2026-11-05', windowStart: '2026-08-07', fetchedAt: '', cached: false, filings: [], filingsSource: null, headlines: [], headlinesSource: null, notes: [] },
    fundamentals: fundamentalEvidence(facts, '2026-01-01') } as ResearchEvidence;
  it('gives news to news, sentiment and risk roles but not technical', () => {
    expect(evidenceContext('news', evidence)).toContain('news_and_filings');
    expect(evidenceContext('risk', evidence)).toContain('news_and_filings');
    expect(evidenceContext('technical', evidence)).not.toContain('news_and_filings');
  });
  it('gives SEC fundamentals to fundamentals and debate roles', () => {
    expect(evidenceContext('fundamentals', evidence)).toContain('sec_fundamentals');
    expect(evidenceContext('debate', evidence)).toContain('sec_fundamentals');
    expect(evidenceContext('sentiment', evidence)).not.toContain('sec_fundamentals');
  });
  it('hands prior findings to risk/debate, truncating long outputs', () => {
    const prompt = priorFindingsPrompt(['fundamentals: margins expanding', `technical: ${'x'.repeat(50)}`], 40);
    expect(prompt).toContain('margins expanding');
    expect(prompt).toContain('[truncated]');
    expect(priorFindingsPrompt([])).toContain('independent');
  });
});

describe('stock snapshot SEC gaps', () => {
  it('derives gross profit and total liabilities when only totals are filed', () => {
    const raw = { facts: { 'us-gaap': {
      Revenues: { units: { USD: [fy('2025-06-30', '2024-07-01', 150, '2025-08-20')] } },
      CostOfRevenue: { units: { USD: [fy('2025-06-30', '2024-07-01', 90, '2025-08-20')] } },
      LiabilitiesAndStockholdersEquity: { units: { USD: [{ end: '2025-06-30', val: 500, filed: '2025-08-20', form: '10-K' }] } },
      StockholdersEquity: { units: { USD: [{ end: '2025-06-30', val: 200, filed: '2025-08-20', form: '10-K' }] } },
    } } };
    const s = parseSecFinancials(raw, null).statements;
    expect(s.income.find(r => r.label === 'Gross profit')?.value).toBe(60);
    expect(s.balance.find(r => r.label === 'Total liabilities')?.value).toBe(300);
  });
});
