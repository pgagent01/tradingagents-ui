import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { secCik, secFacts, secSubmissions, yahooNewsSearch } from '@/lib/stock-data.server';
import { filingEvents, fundamentalEvidence, yahooHeadlines, type FundamentalEvidence, type NewsEvidence } from '@/lib/research-evidence';

function windowStart(analysisDate: string, lookbackDays: number) {
  return new Date(Date.parse(`${analysisDate}T00:00:00Z`) - lookbackDays * 86400000).toISOString().slice(0, 10);
}
/** SEC filings work for any date; Yahoo headlines are current-only to avoid look-ahead and unverifiable history. */
export async function getNewsEvidence(sb: EvidenceClient, userId: string, ticker: string, analysisDate: string, lookbackDays: number, today = new Date().toISOString().slice(0, 10)): Promise<NewsEvidence> {
  const start = windowStart(analysisDate, lookbackDays); const key = `v2:${ticker}:${analysisDate}:${lookbackDays}`;
  const cached = await readDataCache(sb, userId, 'news-evidence', key); const saved = cached?.payload as NewsEvidence | undefined;
  if (cached?.fresh && saved?.cutoff) return { ...saved, cached: true };
  const notes: string[] = []; let filings: NewsEvidence['filings'] = []; let filingsSource: string | null = null; let headlines: NewsEvidence['headlines'] = []; let headlinesSource: string | null = null;
  try { const cik = await secCik(ticker); if (cik) { filings = filingEvents(await secSubmissions(cik), analysisDate, start); filingsSource = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}`; } else notes.push('No SEC registrant found for this ticker (non-US or non-SEC listing); filing events unavailable.'); }
  catch { notes.push('SEC EDGAR filing index temporarily unavailable.'); }
  if (analysisDate === today) {
    try { headlines = yahooHeadlines(await yahooNewsSearch(ticker), `${analysisDate}T23:59:59.999Z`, `${start}T00:00:00.000Z`); headlinesSource = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/news/`; if (!headlines.length) notes.push('Yahoo Finance returned no headlines inside the lookback window.'); }
    catch { notes.push('Yahoo Finance headline search temporarily unavailable.'); }
  } else notes.push('Headline search omitted for a historical analysis date: the free Yahoo feed only returns current headlines. SEC filings are filtered by filing date.');
  notes.push('Yahoo returns a bounded recent set of headlines, not an exhaustive news census; article bodies were not retrieved.');
  notes.push('Direct social-media posts are unavailable: no social feed is connected. Headlines, GDELT news tone and Polymarket are proxies, not measured social sentiment.');
  const feed: NewsEvidence = { status: filings.length && headlines.length ? 'available' : filings.length || headlines.length ? 'partial' : 'unavailable', cutoff: analysisDate, windowStart: start, fetchedAt: new Date().toISOString(), cached: false, filings, filingsSource, headlines, headlinesSource, notes };
  if (feed.status !== 'unavailable') await writeDataCache(sb, userId, 'news-evidence', key, feed, analysisDate === today ? 30 * 60 * 1000 : 7 * 86400000);
  else if (saved?.cutoff) return { ...saved, cached: true, notes: [...saved.notes, `Stale snapshot from ${saved.fetchedAt}; refresh unavailable.`] };
  return feed;
}
export async function getFundamentalEvidence(sb: EvidenceClient, userId: string, ticker: string, analysisDate: string): Promise<FundamentalEvidence | null> {
  const key = `v5:${ticker}:${analysisDate}`;
  const cached = await readDataCache(sb, userId, 'sec-fundamentals', key); const saved = cached?.payload as FundamentalEvidence | undefined;
  if (cached?.fresh && saved?.cutoff) return { ...saved, cached: true };
  try {
    const raw = await secFacts(ticker); if (!raw) return null;
    const evidence = fundamentalEvidence(raw, analysisDate);
    if (evidence.status === 'available') await writeDataCache(sb, userId, 'sec-fundamentals', key, evidence, 12 * 3600 * 1000);
    return evidence;
  } catch { return saved?.cutoff ? { ...saved, cached: true, note: `${saved.note} Stale snapshot from ${saved.fetchedAt}; refresh unavailable.` } : null; }
}
