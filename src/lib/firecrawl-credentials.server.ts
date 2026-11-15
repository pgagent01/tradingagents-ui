import { decryptSecret } from './crypto.server';
import type { EvidenceClient } from './data-cache.server';
import { dataProviderEnabled } from './data-provider-settings.server';

export type FirecrawlCredential = { key: string; version: string; gateway?: boolean };

/** Caller-owned keys take precedence; a configured but broken key never falls back. */
export async function firecrawlCredential(sb: EvidenceClient, userId: string): Promise<FirecrawlCredential | null> {
  const { data, error } = await sb.auth.getUser();
  if (error || data.user?.id !== userId) throw new Error('Firecrawl account authorization could not be verified.');
  if (!await dataProviderEnabled(sb, userId, 'firecrawl')) return null;
  const row = await sb.from('user_api_keys').select('key_ciphertext,updated_at').eq('user_id', userId).eq('provider', 'firecrawl').maybeSingle();
  if (row.error) throw new Error('Firecrawl credential availability could not be checked.');
  if (row.data) {
    try {
      return { key: await decryptSecret(row.data.key_ciphertext, process.env['API_KEY_ENCRYPTION_SECRET']), version: `personal:${row.data.updated_at}` };
    } catch { throw new Error('Stored Firecrawl key cannot be opened securely. Save it again in Settings.'); }
  }
  if (data.user.email?.toLowerCase() !== 'gprithvi@gmail.com') return null;
  const key = process.env['FIRECRAWL_API_KEY'];
  return key ? { key, version: 'owner-project-v2', gateway: key.startsWith('lovc_') } : null;
}

/** Read-only credit check; never spends search/scrape credits or returns credentials. */
export async function validateFirecrawlKey(key: string) {
  try {
    const response = await fetch('https://api.firecrawl.dev/v2/team/credit-usage', {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000), redirect: 'error',
    });
    const body = response.ok ? await response.json() as { success?: boolean } : null;
    await response.body?.cancel().catch(() => {});
    const valid = response.ok && body?.success === true;
    return { provider: 'firecrawl' as const, valid, message: valid
      ? 'Firecrawl key accepted. Search coverage and available credits are not guaranteed.'
      : `Firecrawl key not verified (HTTP ${response.status}). Check your key, account access and credits; no retry was made.` };
  } catch { return { provider: 'firecrawl' as const, valid: false, message: 'Could not reach Firecrawl. No automatic retry was made.' }; }
}