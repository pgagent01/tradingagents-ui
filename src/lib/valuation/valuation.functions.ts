import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { valuationPreferencesSchema } from './preferences';
import { readValuationPreferences,saveValuationPreferences,customPeers } from './preferences.server';
export const getValuationPreferences=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:{ticker:string})=>z.object({ticker:z.string().regex(/^[A-Z0-9][A-Z0-9.^-]{0,14}$/)}).parse(input)).handler(({data,context})=>readValuationPreferences(context.supabase,context.userId,data.ticker));
export const setValuationPreferences=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({ticker:z.string().regex(/^[A-Z0-9][A-Z0-9.^-]{0,14}$/),preferences:valuationPreferencesSchema}).parse(input)).handler(async({data,context})=>{await saveValuationPreferences(context.supabase,context.userId,data.ticker,data.preferences);return {saved:true};});
export const getValuation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: { ticker: string }) => z.object({ ticker: z.string().regex(/^[A-Z0-9][A-Z0-9.^-]{0,14}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getComparables } = await import('./comparables.server');
    const { getFundamentalEvidence } = await import('@/lib/research-evidence.server');
    const { valuationEvidence } = await import('./engine');
    const { marketCapOrDerived } = await import('./financial-inputs');
    const { getFredEvidence } = await import('@/lib/fred.server');
    const { cachedStockData } = await import('@/lib/stock-service.server');
    const { valuationRates } = await import('./rates.server');
    const today = new Date().toISOString().slice(0,10);
    const f = await getFundamentalEvidence(context.supabase, context.userId, data.ticker, today);
    const preferences=await readValuationPreferences(context.supabase,context.userId,data.ticker);
    const comps = await customPeers(await getComparables(context.supabase, context.userId, data.ticker, today),data.ticker,today,preferences);
    const stock=await cachedStockData(context.supabase,context.userId,data.ticker,'1Y','annual').catch(()=>null);
    const macro=await getFredEvidence(context.supabase,context.userId,today,process.env['API_KEY_ENCRYPTION_SECRET'],new AbortController().signal);
    const rates=await valuationRates(context.supabase,context.userId,today,macro,stock);
    return valuationEvidence(f, comps, stock?.price??null, today,{marketCap:marketCapOrDerived(stock?.marketCap,stock?.price,f?.valuationBalance?.shares?.value),rates,overrides:preferences.overrides});
  });