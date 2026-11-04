import { decryptSecret } from '@/lib/crypto.server';
import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { object, type FinancialRow } from '@/lib/stock-data';

export type AlphaOverview = { symbol: string; date: string | null; fetchedAt: string; ratios: FinancialRow[] };
export type AlphaCredential = { key: string; version: string; overview?: () => Promise<AlphaOverview | null> };

export async function ownAlphaCredential(sb: EvidenceClient, userId: string): Promise<AlphaCredential | null> {
  const { data, error } = await sb.from('user_api_keys').select('key_ciphertext,updated_at').eq('user_id', userId).eq('provider', 'alphavantage').maybeSingle();
  if (error) throw new Error('Data credentials could not be loaded.');
  if (!data) return null;
  return { key: await decryptSecret(data.key_ciphertext, process.env['API_KEY_ENCRYPTION_SECRET']), version: data.updated_at };
}

export function alphaNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function alphaRequest(key: string, ticker: string, fn: string) {
  const query = new URLSearchParams({ function: fn, symbol: ticker, apikey: key });
  const response = await fetch(`https://www.alphavantage.co/query?${query}`, { signal: AbortSignal.timeout(10000) });
  // Provider JSON and URLs may echo secrets; never return or log them.
  if (!response.ok) throw new Error('Alpha Vantage unavailable.');
  const raw = object(await response.json());
  if (raw['Information'] || raw['Note'] || raw['Error Message']) throw new Error('Alpha Vantage access or quota unavailable.');
  return raw;
}

export async function validateAlphaKey(key: string) {
  try {
    const raw = await alphaRequest(key, 'AAPL', 'OVERVIEW');
    if (raw['Symbol'] === 'AAPL') return { provider: 'alphavantage' as const, valid: true, message: 'Alpha Vantage overview accepted. Other endpoints and quota depend on your plan; quotes may be delayed.' };
  } catch { /* Only sanitized validation status crosses the server boundary. */ }
  return { provider: 'alphavantage' as const, valid: false, message: 'Alpha Vantage could not confirm access. Check your key, endpoint entitlement and daily quota; a quota response does not mean the key is invalid.' };
}

export function parseAlphaOverview(raw: unknown, ticker: string): AlphaOverview | null {
  const row = object(raw);
  if (row['Symbol'] !== ticker) return null;
  const date = typeof row['LatestQuarter'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row['LatestQuarter']) ? row['LatestQuarter'] : null;
  const pct = (field: string) => { const value = alphaNumber(row[field]); return value === null ? null : value * 100; };
  return { symbol: ticker, date, fetchedAt: new Date().toISOString(), ratios: [
    { label: 'P/E · Alpha Vantage TTM', value: alphaNumber(row['PERatio']) },
    { label: 'P/S · Alpha Vantage TTM', value: alphaNumber(row['PriceToSalesRatioTTM']) },
    { label: 'EV / EBITDA · Alpha Vantage', value: alphaNumber(row['EVToEBITDA']) },
    { label: 'Net margin % · Alpha Vantage TTM', value: pct('ProfitMargin') },
    { label: 'ROE % · Alpha Vantage TTM', value: pct('ReturnOnEquityTTM') },
  ] };
}

export async function cachedAlphaOverview(sb: EvidenceClient, userId: string, ticker: string, credential: AlphaCredential) {
  const cacheKey = `overview-v1:${ticker}:${credential.version}`;
  const cached = await readDataCache(sb, userId, 'alphavantage', cacheKey);
  if (cached?.fresh) {
    const payload = object(cached.payload);
    return payload['unavailable'] ? null : payload as unknown as AlphaOverview;
  }
  try {
    const parsed = parseAlphaOverview(await alphaRequest(credential.key, ticker, 'OVERVIEW'), ticker);
    await writeDataCache(sb, userId, 'alphavantage', cacheKey, parsed ?? { unavailable: true }, parsed ? 86400000 : 3600000);
    return parsed;
  } catch {
    await writeDataCache(sb, userId, 'alphavantage', cacheKey, { unavailable: true }, 3600000);
    return null;
  }
}