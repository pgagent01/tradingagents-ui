import type { EvidenceClient } from '@/lib/data-cache.server';
import { decryptSecret } from '@/lib/crypto.server';
import { dataProviderEnabled } from './data-provider-settings.server';
import type { RatingTrend } from '@/lib/analyst-views';
/** Account-owned Finnhub key only; off unless the account enabled it. */
export async function ownFinnhubCredential(sb: EvidenceClient, userId: string) {
  if (!await dataProviderEnabled(sb, userId, 'finnhub')) return null;
  const { data, error } = await sb.from('user_api_keys').select('key_ciphertext,updated_at').eq('user_id', userId).eq('provider', 'finnhub').maybeSingle();
  if (error) throw new Error('Data credentials could not be loaded.');
  if (!data) return null;
  return { key: await decryptSecret(data.key_ciphertext, process.env['API_KEY_ENCRYPTION_SECRET']), version: data.updated_at };
}
async function finnhub(path: string, key: string): Promise<unknown> {
  // Header auth keeps the key out of URLs; never log responses.
  const r = await fetch(`https://finnhub.io/api/v1/${path}`, { headers: { 'X-Finnhub-Token': key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(r.status === 401 ? 'Finnhub key rejected' : r.status === 429 ? 'Finnhub rate limited' : r.status === 403 ? 'Finnhub plan does not include this data' : 'Finnhub unavailable');
  return r.json();
}
export async function finnhubTrend(ticker: string, key: string): Promise<RatingTrend[]> {
  const rows = await finnhub(`stock/recommendation?symbol=${encodeURIComponent(ticker)}`, key);
  return parseFinnhubTrend(rows);
}
export function parseFinnhubTrend(rows: unknown): RatingTrend[] {
  return (Array.isArray(rows) ? rows : []).flatMap(r => { const o = r as Record<string, unknown>; const v = ['strongBuy', 'buy', 'hold', 'sell', 'strongSell'].map(k => Number(o[k])); return typeof o['period'] === 'string' && v.every(n => Number.isFinite(n) && n >= 0) ? [{ period: o['period'] as string, strongBuy: v[0]!, buy: v[1]!, hold: v[2]!, sell: v[3]!, strongSell: v[4]! }] : []; }).slice(0, 4);
}
export async function validateFinnhubKey(key: string) {
  try { const t = await finnhubTrend('AAPL', key); return { provider: 'finnhub' as const, valid: true, message: t.length ? 'Finnhub key accepted; analyst rating counts available.' : 'Finnhub key accepted, but no rating counts were returned.' }; }
  catch (e) { return { provider: 'finnhub' as const, valid: false, message: e instanceof Error ? e.message : 'Finnhub could not validate this key.' }; }
}
