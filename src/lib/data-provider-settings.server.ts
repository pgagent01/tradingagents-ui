import { DATA_PROVIDERS, type CredentialProvider } from './access-rules';
import { readDataCache, writeDataCache, type EvidenceClient } from './data-cache.server';

export async function suppliedCredentialOwner(sb: EvidenceClient, userId: string) {
  const { data, error } = await sb.auth.getUser();
  if (error || data.user?.id !== userId) throw new Error('Account authorization could not be verified.');
  return data.user.email?.toLowerCase() === 'gprithvi@gmail.com';
}
export async function dataProviderEnabled(sb: EvidenceClient, userId: string, provider: CredentialProvider) {
  const owner = await suppliedCredentialOwner(sb, userId);
  const saved = await readDataCache(sb, userId, 'data-provider-settings', provider, true);
  const payload = saved?.payload;
  if (saved) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'enabled' in payload && typeof payload['enabled'] === 'boolean') return payload['enabled'];
    throw new Error('Saved provider setting is invalid. Optional sources remain off.');
  }
  return owner;
}
export async function dataProviderSettings(sb: EvidenceClient, userId: string) {
  const owner = await suppliedCredentialOwner(sb, userId);
  const keys = await sb.from('user_api_keys').select('provider').eq('user_id', userId);
  if (keys.error) throw new Error('Provider credentials could not be checked.');
  return Promise.all(DATA_PROVIDERS.map(async provider => ({
    provider, enabled: await dataProviderEnabled(sb, userId, provider),
    configured: (keys.data ?? []).some(k => k.provider === provider) || (owner && (provider === 'firecrawl' ? Boolean(process.env['FIRECRAWL_API_KEY']) : false)),
  })));
}
export async function saveDataProviderSetting(sb: EvidenceClient, userId: string, provider: CredentialProvider, enabled: boolean) {
  if (enabled && !(await dataProviderSettings(sb, userId)).some(p => p.provider === provider && p.configured)) throw new Error('Save your own provider key before enabling it.');
  if (!await writeDataCache(sb, userId, 'data-provider-settings', provider, { enabled }, 10 * 365 * 86400000)) throw new Error('Provider setting could not be saved.');
}