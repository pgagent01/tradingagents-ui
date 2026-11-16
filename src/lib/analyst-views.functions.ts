import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
export const getMyAnalystViews = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: { ticker: string }) => z.object({ ticker: z.string().regex(/^[A-Z0-9][A-Z0-9.^-]{0,14}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getAnalystViews } = await import('./analyst-views.server');
    return getAnalystViews(context.supabase, context.userId, data.ticker, new Date().toISOString().slice(0, 10));
  });
