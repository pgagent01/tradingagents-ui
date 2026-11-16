import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';
import { cacheStaleAfterFiling, industrySnapshotDue, latestFilingDate, tickerKeyPatterns } from '@/lib/data-refresh';

const FILING_PROVIDERS = ['sec-fundamentals', 'sec-earnings', 'news-evidence', 'valuation-peers'];

export const Route = createFileRoute('/api/public/jobs/refresh-data')({
  server: { handlers: { POST: async ({ request }) => {
    const authFailure = await authenticateCronRequest(request);
    if (authFailure) return authFailure;
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { secCik, secSubmissions } = await import('@/lib/stock-data.server');
    const { INDUSTRY_NORMS_DATE } = await import('@/lib/valuation/industry-norms');
    const now = new Date(); const since = new Date(now.getTime() - 30 * 86400000).toISOString();
    const [w, r] = await Promise.all([
      db.from('watchlist_items').select('ticker,user_id'),
      db.from('research_runs').select('ticker,user_id').gte('created_at', since).limit(500),
    ]);
    const watch = new Set((w.data ?? []).map(x => x.ticker.toUpperCase()));
    const tickers = [...new Set([...watch, ...(r.data ?? []).map(x => x.ticker.toUpperCase())])].filter(t => /^[A-Z.\-]{1,10}$/.test(t)).slice(0, 40);
    let checked = 0, refreshed = 0, failures = 0;
    for (const ticker of tickers) {
      try {
        const cik = await secCik(ticker); if (!cik) continue;
        checked++;
        const filed = latestFilingDate(await secSubmissions(cik));
        if (!filed) continue;
        for (const pattern of tickerKeyPatterns(ticker)) {
          const rows = await db.from('research_data_cache').select('user_id,provider,cache_key,fetched_at').in('provider', FILING_PROVIDERS).like('cache_key', pattern).gt('expires_at', now.toISOString()).limit(200);
          for (const row of (rows.data ?? []).filter(x => cacheStaleAfterFiling(x.fetched_at, filed))) {
            await db.from('research_data_cache').update({ expires_at: now.toISOString() }).eq('user_id', row.user_id).eq('provider', row.provider).eq('cache_key', row.cache_key);
            refreshed++;
          }
        }
        await new Promise(res => setTimeout(res, 150)); // stay within SEC fair-access rate
      } catch { failures++; }
    }
    // Analyst views for watchlisted stocks: expire entries older than 20h so the next view refreshes them.
    let analyst = 0;
    for (const ticker of watch) for (const pattern of tickerKeyPatterns(ticker)) {
      const res = await db.from('research_data_cache').update({ expires_at: now.toISOString() }).eq('provider', 'analyst-views').like('cache_key', pattern).lt('fetched_at', new Date(now.getTime() - 20 * 3600000).toISOString()).gt('expires_at', now.toISOString()).select('cache_key');
      analyst += res.data?.length ?? 0;
    }
    const today = now.toISOString().slice(0, 10);
    const due = industrySnapshotDue(INDUSTRY_NORMS_DATE, today);
    await db.from('data_refresh_runs').insert([
      { source: 'sec-filings', status: failures === 0 ? 'ok' : failures < checked ? 'partial' : 'failed', checked, refreshed, message: `${refreshed} cached figure sets marked stale after new filings${failures ? `; ${failures} lookups failed` : ''}.` },
      { source: 'analyst-views', status: 'ok', checked: watch.size, refreshed: analyst, message: 'Watchlist analyst views older than 20 hours refresh on next view.' },
      { source: 'industry-norms', status: due ? 'update_due' : 'ok', checked: 1, refreshed: 0, message: due ? `Damodaran snapshot ${INDUSTRY_NORMS_DATE} is older than this year's January release; a new dated snapshot should be added.` : `Damodaran snapshot ${INDUSTRY_NORMS_DATE} is current.` },
    ]);
    return Response.json({ success: true, checked, refreshed, analyst, industryDue: due });
  } } },
});
