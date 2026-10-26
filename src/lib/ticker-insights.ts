import { object, numeric, type Candle } from '@/lib/stock-data';

export type Piotroski = { score: number | null; tested: number; signals: { label: string; pass: boolean | null }[]; fiscalYear: string | null };
type FactRow = Record<string, unknown>;

function annualValues(raw: unknown, names: string[], unit = 'USD', duration = true): Map<string, number> {
  const facts = object(object(object(raw)['facts'])['us-gaap']);
  const out = new Map<string, number>();
  for (const name of names) {
    const rows = object(object(facts[name])['units'])[unit];
    if (!Array.isArray(rows)) continue;
    const sorted = (rows as FactRow[]).map(object).filter(r => r['form'] === '10-K' && typeof r['end'] === 'string' && (!duration || (typeof r['start'] === 'string' && (Date.parse(String(r['end'])) - Date.parse(String(r['start']))) / 86400000 > 300))).sort((a, b) => String(a['filed']).localeCompare(String(b['filed'])));
    for (const r of sorted) { const v = numeric(r['val']); if (v !== null && !out.has(String(r['end']))) out.set(String(r['end']), v); }
    if (out.size) break;
  }
  return out;
}

/** Piotroski F-score from SEC annual filings. Signals lacking data stay null and are not counted as passes. */
export function piotroskiScore(raw: unknown): Piotroski {
  const revenue = annualValues(raw, ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet']);
  const ends = [...revenue.keys()].sort().reverse();
  const [cur, prev, prev2] = ends;
  const income = annualValues(raw, ['NetIncomeLoss']), cfo = annualValues(raw, ['NetCashProvidedByUsedInOperatingActivities']), gross = annualValues(raw, ['GrossProfit']);
  const assets = annualValues(raw, ['Assets'], 'USD', false), debt = annualValues(raw, ['LongTermDebtNoncurrent', 'LongTermDebt'], 'USD', false);
  const ca = annualValues(raw, ['AssetsCurrent'], 'USD', false), cl = annualValues(raw, ['LiabilitiesCurrent'], 'USD', false);
  const shares = annualValues(raw, ['WeightedAverageNumberOfDilutedSharesOutstanding'], 'shares');
  const g = (m: Map<string, number>, k?: string) => (k ? m.get(k) ?? null : null);
  const div = (a: number | null, b: number | null) => (a !== null && b !== null && b !== 0 ? a / b : null);
  const cmp = (a: number | null, b: number | null, better: 'higher' | 'lower') => (a === null || b === null ? null : better === 'higher' ? a > b : a < b);
  const roa = (k?: string, assetK?: string) => div(g(income, k), g(assets, assetK));
  const signals = [
    { label: 'Positive net income', pass: g(income, cur) === null ? null : (g(income, cur) as number) > 0 },
    { label: 'Positive operating cash flow', pass: g(cfo, cur) === null ? null : (g(cfo, cur) as number) > 0 },
    { label: 'Return on assets improved', pass: cmp(roa(cur, prev), roa(prev, prev2), 'higher') },
    { label: 'Cash flow exceeds net income', pass: cmp(g(cfo, cur), g(income, cur), 'higher') },
    { label: 'Long-term debt ratio fell', pass: cmp(div(g(debt, cur), g(assets, cur)), div(g(debt, prev), g(assets, prev)), 'lower') },
    { label: 'Current ratio improved', pass: cmp(div(g(ca, cur), g(cl, cur)), div(g(ca, prev), g(cl, prev)), 'higher') },
    { label: 'No share dilution', pass: g(shares, cur) === null || g(shares, prev) === null ? null : (g(shares, cur) as number) <= (g(shares, prev) as number) },
    { label: 'Gross margin improved', pass: cmp(div(g(gross, cur), g(revenue, cur)), div(g(gross, prev), g(revenue, prev)), 'higher') },
    { label: 'Asset turnover improved', pass: cmp(div(g(revenue, cur), g(assets, prev)), div(g(revenue, prev), g(assets, prev2)), 'higher') },
  ];
  const tested = signals.filter(s => s.pass !== null).length;
  return { score: tested ? signals.filter(s => s.pass).length : null, tested, signals, fiscalYear: cur ?? null };
}

/** Beta and correlation of daily returns versus a benchmark, aligned by date. */
export function marketSensitivity(stock: Candle[], bench: Candle[]): { beta: number | null; correlation: number | null; days: number } {
  const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
  const b = new Map(bench.map(c => [day(c.time), c.close]));
  const pairs = stock.map(c => [c.close, b.get(day(c.time))] as const).filter((p): p is readonly [number, number] => p[1] !== undefined);
  const rs: number[] = [], rb: number[] = [];
  for (let i = 1; i < pairs.length; i++) { const [s0, b0] = pairs[i - 1]!; const [s1, b1] = pairs[i]!; rs.push(s1 / s0 - 1); rb.push(b1 / b0 - 1); }
  if (rs.length < 20) return { beta: null, correlation: null, days: rs.length };
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const ms = mean(rs), mb = mean(rb);
  let cov = 0, vs = 0, vb = 0;
  rs.forEach((r, i) => { cov += (r - ms) * (rb[i]! - mb); vs += (r - ms) ** 2; vb += (rb[i]! - mb) ** 2; });
  return { beta: vb ? cov / vb : null, correlation: vs && vb ? cov / Math.sqrt(vs * vb) : null, days: rs.length };
}

const SCORE: Record<string, number> = { 'STRONG BUY': 2, BUY: 1, HOLD: 0, SELL: -1, 'STRONG SELL': -2 };
export function agentConsensus(recs: (string | null)[]) {
  const scored = recs.map(r => (r ? SCORE[r] : undefined)).filter((v): v is number => v !== undefined);
  const counts: Record<string, number> = {};
  recs.forEach(r => { if (r) counts[r] = (counts[r] ?? 0) + 1; });
  const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  const label = avg === null ? 'No rated reports' : avg >= 1.5 ? 'STRONG BUY' : avg >= 0.5 ? 'BUY' : avg > -0.5 ? 'HOLD' : avg > -1.5 ? 'SELL' : 'STRONG SELL';
  return { reports: scored.length, average: avg, label, counts };
}

export type Anomaly = { kind: 'sentiment' | 'valuation' | 'earnings'; message: string };
/** Watchlist triggers. Missing inputs never raise an alert. */
export function detectAnomalies(input: { latestRec: string | null; previousRec: string | null; price: number | null; target: number | null; thresholdPct: number; lastFiling: string | null; lastFilingForm: string | null; lastReportDate: string | null; now?: number; sentiment: boolean; earnings: boolean }): Anomaly[] {
  const out: Anomaly[] = [];
  const a = input.latestRec ? SCORE[input.latestRec] : undefined, b = input.previousRec ? SCORE[input.previousRec] : undefined;
  if (input.sentiment && a !== undefined && b !== undefined && a !== b) out.push({ kind: 'sentiment', message: `Agent view shifted ${input.previousRec} → ${input.latestRec}` });
  if (input.price !== null && input.target !== null && input.target > 0) {
    const gap = (input.price - input.target) / input.target * 100;
    if (Math.abs(gap) >= input.thresholdPct) out.push({ kind: 'valuation', message: `Price is ${gap > 0 ? '+' : ''}${gap.toFixed(1)}% vs latest target $${input.target.toFixed(2)}` });
  }
  if (input.earnings && input.lastFiling) {
    const age = ((input.now ?? Date.now()) - Date.parse(input.lastFiling)) / 86400000;
    const newer = !input.lastReportDate || input.lastFiling > input.lastReportDate.slice(0, 10);
    if (age <= 14 || newer) out.push({ kind: 'earnings', message: `New ${input.lastFilingForm ?? 'filing'} filed ${input.lastFiling}${newer ? ' since last research' : ''}` });
  }
  return out;
}

export function latestPeriodicFiling(raw: unknown): { date: string | null; form: string | null } {
  const facts = object(object(object(raw)['facts'])['us-gaap']);
  let best: { date: string | null; form: string | null } = { date: null, form: null };
  for (const name of ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'NetIncomeLoss']) {
    const rows = object(object(facts[name])['units'])['USD'];
    if (Array.isArray(rows)) for (const r of rows.map(object)) if ((r['form'] === '10-Q' || r['form'] === '10-K') && typeof r['filed'] === 'string' && (!best.date || r['filed'] > best.date)) best = { date: r['filed'], form: String(r['form']) };
  }
  return best;
}
