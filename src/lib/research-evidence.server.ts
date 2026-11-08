import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { yahooSymbol } from '@/lib/stock-data';
import type { Headline } from '@/lib/research-evidence';
import { secCik, secFacts, secSubmissions, yahooNewsSearch } from '@/lib/stock-data.server';
import { filingEvents, fundamentalEvidence, mergeHeadlines, relevanceTerms, rssHeadlines, yahooHeadlines, type FundamentalEvidence, type NewsEvidence } from '@/lib/research-evidence';

function windowStart(analysisDate: string, lookbackDays: number) {
  return new Date(Date.parse(`${analysisDate}T00:00:00Z`) - lookbackDays * 86400000).toISOString().slice(0, 10);
}
/** SEC filings work for any date; Yahoo headlines are current-only to avoid look-ahead and unverifiable history. */
async function rssText(url: string) { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (research app)', Accept: 'application/rss+xml, application/xml' }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(`RSS ${r.status}`); return (await r.text()).slice(0, 500000); }
export async function getNewsEvidence(sb: EvidenceClient, userId: string, ticker: string, analysisDate: string, lookbackDays: number, today = new Date().toISOString().slice(0, 10)): Promise<NewsEvidence> {
  const start = windowStart(analysisDate, lookbackDays); const key = `v3:${ticker}:${analysisDate}:${lookbackDays}`;
  const cached = await readDataCache(sb, userId, 'news-evidence', key); const saved = cached?.payload as NewsEvidence | undefined;
  if (cached?.fresh && saved?.cutoff) return { ...saved, cached: true };
  const notes: string[] = []; let filings: NewsEvidence['filings'] = []; let filingsSource: string | null = null; let headlines: NewsEvidence['headlines'] = []; let headlinesSource: string | null = null;
  let company: string | null = null; const headlineCounts: Record<string, number> = {};
  try { const cik = await secCik(ticker); if (cik) { const subs = await secSubmissions(cik); company = typeof (subs as Record<string, unknown>)?.['name'] === 'string' ? String((subs as Record<string, unknown>)['name']) : null; filings = filingEvents(subs, analysisDate, start); filingsSource = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}`; } else notes.push('No SEC registrant found for this ticker (non-US or non-SEC listing); filing events unavailable.'); }
  catch { notes.push('SEC EDGAR filing index temporarily unavailable.'); }
  if (analysisDate === today) {
    const cutoffIso = `${analysisDate}T23:59:59.999Z`, startIso = `${start}T00:00:00.000Z`; const terms = relevanceTerms(ticker, company);
    const sources: [string, Promise<Headline[]>][] = [
      ['Yahoo Finance search', yahooNewsSearch(ticker).then(r => yahooHeadlines(r, cutoffIso, startIso))],
      ['Yahoo Finance RSS', rssText(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(yahooSymbol(ticker))}&region=US&lang=en-US`).then(x => rssHeadlines(x, cutoffIso, startIso, 'Yahoo Finance', terms))],
      ['Google News RSS', rssText(`https://news.google.com/rss/search?q=${encodeURIComponent(`${company ? `"${terms.name ?? company}"` : ticker} stock when:${Math.min(lookbackDays, 30)}d`)}&hl=en-US&gl=US&ceid=US:en`).then(x => rssHeadlines(x, cutoffIso, startIso, 'Google News', terms))],
    ];
    const groups: Headline[][] = [];
    for (const [name, p] of sources) { try { const h = await p; headlineCounts[name] = h.length; groups.push(h); } catch { headlineCounts[name] = 0; notes.push(`${name} temporarily unavailable.`); } }
    headlines = mergeHeadlines(groups); headlinesSource = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/news/`;
    if (!headlines.length) notes.push('No relevant company headlines were found inside the lookback window from any connected feed.');
  } else notes.push('Headline feeds omitted for a historical analysis date: the free Yahoo and Google feeds only return recent headlines. SEC filings (and GDELT, when available) are filtered by date.');
  notes.push('Headlines come from bounded recent Yahoo and Google News feeds, filtered to items mentioning the company or ticker and deduplicated; this is not an exhaustive news census and article bodies were not retrieved.');
  notes.push('Direct social-media posts are unavailable: no social feed is connected. Headlines, GDELT news tone and Polymarket are proxies, not measured social sentiment.');
  const feed: NewsEvidence = { status: filings.length && headlines.length ? 'available' : filings.length || headlines.length ? 'partial' : 'unavailable', cutoff: analysisDate, windowStart: start, fetchedAt: new Date().toISOString(), cached: false, filings, filingsSource, headlines, headlinesSource, notes, headlineCounts };
  if (feed.status !== 'unavailable') await writeDataCache(sb, userId, 'news-evidence', key, feed, analysisDate === today ? 30 * 60 * 1000 : 7 * 86400000);
  else if (saved?.cutoff) return { ...saved, cached: true, notes: [...saved.notes, `Stale snapshot from ${saved.fetchedAt}; refresh unavailable.`] };
  return feed;
}
export async function getFundamentalEvidence(sb: EvidenceClient, userId: string, ticker: string, analysisDate: string): Promise<FundamentalEvidence | null> {
  const key = `v10:${ticker}:${analysisDate}`;
  const cached = await readDataCache(sb, userId, 'sec-fundamentals', key); const saved = cached?.payload as FundamentalEvidence | undefined;
  if (cached?.fresh && saved?.cutoff) return { ...saved, cached: true };
  try {
    const raw = await secFacts(ticker); if (!raw) return null;
    const evidence = fundamentalEvidence(raw, analysisDate);
    if (evidence.status === 'available') await writeDataCache(sb, userId, 'sec-fundamentals', key, evidence, 12 * 3600 * 1000);
    return evidence;
  } catch { return saved?.cutoff ? { ...saved, cached: true, note: `${saved.note} Stale snapshot from ${saved.fetchedAt}; refresh unavailable.` } : null; }
}
