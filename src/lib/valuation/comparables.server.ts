import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { fmpRequest, ownFmpCredential } from '@/lib/fmp.server';
import { numeric } from '@/lib/stock-data';
import { validTicker } from '@/lib/stock-data';
import { COMPARABLE_CACHE_TTL, eligiblePeers, type ComparableEvidence, type Peer } from './comparables';
import { secIndustry, secYahooPeer, yahooPeerCandidates } from './peer-fallback.server';
export async function getComparables(sb: EvidenceClient, userId: string, ticker: string, date: string, today = new Date().toISOString().slice(0,10)): Promise<ComparableEvidence> {
  const result: ComparableEvidence = { status: 'unavailable', industry: null, fetchedAt: new Date().toISOString(), cached: false, peers: [], summaries: [], note: 'Comparable data unavailable; research can continue without it.' };
  // Never substitute current profiles, market caps or TTM ratios into a historical run.
  if (date !== today) return { ...result, note: 'Historical comparable data unavailable; current ratios and current peer membership excluded.' };
  try {
    const credential = await ownFmpCredential(sb, userId);
    const cacheKey = `v3:${ticker}:${credential?.version ?? 'public'}`;
    const cached = await readDataCache(sb, userId, 'valuation-peers', cacheKey);
    if (cached?.fresh) return { ...cached.payload as unknown as ComparableEvidence, cached: true };
    let profile: Record<string, unknown> | undefined;
    let candidates: Record<string, unknown>[] = [];
    if (credential) {
      try { profile = (await fmpRequest('profile', credential.key, { symbol: ticker }))[0]; } catch { /* Free evidence remains usable. */ }
      try { candidates = await fmpRequest('stock-peers', credential.key, { symbol: ticker }); } catch { /* Free suggestions remain usable. */ }
    }
    const industry = typeof profile?.['industry'] === 'string' ? profile['industry'] : null;
    result.industry = industry;
    const marketCap = numeric(profile?.['marketCap']);
    // Provider discovery is bounded to 12 candidates; never scan all SEC registrants.
    const tickers = [...new Set(candidates.map(r => String(r['symbol'] ?? '')).filter(s => s !== ticker && validTicker(s)))].slice(0, 12);
    const peers: Peer[] = [];
    for (let i = 0; credential && industry && marketCap !== null && marketCap > 0 && profile?.['currency'] === 'USD' && i < tickers.length; i += 3) {
      const batch = await Promise.all(tickers.slice(i, i+3).map(async (symbol): Promise<Peer | null> => {
        try {
          const p = (await fmpRequest('profile', credential.key, { symbol }))[0];
          const cap = numeric(p?.['marketCap']);
          if (!p || cap === null || cap <= 0 || p['industry'] !== industry || p['currency'] !== 'USD' || cap < marketCap * .25 || cap > marketCap * 4) return null;
          const ratios = (await fmpRequest('ratios-ttm', credential.key, { symbol }))[0];
          const get = (key: string) => { const n = numeric(ratios?.[key]); return n !== null && n > 0 ? n : null; };
          return { ticker: symbol, company: String(p['companyName'] ?? symbol), industry, marketCap: cap, currency: 'USD', date: result.fetchedAt.slice(0,10), source: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`, multiples: { pe: get('priceToEarningsRatioTTM'), forwardPe: null, evSales: get('enterpriseValueToSalesRatioTTM'), evEbitda: get('enterpriseValueMultipleTTM'), pFcf: get('priceToFreeCashFlowRatioTTM'), pb: get('priceToBookRatioTTM') } } satisfies Peer;
        } catch { return null; }
      }));
      peers.push(...batch.filter((p): p is Peer => p !== null));
    }
    result.peers = eligiblePeers(peers, ticker, marketCap ?? 0, industry ?? '');
    let freeFallback = false;
    if (result.peers.length < 3) {
      const classification = await secIndustry(ticker);
      if (classification) {
        result.industry = classification.industry;
        const subject = await secYahooPeer(ticker, today, classification);
        if (subject) {
          const suggestions = await yahooPeerCandidates(ticker);
          const bounded = [...new Set([...tickers, ...suggestions])].slice(0, 12);
          const freePeers: Peer[] = [];
          for (let i = 0; i < bounded.length; i += 3) {
            const batch = await Promise.all(bounded.slice(i, i + 3).map(symbol => secYahooPeer(symbol, today, classification)));
            freePeers.push(...batch.filter((p): p is Peer => p !== null));
          }
          // Never combine incompatible FMP text-industry and SEC SIC cohorts.
          result.peers = eligiblePeers(freePeers, ticker, subject.marketCap, classification.industry);
          freeFallback = true;
        } else result.peers = [];
      }
    }
    result.status = result.peers.length >= 3 ? 'available' : 'unavailable';
    result.note = `${freeFallback ? 'Yahoo suggestions verified by exact SEC SIC; Yahoo USD quote/market cap (or quote × dated SEC common shares), aligned SEC TTM earnings/FCF and dated book equity. Forward estimates and EV multiples unavailable. SIC is a broad classification, not proof of identical business models' : 'FMP industry fallback (not SEC SIC), exact industry; provider-reported TTM ratios, not independently filing-reconciled, underlying filing dates unavailable'}. USD market-cap filter 0.25×–4×; ${result.peers.length} usable peers. Date is retrieval date. At least three positive observations required per multiple. Cached up to 48 hours. Insufficient verified peers remain unavailable; research can continue.`;
    await writeDataCache(sb, userId, 'valuation-peers', cacheKey, result, result.status === 'available' ? COMPARABLE_CACHE_TTL : 5 * 60 * 1000);
    return result;
  } catch { return result; }
}