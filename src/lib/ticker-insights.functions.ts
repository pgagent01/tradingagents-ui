import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { validTicker } from '@/lib/stock-data';

const tickerSchema = z.string().trim().toUpperCase().refine(validTicker, 'Enter a valid ticker');

export const compareTickers = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ tickers: z.array(tickerSchema).min(1).max(4) }))
  .handler(async ({ data, context }) => {
    const { tickerInsights } = await import('@/lib/ticker-insights.server');
    return tickerInsights(context.supabase, context.userId, [...new Set(data.tickers)]);
  });

export const getWatchlist = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: items, error } = await context.supabase.from('watchlist_items').select('*').eq('user_id', context.userId).order('created_at');
  if (error) throw new Error('Watchlist unavailable.');
  if (!items?.length) return [];
  const { tickerInsights } = await import('@/lib/ticker-insights.server');
  const { detectAnomalies } = await import('@/lib/ticker-insights');
  const insights = await tickerInsights(context.supabase, context.userId, items.map(i => i.ticker));
  return items.map(item => {
    const x = insights.find(i => i.ticker === item.ticker)!;
    return { ...item, insight: x, anomalies: detectAnomalies({ latestRec: x.latestRecommendation, previousRec: x.previousRecommendation, price: x.price, target: x.latestTarget, thresholdPct: Number(item.valuation_threshold_pct), lastFiling: x.lastFiling, lastFilingForm: x.lastFilingForm, lastReportDate: x.lastReportDate, sentiment: item.notify_sentiment, earnings: item.notify_earnings }) };
  });
});

export const addWatchlistItem = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ ticker: tickerSchema, threshold: z.number().min(1).max(100).default(15) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('watchlist_items').upsert({ user_id: context.userId, ticker: data.ticker, valuation_threshold_pct: data.threshold }, { onConflict: 'user_id,ticker' });
    if (error) throw new Error('Could not add ticker.');
    return { ok: true };
  });

export const updateWatchlistItem = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), threshold: z.number().min(1).max(100).optional(), sentiment: z.boolean().optional(), earnings: z.boolean().optional(), remove: z.boolean().optional() }))
  .handler(async ({ data, context }) => {
    const q = context.supabase.from('watchlist_items');
    const { error } = data.remove
      ? await q.delete().eq('id', data.id).eq('user_id', context.userId)
      : await q.update({ ...(data.threshold !== undefined && { valuation_threshold_pct: data.threshold }), ...(data.sentiment !== undefined && { notify_sentiment: data.sentiment }), ...(data.earnings !== undefined && { notify_earnings: data.earnings }) }).eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error('Could not update watchlist.');
    return { ok: true };
  });
