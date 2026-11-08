import { secCik, secSubmissions, secFacts } from '@/lib/stock-data.server';
import { fundamentalEvidence } from '@/lib/research-evidence';
import { numeric, object, parseYahooChart, validTicker } from '@/lib/stock-data';
import type { Peer } from './comparables';

async function yahoo(path: string): Promise<unknown> {
  for (const host of ['query1', 'query2']) {
    try {
      const response = await fetch(`https://${host}.finance.yahoo.com/${path}`, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
      if (response.ok) return await response.json();
    } catch { /* Try the second public host, never an authenticated premium endpoint. */ }
  }
  return null;
}
/** Suggestions are candidates only, not verified competitors or industry matches. */
export async function yahooPeerCandidates(ticker: string): Promise<string[]> {
  const body = object(await yahoo(`v6/finance/recommendationsbysymbol/${encodeURIComponent(ticker)}`));
  const result = object(body['finance'])['result'];
  const row = object(Array.isArray(result) ? result[0] : null);
  const symbols = row['recommendedSymbols'];
  return [...new Set((Array.isArray(symbols) ? symbols : []).map(v => object(v)['symbol']).filter((v): v is string => typeof v === 'string' && validTicker(v) && v !== ticker))].slice(0, 12);
}
export async function secIndustry(ticker: string): Promise<{ sic: string; industry: string } | null> {
  try {
    const cik = await secCik(ticker);
    if (!cik) return null;
    const sub = object(await secSubmissions(cik));
    const sic = String(sub['sic'] ?? '');
    return /^\d{4}$/.test(sic) ? { sic, industry: `SEC SIC ${sic} · ${String(sub['sicDescription'] ?? 'Industry classification')}` } : null;
  } catch { return null; }
}
/** Free ratios use aligned SEC denominators, never fabricated Yahoo TTM fields. */
export async function secYahooPeer(ticker: string, date: string, classification: { sic: string; industry: string }): Promise<Peer | null> {
  try {
    const own = await secIndustry(ticker);
    if (!own || own.sic !== classification.sic) return null;
    const raw = await yahoo(`v8/finance/chart/${encodeURIComponent(ticker.replace('.', '-'))}?range=1d&interval=1d`);
    const { meta, price } = parseYahooChart(raw);
    if (meta['currency'] !== 'USD' || price === null || price <= 0) return null;
    const f = fundamentalEvidence(await secFacts(ticker), date);
    const balance = f.valuationBalance;
    // Yahoo may omit market cap: price × dated SEC common shares is explicitly labeled.
    const liveCap = numeric(meta['marketCap']);
    const commonShares = balance?.shares?.value ?? null;
    const cap = liveCap ?? (commonShares !== null && commonShares > 0 ? price * commonShares : null);
    if (cap === null || cap <= 0) return null;
    const ttm = f.ttm;
    const shares = ttm?.dilutedShares;
    const recent = f.latestQuarter ?? f.annual.at(-1);
    const multiple = (denominator: number | null | undefined, aligned: boolean) => aligned && denominator !== null && denominator !== undefined && denominator > 0 ? cap / denominator : null;
    return { ticker, company: String(meta['longName'] ?? meta['shortName'] ?? ticker), industry: classification.industry, marketCap: cap, currency: 'USD', date, source: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`, multiples: {
      pe: multiple(ttm?.netIncome.value, shares?.end != null && shares.end === ttm?.netIncome.periodEnd),
      pFcf: multiple(ttm?.freeCashFlow, shares?.end != null && shares.end === ttm?.operatingCashFlow.periodEnd),
      pb: multiple(recent?.equity, recent?.end != null && recent.end === balance?.periodEnd),
      forwardPe: null, evSales: null, evEbitda: null,
    } };
  } catch { return null; }
}