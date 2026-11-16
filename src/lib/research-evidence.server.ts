import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { yahooSymbol } from '@/lib/stock-data';
import type { Headline } from '@/lib/research-evidence';
import { secCik, secFacts, secSubmissions, yahooNewsSearch } from '@/lib/stock-data.server';
import { filingEvents, fundamentalEvidence, isRelevantHeadline, mergeHeadlines, relevanceTerms, rssHeadlines, yahooHeadlines, type FundamentalEvidence, type NewsEvidence } from '@/lib/research-evidence';
import { groupNewsEvents, type NewsSourceState } from '@/lib/news-quality';
import { COMPANIES } from '@/lib/companies';

function windowStart(analysisDate: string, lookbackDays: number) {
  return new Date(Date.parse(`${analysisDate}T00:00:00Z`) - lookbackDays * 86400000).toISOString().slice(0, 10);
}
/** SEC filings work for any date; Yahoo headlines are current-only to avoid look-ahead and unverifiable history. */
async function rssText(url: string) { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (research app)', Accept: 'application/rss+xml, application/xml' }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(`RSS ${r.status}`); return (await r.text()).slice(0, 500000); }
const pendingNews = new Map<string, Promise<NewsEvidence>>();
export function getNewsEvidence(sb: EvidenceClient, userId: string, ticker: string, analysisDate: string, lookbackDays: number, today = new Date().toISOString().slice(0, 10)): Promise<NewsEvidence> {
  const id = `${userId}:${ticker}:${analysisDate}:${lookbackDays}:${today}`;
  const pending = pendingNews.get(id); if (pending) return pending;
  const result = loadNewsEvidence(sb,userId,ticker,analysisDate,lookbackDays,today).finally(() => pendingNews.delete(id));
  if (pendingNews.size < 100) pendingNews.set(id,result);
  return result;
}
async function loadNewsEvidence(sb: EvidenceClient, userId: string, ticker: string, analysisDate: string, lookbackDays: number, today: string): Promise<NewsEvidence> {
  const start = windowStart(analysisDate, lookbackDays); const key = `v5:${ticker}:${analysisDate}:${lookbackDays}`;
  const cached = await readDataCache(sb, userId, 'news-evidence', key); const saved = cached?.payload as NewsEvidence | undefined;
  if (cached?.fresh && saved?.cutoff) return { ...saved, cached: true };
  const notes: string[] = []; let filings: NewsEvidence['filings'] = []; let filingsSource: string | null = null; let headlines: NewsEvidence['headlines'] = []; let headlinesSource: string | null = null;
  let company: string | null = COMPANIES.find(c => c.ticker === ticker)?.name ?? null; const headlineCounts: Record<string, number> = {};
  const sourceStates: Record<string, NewsSourceState> = {};
  let sourceEvents: NonNullable<NewsEvidence['events']> = [];
  try { const cik = await secCik(ticker); if (cik) { const subs = await secSubmissions(cik); company = typeof (subs as Record<string, unknown>)?.['name'] === 'string' ? String((subs as Record<string, unknown>)['name']) : null; filings = filingEvents(subs, analysisDate, start); filingsSource = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}`; } else notes.push('No SEC registrant found for this ticker (non-US or non-SEC listing); filing events unavailable.'); }
  catch { notes.push('SEC EDGAR filing index temporarily unavailable.'); }
  if (analysisDate === today) {
    const cutoffIso = new Date(Math.min(Date.now(),Date.parse(`${analysisDate}T23:59:59.999Z`))).toISOString(), startIso = `${start}T00:00:00.000Z`; const terms = relevanceTerms(ticker, company);
    const sources: [string, Promise<Headline[]>][] = [
      ['Yahoo Finance search', yahooNewsSearch(ticker).then(r => yahooHeadlines(r, cutoffIso, startIso).filter(h => isRelevantHeadline(h.title,terms)))],
      ['Yahoo Finance RSS', rssText(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(yahooSymbol(ticker))}&region=US&lang=en-US`).then(x => rssHeadlines(x, cutoffIso, startIso, 'Yahoo Finance', terms))],
      ['Google News RSS', rssText(`https://news.google.com/rss/search?q=${encodeURIComponent(`${company ? `"${terms.name ?? company}"` : ticker} stock when:${Math.min(lookbackDays, 30)}d`)}&hl=en-US&gl=US&ceid=US:en`).then(x => rssHeadlines(x, cutoffIso, startIso, 'Google News', terms))],
    ];
    const groups: Headline[][] = [];
    const results = await Promise.allSettled(sources.map(([,p]) => p));
    for (const [i,result] of results.entries()) {
      const name = sources[i]?.[0]; if (!name) continue;
      if (result.status === 'fulfilled') { const h = result.value.map(h => ({...h,feed:name})); headlineCounts[name] = h.length; sourceStates[name] = {status:h.length?'available':'empty',count:h.length}; groups.push(h); }
      else { headlineCounts[name] = 0; sourceStates[name] = {status:'failed',count:0,reason:'Retrieval failed or timed out.'}; notes.push(`${name} temporarily unavailable.`); }
    }
    const events = groupNewsEvents(groups.flat());
    headlines = mergeHeadlines(groups); headlinesSource = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/news/`;
    if (events.length) notes.push(`${events.length} conservatively grouped events; repeated coverage is not independent corroboration.`);
    if (!headlines.length) notes.push('No relevant company headlines were found inside the lookback window from any connected feed.');
    // Preserve contributing coverage, including feed-provided excerpts, before display deduplication.
    sourceEvents = events;
  } else { for (const name of ['Yahoo Finance search','Yahoo Finance RSS','Google News RSS']) sourceStates[name] = {status:'historical_unavailable',count:0}; notes.push('Headline feeds omitted for a historical analysis date: the free Yahoo and Google feeds only return recent headlines. SEC filings (and GDELT, when available) are filtered by date.'); }
  notes.push('Bounded recent feeds are not an exhaustive news census. Yahoo feed summaries, when supplied, are partial publisher-feed excerpts, not retrieved full articles. Event categories are heuristic; publisher counts do not prove independent corroboration.');
  notes.push('Direct social-media posts are unavailable: no social feed is connected. Headlines, GDELT news tone and Polymarket are proxies, not measured social sentiment.');
  const feed: NewsEvidence = { status: filings.length && headlines.length ? 'available' : filings.length || headlines.length ? 'partial' : 'unavailable', cutoff: analysisDate, windowStart: start, fetchedAt: new Date().toISOString(), cached: false, filings, filingsSource, headlines, headlinesSource, notes, headlineCounts,sourceStates,events:sourceEvents };
  const headlineRefreshFailed = analysisDate === today && Object.values(sourceStates).some(s => s.status === 'failed') && !headlines.length;
  if (saved?.headlines.length && headlineRefreshFailed) return { ...saved, cached: true,sourceStates, notes: [...saved.notes, `Stale snapshot from ${saved.fetchedAt}; headline refresh unavailable. Original evidence time preserved.`] };
  if (feed.status !== 'unavailable') {const stored=await writeDataCache(sb, userId, 'news-evidence', key, feed, analysisDate === today ? 30 * 60 * 1000 : 7 * 86400000);if(!stored)feed.notes.push('Evidence retrieved, but shared cache storage failed; later requests may fetch again.');}
  else if (saved?.cutoff && Object.values(sourceStates).some(s => s.status === 'failed')) return { ...saved, cached: true,sourceStates, notes: [...saved.notes, `Stale snapshot from ${saved.fetchedAt}; refresh unavailable.`] };
  return feed;
}
export async function getFundamentalEvidence(sb: EvidenceClient, userId: string, ticker: string, analysisDate: string): Promise<FundamentalEvidence | null> {
  const key = `v13:${ticker}:${analysisDate}`;
  const cached = await readDataCache(sb, userId, 'sec-fundamentals', key); const saved = cached?.payload as FundamentalEvidence | undefined;
  if (cached?.fresh && saved?.cutoff) return { ...saved, cached: true };
  try {
    const raw = await secFacts(ticker); if (!raw) return null;
    const evidence = fundamentalEvidence(raw, analysisDate);
    if (evidence.status === 'available') await writeDataCache(sb, userId, 'sec-fundamentals', key, evidence, 12 * 3600 * 1000);
    return evidence;
  } catch { return saved?.cutoff ? { ...saved, cached: true, note: `${saved.note} Stale snapshot from ${saved.fetchedAt}; refresh unavailable.` } : null; }
}
