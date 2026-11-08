import { describe, expect, it } from 'vitest';
import { factsTaxonomy, fundamentalEvidence, mergeHeadlines, relevanceTerms, rssHeadlines } from '@/lib/research-evidence';
import { dataChecks } from '@/lib/data-checks';
import { checkFigures, evidenceNumbers } from '@/lib/report-quality';
import { withoutOutliers } from '@/lib/valuation/comparables';

const row = (val: number, end: string, start: string | null, extra: Record<string, unknown> = {}) => ({ val, end, ...(start ? { start } : {}), filed: '2026-02-20', form: '10-K', accn: '0001-26-000001', fy: 2025, fp: 'FY', ...extra });
const fact = (unit: string, rows: unknown[]) => ({ units: { [unit]: rows } });
const dur = (v: number) => row(v, '2025-12-31', '2025-01-01');
const inst = (v: number) => row(v, '2025-12-31', null);

describe('financial coverage', () => {
  it('reads IFRS filers in their reported currency and does not value them', () => {
    const raw = { cik: 1, facts: { 'ifrs-full': { Revenue: fact('EUR', [dur(1000)]), ProfitLossFromOperatingActivities: fact('EUR', [dur(300)]) } } };
    expect(factsTaxonomy(raw)).toEqual({ taxonomy: 'ifrs-full', currency: 'EUR' });
    const f = fundamentalEvidence(raw, '2026-06-01');
    expect(f.currency).toBe('EUR');
    expect(f.annual.at(-1)?.revenue).toBe(1000);
    expect(f.annual.at(-1)?.operatingIncome).toBe(300);
    expect(f.ttm).toBeUndefined();
    expect(f.valuationBalance).toBeUndefined();
  });
  it('keeps pre-tax income separate when operating income is not reported', () => {
    const raw = { cik: 1, facts: { 'us-gaap': { Revenues: fact('USD', [dur(500)]), IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest: fact('USD', [dur(80)]) } } };
    const p = fundamentalEvidence(raw, '2026-06-01').annual.at(-1)!;
    expect(p.operatingIncome).toBeNull();
    expect(p.pretaxIncome).toBe(80);
  });
  it('recognises bank revenue net of interest expense and bank lines', () => {
    const raw = { cik: 1, facts: { 'us-gaap': { RevenuesNetOfInterestExpense: fact('USD', [dur(170)]), InterestIncomeExpenseNet: fact('USD', [dur(90)]), Deposits: fact('USD', [inst(2400)]) } } };
    const p = fundamentalEvidence(raw, '2026-06-01').annual.at(-1)!;
    expect(p.revenue).toBe(170); expect(p.netInterestIncome).toBe(90); expect(p.deposits).toBe(2400);
  });
});

describe('data checks', () => {
  const base = { status: 'available', annual: [], latestQuarter: null } as never;
  const period = (o: Record<string, unknown>) => ({ end: '2025-12-31', form: '10-K', assets: 100, liabilities: 60, equity: 40, liabilitiesDerived: false, operatingCashFlow: 30, capex: 10, freeCashFlow: 20, revenue: 200, operatingIncome: 20, ...o });
  it('passes balanced statements and warns beyond 0.5%', () => {
    expect(dataChecks({ ...(base as object), annual: [period({})] } as never, '2026-01-31').checks.find(c => c.code === 'balance_identity')?.severity).toBe('ok');
    expect(dataChecks({ ...(base as object), annual: [period({ equity: 30 })] } as never, '2026-01-31').checks.find(c => c.code === 'balance_identity')?.severity).toBe('warning');
  });
  it('withholds valuation when the latest cash-flow identity fails', () => {
    const c = dataChecks({ ...(base as object), annual: [period({ freeCashFlow: 25 })] } as never, '2026-01-31');
    expect(c.withholdValuation).toBe(true);
  });
  it('warns when the latest filed period is over 120 days old', () => {
    expect(dataChecks({ ...(base as object), annual: [period({})] } as never, '2026-06-01').checks.some(c => c.code === 'stale_filing')).toBe(true);
    expect(dataChecks({ ...(base as object), annual: [period({})] } as never, '2026-03-01').checks.some(c => c.code === 'stale_filing')).toBe(false);
  });
});

describe('figure matching', () => {
  const pool = evidenceNumbers({ revenue: 471098000000, margin: 0.333, pe: 24.6, annual: [{ revenue: 100 }, { revenue: 110 }] });
  it('matches rounded billions, ratio percentages, multiples and simple growth', () => {
    expect(checkFigures('Revenue reached $471.1 billion, margin 33.3%, P/E of 24.6x and growth of 10%.', pool).unverified).toEqual([]);
  });
  it('flags figures absent from evidence', () => {
    expect(checkFigures('Revenue reached $520 billion.', pool).unverified).toEqual(['$520 billion']);
  });
  it('ignores plain numbers such as years', () => {
    expect(checkFigures('In 2025 the company had 3 segments.', pool).checked).toBe(0);
  });
});

describe('headlines', () => {
  const xml = `<rss><channel>
    <item><title>Pfizer beats estimates - Reuters</title><link>https://n.example/a</link><pubDate>Fri, 06 Nov 2026 10:00:00 GMT</pubDate><source url="x">Reuters</source></item>
    <item><title>Markets rally on Fed</title><link>https://n.example/b</link><pubDate>Fri, 06 Nov 2026 11:00:00 GMT</pubDate></item>
    <item><title>PFE shares rise</title><link>https://n.example/c</link><pubDate>Fri, 06 Nov 2025 11:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const terms = relevanceTerms('PFE', 'Pfizer Inc.');
  it('keeps only relevant items inside the window and strips the source suffix', () => {
    const h = rssHeadlines(xml, '2026-11-08T23:59:59Z', '2026-10-09T00:00:00Z', 'Google News', terms);
    expect(h.map(x => x.title)).toEqual(['Pfizer beats estimates']);
    expect(h[0]!.publisher).toBe('Reuters');
  });
  it('deduplicates across feeds by normalized title', () => {
    const a = { title: 'Pfizer beats estimates', publisher: 'A', publishedAt: '2026-11-06T10:00:00Z', url: 'https://a/1' };
    expect(mergeHeadlines([[a], [{ ...a, title: 'Pfizer Beats Estimates!', url: 'https://b/2' }]])).toHaveLength(1);
  });
});

describe('peer outliers', () => {
  it('drops values far outside the cohort and names them', () => {
    const r = withoutOutliers([{ t: 'A', v: 10 }, { t: 'B', v: 12 }, { t: 'C', v: 11 }, { t: 'D', v: 13 }, { t: 'E', v: 400 }]);
    expect(r.outliers).toEqual(['E']); expect(r.kept).toHaveLength(4);
  });
});
