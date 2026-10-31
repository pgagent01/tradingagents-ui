import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getNvidiaKeys = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('user_api_keys').select('key_ciphertext').eq('user_id', context.userId).eq('provider', 'nvidia').maybeSingle();
  if (error) throw new Error('NVIDIA key settings unavailable.');
  if (!data) return { count: 0, active: 0 };
  const { openNvidiaCredentials } = await import('@/lib/nvidia-credentials.server');
  const pool = await openNvidiaCredentials(data.key_ciphertext, process.env['API_KEY_ENCRYPTION_SECRET']);
  return { count: pool.keys.length, active: pool.active };
});

export const updateNvidiaKeys = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: { apiKey?: string; active?: number }) => {
  if (input.apiKey !== undefined && (!input.apiKey.trim().startsWith('nvapi-') || input.apiKey.trim().length < 8)) throw new Error('Enter a NVIDIA API key.');
  if (input.active !== undefined && (!Number.isInteger(input.active) || input.active < 0 || input.active > 2)) throw new Error('Select a configured key.');
  return input;
}).handler(async ({ data, context }) => {
  const { data: row, error } = await context.supabase.from('user_api_keys').select('key_ciphertext').eq('user_id', context.userId).eq('provider', 'nvidia').maybeSingle();
  if (error) throw new Error('NVIDIA credentials unavailable.');
  const { openNvidiaCredentials, sealNvidiaCredentials } = await import('@/lib/nvidia-credentials.server');
  const secret = process.env['API_KEY_ENCRYPTION_SECRET'];
  const pool = row ? await openNvidiaCredentials(row.key_ciphertext, secret) : { version: 1 as const, active: 0, keys: [] as string[] };
  if (data.apiKey) {
    if (pool.keys.includes(data.apiKey.trim())) throw new Error('That key is already configured.');
    if (pool.keys.length >= 3) throw new Error('Three NVIDIA keys are already configured.');
    pool.keys.push(data.apiKey.trim());
  }
  if (data.active !== undefined) pool.active = data.active;
  if (!pool.keys[pool.active]) throw new Error('Select a configured key.');
  const saved = await context.supabase.from('user_api_keys').upsert({ user_id: context.userId, provider: 'nvidia', key_ciphertext: await sealNvidiaCredentials(pool, secret), key_hint: 'Configured', updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider' });
  if (saved.error) throw new Error('NVIDIA key settings could not be saved.');
  return { count: pool.keys.length, active: pool.active };
});