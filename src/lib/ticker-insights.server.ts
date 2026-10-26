import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { cachedStockData } from '@/lib/stock-service.server';
import { secFacts } from '@/lib/stock-data.server';
import { piotroskiScore, marketSensitivity, agentConsensus, latestPeriodicFiling } from '@/lib/ticker-insights';

export async function tickerInsights(sb: SupabaseClient<Database>, userId: string, tickers: string[]) {
  const [bench, reports] = await Promise.all([
    cachedStockData(sb, userId, 'SPY', '1Y', 'annual').catch(() => null),
    sb.from('research_reports').select('ticker,recommendation,price_target,created_at,research_runs!inner(user_id,is_demo)').eq('research_runs.user_id', userId).in('ticker', tickers).order('created_at', { ascending: false }),
  ]);
  const rows = (reports.data ?? []).filter(r => !(r.research_runs as unknown as { is_demo: boolean }).is_demo);
  return Promise.all(tickers.map(async ticker => {
    const [stock, facts] = await Promise.all([
      cachedStockData(sb, userId, ticker, '1Y', 'annual').catch(() => null),
      secFacts(ticker).catch(() => null),
    ]);
    const own = rows.filter(r => r.ticker === ticker);
    const filing = facts ? latestPeriodicFiling(facts) : { date: null, form: null };
    const ratio = (prefix: string) => stock?.ratios.find(r => r.label.startsWith(prefix))?.value ?? null;
    return {
      ticker, company: stock?.company ?? ticker, price: stock?.price ?? null, marketCap: stock?.marketCap ?? null,
      quoteSource: stock?.quoteSource ?? null, financialSource: stock?.financialSource ?? null, financialDate: stock?.financialDate ?? null, fetchedAt: stock?.fetchedAt ?? null,
      pe: ratio('P/E'), ps: ratio('P/S'), evEbitda: ratio('EV'), netMargin: ratio('Net margin'),
      piotroski: facts ? piotroskiScore(facts) : null,
      sensitivity: stock && bench ? marketSensitivity(stock.candles, bench.candles) : { beta: null, correlation: null, days: 0 },
      consensus: agentConsensus(own.map(r => r.recommendation)),
      latestRecommendation: own[0]?.recommendation ?? null, previousRecommendation: own[1]?.recommendation ?? null,
      latestTarget: own[0]?.price_target === undefined || own[0]?.price_target === null ? null : Number(own[0].price_target),
      lastReportDate: own[0]?.created_at ?? null, lastFiling: filing.date, lastFilingForm: filing.form,
    };
  }));
}
