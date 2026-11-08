import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
export const getValuation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: { ticker: string }) => z.object({ ticker: z.string().regex(/^[A-Z0-9][A-Z0-9.^-]{0,14}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getComparables } = await import('./comparables.server');
    const { getFundamentalEvidence } = await import('@/lib/research-evidence.server');
    const { valuationEvidence } = await import('./engine');
    const today = new Date().toISOString().slice(0,10);
    const f = await getFundamentalEvidence(context.supabase, context.userId, data.ticker, today);
    const comps = await getComparables(context.supabase, context.userId, data.ticker, today);
    return valuationEvidence(f, comps, null, today);
  });