import { decryptSecret } from './crypto.server';
import { dataProviderEnabled, suppliedCredentialOwner } from './data-provider-settings.server';
import type { EvidenceClient } from './data-cache.server';
import { object, numeric } from './stock-data';

type MassiveCredential = { key: string; gateway: boolean };
export async function ownMassiveCredential(sb: EvidenceClient, userId: string): Promise<MassiveCredential | null> {
  if (!await dataProviderEnabled(sb, userId, 'massive')) return null;
  const row = await sb.from('user_api_keys').select('key_ciphertext,updated_at').eq('user_id', userId).eq('provider', 'massive').maybeSingle();
  if (row.error) throw new Error('Massive credentials unavailable.');
  if (row.data) return { key: await decryptSecret(row.data.key_ciphertext, process.env['API_KEY_ENCRYPTION_SECRET']), gateway: false };
  if (!await suppliedCredentialOwner(sb, userId)) return null;
  const key = process.env['UDC_MASSIVE_API_KEY'];
  return key ? { key, gateway: true } : null;
}
async function massiveRead(path: string, credential: MassiveCredential) {
  const gatewayKey = process.env['LOVABLE_API_KEY'];
  if (credential.gateway && !gatewayKey) throw new Error('Massive connection unavailable.');
  const response = await fetch(`${credential.gateway ? 'https://connector-gateway.lovable.dev/udc_massive' : 'https://api.massive.com'}${path}`, {
    headers: credential.gateway ? { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': credential.key } : { Authorization: `Bearer ${credential.key}` },
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (!response.ok) {
    // Never log raw response text: providers can echo credentials. Only expose a bounded error code.
    const body = object(await response.json().catch(() => null));
    const code = typeof body['status'] === 'string' && /^[A-Z_]{1,40}$/.test(body['status']) ? body['status'] : 'UNAVAILABLE';
    console.warn('Massive read failed', response.status, code);
    return { ok: false as const, httpStatus: response.status, code, body: object(null) };
  }
  return { ok: true as const, httpStatus: response.status, code: 'OK', body: object(await response.json()) };
}
export async function validateMassiveKey(key: string) {
  try {
    const response = await massiveRead('/v3/reference/tickers/AAPL', { key, gateway: false });
    const valid = response.ok && object(response.body['results'])['ticker'] === 'AAPL';
    return { provider: 'massive' as const, valid, message: valid ? 'Massive reference access verified. Other endpoints and usage rights depend on your plan.' : `Massive reference access not verified (HTTP ${response.httpStatus}). No retry was made.` };
  } catch { return { provider: 'massive' as const, valid: false, message: 'Massive could not be reached. No retry was made.' }; }
}
/** Read-only access pilot. Do not persist, export or route provider data to LLMs before rights review. */
export async function checkMassiveConnection(sb: EvidenceClient, userId: string, ticker: string) {
  const credential = await ownMassiveCredential(sb, userId);
  if (!credential) return { valid: false, message: 'Massive is off or no account-owned key is configured.' };
  try {
    const reference = await massiveRead(`/v3/reference/tickers/${encodeURIComponent(ticker)}`, credential);
    const company = object(reference.body['results']);
    if (!reference.ok || company['ticker'] !== ticker) return { valid: false, message: `Massive company identity not verified (HTTP ${reference.httpStatus}). No retry was made.` };
    const daily = await massiveRead(`/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev?adjusted=true`, credential);
    const rows = daily.body['results'];
    const bar = object(Array.isArray(rows) ? rows[0] : null);
    const timestamp = numeric(bar['t']);
    const close = numeric(bar['c']);
    const now = Date.now();
    const validBar = daily.ok && daily.body['ticker'] === ticker && bar['T'] === ticker && close !== null && close > 0 && timestamp !== null && timestamp > 0 && timestamp <= now && now - timestamp < 7 * 86400000;
    return { valid: true, referenceHttpStatus: reference.httpStatus, dailyHttpStatus: daily.httpStatus, dailyAvailable: validBar,
      message: `${ticker}: Massive reference access verified; previous-day prices ${validBar ? 'verified' : 'not verified'}. This is an access check, not a live quote. Storage, report/export and AI use remain pending a plan-rights review.` };
  } catch { return { valid: false, message: 'Massive check did not complete. No retry was made.' }; }
}