import { sectionObject } from './report-content';
import { secRows, selectSecFact } from './sec-periods';

const revenueTags = ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueGoodsNet'];
const day = 86400000;
const finite = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? v : null;
const date = (v: unknown): string | null => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) ? v : null;
const anniversary = (v: string, year: number) => {
  const d = new Date(`${v}T00:00:00Z`), month = d.getUTCMonth();
  d.setUTCFullYear(d.getUTCFullYear() + year);
  if (d.getUTCMonth() !== month) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
};

/** Subsequent filed annual results, not a revision-certified historical backtest. */
export function forecastOutcomes(sections: unknown, raw: unknown, asOf: string) {
  const valuation = sectionObject(sectionObject(sections)['valuation']);
  const trailing = sectionObject(sectionObject(valuation['inputs'])['trailing']);
  const savedRevenue = sectionObject(trailing['revenue']);
  const annual = sectionObject(sectionObject(savedRevenue['inputs'])['annual']);
  const baseEnd = date(savedRevenue['periodEnd']), baseStart = date(annual['start']);
  const analysisDate = date(valuation['analysisDate']);
  const intrinsic = sectionObject(valuation['intrinsic']);
  const scenarios = Array.isArray(intrinsic['scenarios']) ? intrinsic['scenarios'].map(sectionObject) : [];
  const comparable = savedRevenue['method'] === 'annual' && baseEnd !== null && baseStart !== null && annual['end'] === baseEnd;
  const body = sectionObject(raw), facts = sectionObject(sectionObject(body['facts'])['us-gaap']);
  const cik = finite(body['cik']);
  const anchors = secRows(facts, revenueTags, 'USD', asOf).filter(r => /^(10-K|20-F|40-F)/.test(String(r['form'])) && typeof r['start'] === 'string');
  const rows = scenarios.flatMap(scenario => (Array.isArray(scenario['forecasts']) ? scenario['forecasts'].map(sectionObject) : []).flatMap(forecast => {
    const year = finite(forecast['year']);
    if (year === null || !Number.isInteger(year) || year < 1 || year > 5) return [];
    const end = baseEnd ? anniversary(baseEnd, year) : null;
    const start = baseStart ? anniversary(baseStart, year) : null;
    const candidates = comparable && end && start ? anchors.filter(r => Math.abs(Date.parse(String(r['end'])) - Date.parse(end)) <= 7 * day && Math.abs(Date.parse(String(r['start'])) - Date.parse(start)) <= 7 * day && (Date.parse(String(r['end'])) - Date.parse(String(r['start']))) / day > 300 && (Date.parse(String(r['end'])) - Date.parse(String(r['start']))) / day < 400 && (!analysisDate || String(r['filed']) > analysisDate)).sort((a, b) => String(b['filed']).localeCompare(String(a['filed']))) : [];
    const anchor = candidates[0];
    return (['revenue', 'operatingIncome'] as const).map(metric => {
      const expected = finite(forecast[metric]);
      const fact = anchor ? selectSecFact(facts, metric === 'revenue' ? revenueTags : ['OperatingIncomeLoss'], anchor, 'annual', 'USD', asOf) : null;
      const actual = fact?.value ?? null;
      const status = !comparable || expected === null ? 'unavailable' as const : end && end > asOf ? 'pending' as const : actual !== null ? 'available' as const : 'awaiting_filing' as const;
      const accession = fact?.accession ?? null;
      return { scenario: typeof scenario['name'] === 'string' ? scenario['name'] : 'Unnamed', year, metric, periodEnd: end, actualStart: fact?.start ?? null, actualEnd: fact?.end ?? null, expected, actual, errorPct: actual !== null && actual !== 0 && expected !== null ? (expected - actual) / Math.abs(actual) * 100 : null, status, filed: fact?.filed ?? null, accession, sourceUrl: accession && cik ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/` : null };
    });
  }));
  return { asOf, baseEnd, rows, notes: [
    ...(comparable ? [] : ['Comparable annual forecast baseline unavailable. Rolling quarterly TTM forecasts are not compared with fiscal-year totals.']),
    'Forecast error = (saved estimate − reported result) / absolute reported result. Positive means the forecast was higher; zero reported results have no percentage error.',
    'Actuals use subsequent annual USD SEC filings, aligned within seven days for 52/53-week years. Revenue and operating income use the same filing version. Missing filings remain pending or unavailable.',
    'Latest filed comparative revisions may be reflected in actuals. This measures forecast outcomes, not revision-certified point-in-time backtesting; saved research is unchanged.',
  ] };
}