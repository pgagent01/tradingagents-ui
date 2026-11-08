import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { fmpRequest, ownFmpCredential } from '@/lib/fmp.server';
import { numeric } from '@/lib/stock-data';
import { validTicker } from '@/lib/stock-data';
import { eligiblePeers, type ComparableEvidence, type Peer } from './comparables';
const TTL = 48 * 60 * 60 * 1000;
export async function getComparables(sb: EvidenceClient, userId: string, ticker: string, date: string, today = new Date().toISOString().slice(0,10)): Promise<ComparableEvidence> {
  const result: ComparableEvidence = { status: 'unavailable', industry: null, fetchedAt: new Date().toISOString(), cached: false, peers: [], summaries: [], note: 'Comparable data unavailable; research can continue without it.' };
  // Never substitute current profiles, market caps or TTM ratios into a historical run.
  if (date !== today) return { ...result, note: 'Historical comparable data unavailable; current ratios and current peer membership excluded.' };
  try {
    const credential = await ownFmpCredential(sb, userId);
    if (!credential) return { ...result, note: 'No owner FMP credential for bounded comparable discovery; free Yahoo peer discovery is not connected.' };
    const cacheKey = `v1:${ticker}:${credential.version}`;
    const cached = await readDataCache(sb, userId, 'valuation-peers', cacheKey);
    if (cached?.fresh) return { ...cached.payload as unknown as ComparableEvidence, cached: true };
    const profile = (await fmpRequest('profile', credential.key, { symbol: ticker }))[0];
    const industry = typeof profile?.['industry'] === 'string' ? profile['industry'] : null;
    result.industry = industry;
    const marketCap = numeric(profile?.['marketCap']);
    if (!industry || marketCap === null || marketCap <= 0 || profile?.['currency'] !== 'USD') return { ...result, note: 'Verified USD market cap and structured industry are required for comparable selection.' };
    const candidates = await fmpRequest('stock-peers', credential.key, { symbol: ticker });
    // Provider discovery is bounded to 12 candidates; never scan all SEC registrants.
    const tickers = [...new Set(candidates.map(r => String(r['symbol'] ?? '')).filter(s => s !== ticker && validTicker(s)))].slice(0, 12);
    const peers: Peer[] = [];
    for (let i = 0; i < tickers.length; i += 3) {
      const batch = await Promise.all(tickers.slice(i, i+3).map(async symbol => {
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
    result.peers = eligiblePeers(peers, ticker, marketCap, industry);
    result.status = result.peers.length >= 3 ? 'available' : 'unavailable';
    result.note = `FMP industry fallback (not SEC SIC), exact industry and USD market-cap filter 0.25×–4×; ${result.peers.length} usable peers. Provider-reported TTM ratios, not independently filing-reconciled; date is retrieval date, underlying filing dates unavailable. Forward P/E unavailable. At least three positive observations required per multiple. Cached up to 48 hours.`;
    await writeDataCache(sb, userId, 'valuation-peers', cacheKey, result, result.status === 'available' ? TTL : 5 * 60 * 1000);
    return result;
  } catch { return result; }
}