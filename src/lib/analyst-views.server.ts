import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { yahooQuoteSummary } from '@/lib/valuation/yahoo-stats.server';
import { finnhubTrend, ownFinnhubCredential } from '@/lib/finnhub.server';
import { fmpRequest, ownFmpCredential } from '@/lib/fmp.server';
import { buildAnalystViews, parseFmpActions, parseFmpConsensus, parseYahooActions, parseYahooConsensus, parseYahooTrend, type AnalystAction, type AnalystConsensus, type AnalystViews, type RatingTrend } from '@/lib/analyst-views';
type Raw = { consensus: (AnalystConsensus | null)[]; trend: RatingTrend[]; actions: AnalystAction[]; retrievedAt: string; sources: string[]; finnhubTrend?: RatingTrend[] | undefined };
const TTL = 12 * 3600 * 1000;
/** Yahoo primary, owner's FMP key as backup/cross-check. Owner- and credential-version-scoped cache shared by stock pages and reports. */
export async function getAnalystViews(sb: EvidenceClient, userId: string, ticker: string, cutoff: string): Promise<AnalystViews> {
  const today = new Date().toISOString().slice(0, 10);
  const fmp = await ownFmpCredential(sb, userId).catch(() => null);
  const fh = await ownFinnhubCredential(sb, userId).catch(() => null);
  const key = `v1:${ticker}:${fmp?.version ?? 'none'}:${fh?.version ?? 'none'}`;
  const cached = await readDataCache(sb, userId, 'analyst-views', key);
  let raw = cached?.fresh ? cached.payload as Raw : null;
  if (!raw) {
    const retrievedAt = new Date().toISOString(); const sources: string[] = [];
    const y = await yahooQuoteSummary(ticker, 'financialData,recommendationTrend,upgradeDowngradeHistory');
    const consensus: (AnalystConsensus | null)[] = []; let trend: RatingTrend[] = []; const actions: AnalystAction[] = [];
    if (y) { consensus.push(parseYahooConsensus(y, ticker, retrievedAt)); trend = parseYahooTrend(y); actions.push(...parseYahooActions(y, ticker)); sources.push('yahoo'); }
    if (fmp) {
      try { consensus.push(parseFmpConsensus(await fmpRequest('price-target-consensus', fmp.key, { symbol: ticker }), ticker, retrievedAt)); sources.push('fmp-consensus'); } catch { /* plan may not include it */ }
      // FMP firm actions fill in only when Yahoo has none, to avoid double-counting the same firm.
      if (!actions.length) { try { actions.push(...parseFmpActions(await fmpRequest('price-target-news', fmp.key, { symbol: ticker, limit: '50' }), ticker)); sources.push('fmp-actions'); } catch { /* optional */ } }
    }
    let fht: RatingTrend[] | undefined;
    if (fh) { try { fht = await finnhubTrend(ticker, fh.key); sources.push('finnhub'); } catch { /* optional cross-check */ } }
    raw = { finnhubTrend: fht, consensus: consensus.filter(Boolean), trend, actions: actions.slice(0, 400), retrievedAt, sources };
    if (sources.length) await writeDataCache(sb, userId, 'analyst-views', key, raw, TTL);
    else if (cached) raw = cached.payload as Raw; // stale fallback keeps its original retrieval time
  }
  if (!raw) return buildAnalystViews({ ticker, cutoff, today, consensus: [], trend: [], actions: [], retrievedAt: null });
  return buildAnalystViews({ ticker, cutoff, today, consensus: raw.consensus, trend: raw.trend, actions: raw.actions, retrievedAt: raw.retrievedAt, crossTrend: raw.finnhubTrend ? { label: 'Finnhub', trend: raw.finnhubTrend } : null });
}
