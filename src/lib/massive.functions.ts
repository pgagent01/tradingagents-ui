import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validateTicker } from './access-rules';

export const checkMyMassiveConnection = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ticker: string }) => ({ ticker: validateTicker(input.ticker) }))
  .handler(async ({ data, context }) => {
    const { checkMassiveConnection } = await import('./massive.server');
    return checkMassiveConnection(context.supabase, context.userId, data.ticker);
  });