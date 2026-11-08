import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
export const getValuation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: { ticker: string }) => z.object({ ticker: z.string().regex(/^[A-Z0-9][A-Z0-9.^-]{0,14}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getComparables } = await import('./comparables.server');
    const { getFundamentalEvidence } = await import('@/lib/research-evidence.server');
    const { valuationEvidence } = await import('./engine');
    const { getFredEvidence } = await import('@/lib/fred.server');
    const { cachedStockData } = await import('@/lib/stock-service.server');
    const { valuationRates } = await import('./rates.server');
    const today = new Date().toISOString().slice(0,10);
    const f = await getFundamentalEvidence(context.supabase, context.userId, data.ticker, today);
    const comps = await getComparables(context.supabase, context.userId, data.ticker, today);
    const stock=await cachedStockData(context.supabase,context.userId,data.ticker,'1Y','annual').catch(()=>null);
    const macro=await getFredEvidence(context.supabase,context.userId,today,process.env['API_KEY_ENCRYPTION_SECRET'],new AbortController().signal);
    const rates=await valuationRates(context.supabase,context.userId,today,macro,stock);
    return valuationEvidence(f, comps, stock?.price??null, today,{marketCap:stock?.marketCap??null,rates});
  });