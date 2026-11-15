import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { DATA_PROVIDERS } from './access-rules';

export const getMyDataProviders = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { dataProviderSettings } = await import('./data-provider-settings.server');
  return dataProviderSettings(context.supabase, context.userId);
});
export const setMyDataProvider = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: { provider: string; enabled: boolean }) => {
  const provider = DATA_PROVIDERS.find(p => p === input.provider);
  if (!provider || typeof input.enabled !== 'boolean') throw new Error('Choose a data provider and an on/off setting.');
  return { provider, enabled: input.enabled };
}).handler(async ({ data, context }) => {
  const { saveDataProviderSetting } = await import('./data-provider-settings.server');
  await saveDataProviderSetting(context.supabase, context.userId, data.provider, data.enabled);
  return { provider: data.provider, enabled: data.enabled };
});