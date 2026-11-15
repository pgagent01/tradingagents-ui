import { decryptSecret } from './crypto.server';
import { dataProviderEnabled, suppliedCredentialOwner } from './data-provider-settings.server';
import { readDataCache, writeDataCache, type EvidenceClient } from './data-cache.server';
import { tiingoReferences, type ReferenceFeed } from './reference-evidence';

type Credential = { key: string; version: string; gateway: boolean };
async function ownTiingoCredential(sb: EvidenceClient, userId: string): Promise<Credential | null> {
  if (!await dataProviderEnabled(sb, userId, 'tiingo')) return null;
  const row = await sb.from('user_api_keys').select('key_ciphertext,updated_at').eq('user_id', userId).eq('provider', 'tiingo').maybeSingle();
  if (row.error) throw new Error('Tiingo credentials unavailable.');
  if (row.data) return { key: await decryptSecret(row.data.key_ciphertext, process.env['API_KEY_ENCRYPTION_SECRET']), version: `personal:${row.data.updated_at}`, gateway: false };
  if (!await suppliedCredentialOwner(sb, userId)) return null;
  const key = process.env['UDC_TIINGO_API_KEY'];
  return key ? { key, version: 'owner-connector-v1', gateway: true } : null;
}
function tiingoRequest(path: string, credential: Credential) {
  const gatewayKey = process.env['LOVABLE_API_KEY'];
  if (credential.gateway && !gatewayKey) throw new Error('Tiingo connection unavailable.');
  return fetch(`${credential.gateway ? 'https://connector-gateway.lovable.dev/udc_tiingo' : 'https://api.tiingo.com'}${path}`, {
    headers: credential.gateway ? { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': credential.key } : { Authorization: `Token ${credential.key}` },
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
}
export async function validateTiingoKey(key: string) {
  try {
    const r = await tiingoRequest('/api/test/', { key, version: 'test', gateway: false });
    await r.body?.cancel();
    return { provider: 'tiingo' as const, valid: r.ok, message: r.ok ? 'Tiingo key accepted. News access and quota depend on your plan.' : `Tiingo key not verified (HTTP ${r.status}). Check account access; no retry was made.` };
  } catch { return { provider: 'tiingo' as const, valid: false, message: 'Could not reach Tiingo. No retry was made.' }; }
}
const pending = new Map<string, Promise<ReferenceFeed>>();
export async function getTiingoEvidence(sb: EvidenceClient, userId: string, ticker: string, cutoff: string, lookback: number): Promise<ReferenceFeed> {
  const base: ReferenceFeed = { status: 'unavailable', fetchedAt: new Date().toISOString(), cutoff, cached: false, note: 'Tiingo dated publisher descriptions; partial evidence, not full articles. Plan coverage applies.', items: [] };
  if (cutoff !== base.fetchedAt.slice(0, 10)) return { ...base, status: 'historical_unavailable', note: 'Current Tiingo news excluded from historical research; point-in-time coverage is not verified.' };
  let credential: Credential | null;
  try { credential = await ownTiingoCredential(sb, userId); } catch { return { ...base, note: 'Tiingo credentials could not be opened securely. Check Settings.' }; }
  if (!credential) return { ...base, note: 'Tiingo is off or no account-owned key is configured. Other sources remain available.' };
  const cacheKey = `news-v1:${credential.version}:${ticker}:${cutoff}:${lookback}`;
  const id = `${userId}:${cacheKey}`;
  const existing = pending.get(id); if (existing) return existing;
  const selected = credential;
  const request = (async () => {
    const cached = await readDataCache(sb, userId, 'tiingo-news', cacheKey);
    if (cached?.fresh) return { ...cached.payload as unknown as ReferenceFeed, cached: true };
    const start = new Date(Date.parse(`${cutoff}T00:00:00Z`) - lookback * 86400000).toISOString();
    try {
      const q = new URLSearchParams({ tickers: ticker.toLowerCase(), startDate: start.slice(0, 10), endDate: cutoff, limit: '20' });
      const response = await tiingoRequest(`/tiingo/news?${q}`, selected);
      if (!response.ok) { await response.body?.cancel(); return { ...base, httpStatus: response.status, note: `Tiingo unavailable (HTTP ${response.status}). ${response.status===403?'Your Tiingo account may not have News API permission. ':''}No retry or access bypass; other sources remain usable.` }; }
      const reader=response.body?.getReader();if(!reader)throw new Error('Empty response');
      const chunks:Uint8Array[]=[];let size=0;
      try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>500000)throw new Error('Oversized response');chunks.push(part.value);}}finally{await reader.cancel();}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      const text=new TextDecoder().decode(bytes);
      const items = tiingoReferences(JSON.parse(text), ticker, start, new Date().toISOString());
      const result: ReferenceFeed = { ...base, status: items.length ? 'available' : 'unavailable', items };
      await writeDataCache(sb, userId, 'tiingo-news', cacheKey, result, 1800000);
      return result;
    } catch { return { ...base, note: 'Tiingo news unavailable or malformed; no values invented and no retry made.' }; }
  })().finally(() => pending.delete(id));
  if (pending.size < 100) pending.set(id, request);
  return request;
}