import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { secCik, secSubmissions } from '@/lib/stock-data.server';
import { COMPANIES } from '@/lib/companies';
import { averageTone, earningsFilings, exhibitName, htmlText, parseGdeltArticles, parseGdeltTone, parseShortInterest, parseWorldBank, SOCIAL_UNAVAILABLE, WORLD_BANK_INDICATORS, type FreeSourcesEvidence, type SourceFeed } from '@/lib/sources/free-sources';

const SEC_UA = () => process.env['SEC_USER_AGENT'] ?? 'TradingAgentsAI gprithvi@gmail.com';
async function get(url: string, init: RequestInit = {}, ms = 12000) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) }); if (!r.ok) throw new Error(`status ${r.status}`); return r;
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const stamp = (d: string, end = false) => d.replace(/-/g, '') + (end ? '235959' : '000000');
function feed<T>(source: string, sourceUrl: string | null, cutoff: string, items: T[], note: string, status?: SourceFeed<T>['status']): SourceFeed<T> {
  return { status: status ?? (items.length ? 'available' : 'unavailable'), source, sourceUrl, cutoff, fetchedAt: new Date().toISOString(), cached: false, note, items };
}
async function cached<T extends { status: string; fetchedAt: string }>(sb: EvidenceClient, userId: string, provider: string, key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const c = await readDataCache(sb, userId, provider, key); const saved = c?.payload as T | undefined;
  if (c?.fresh && saved?.fetchedAt) return { ...saved, cached: true };
  const fresh = await load();
  if (fresh.status === 'available') await writeDataCache(sb, userId, provider, key, fresh, ttl);
  else if (saved?.status === 'available') return { ...saved, cached: true };
  return fresh;
}
function companyName(ticker: string) {
  const c = COMPANIES.find(x => x.ticker === ticker)?.name ?? ticker;
  return c.replace(/\b(Inc|Corp|Corporation|Holdings|Ltd|plc|Co|Company|Group|N\.V|S\.A)\.?\b/gi, '').replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim() || ticker;
}

async function gdelt(ticker: string, cutoff: string, start: string): Promise<FreeSourcesEvidence['gdelt']> {
  const q = encodeURIComponent(`"${companyName(ticker)}"`); const range = `&startdatetime=${stamp(start)}&enddatetime=${stamp(cutoff, true)}`;
  const base = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&format=json${range}`; const sourceUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist${range}`;
  try {
    // GDELT allows one request per five seconds and answers rate limits with plain text, so retry once after a pause.
    const call = async (mode: string) => { for (let i = 0; i < 2; i++) { const t = await (await get(`${base}&mode=${mode}`, {}, 20000)).text(); try { return JSON.parse(t) as unknown; } catch { await wait(6000); } } throw new Error('rate limited'); };
    const items = parseGdeltArticles(await call('artlist&maxrecords=40&sort=datedesc'), cutoff);
    await wait(5500);
    const tone = parseGdeltTone(await call('timelinetone'), cutoff);
    return { ...feed('GDELT Project DOC 2.0', sourceUrl, cutoff, items, 'Machine-coded global news; titles and tone only, article bodies not retrieved. Tone ranges roughly −10 (negative) to +10 (positive); zero-coverage days are excluded from the average.'), tone, averageTone: averageTone(tone) };
  } catch { return { ...feed('GDELT Project DOC 2.0', sourceUrl, cutoff, [], 'GDELT temporarily unavailable or rate-limited.'), tone: [], averageTone: null }; }
}
async function finra(ticker: string, cutoff: string): Promise<FreeSourcesEvidence['shortInterest']> {
  const src = 'FINRA consolidated short interest'; const url = 'https://www.finra.org/finra-data/browse-catalog/equity-short-interest/data';
  try {
    const r = await get('https://api.finra.org/data/group/otcMarket/name/consolidatedShortInterest', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ limit: 24, compareFilters: [{ compareType: 'EQUAL', fieldName: 'symbolCode', fieldValue: ticker.toUpperCase() }], dateRangeFilters: [{ fieldName: 'settlementDate', startDate: new Date(Date.parse(`${cutoff}T00:00:00Z`) - 200 * 86400000).toISOString().slice(0, 10), endDate: cutoff }] }) });
    const items = parseShortInterest(await r.json(), ticker, cutoff);
    return feed(src, url, cutoff, items, items.length ? 'Twice-monthly settlement data, published about 7 business days after settlement. Days to cover = short shares ÷ average daily volume.' : 'FINRA returned no short-interest records for this symbol before the cutoff.');
  } catch { return feed(src, url, cutoff, [], 'FINRA short-interest API temporarily unavailable.'); }
}
async function worldBank(cutoff: string): Promise<FreeSourcesEvidence['globalMacro']> {
  const year = Number(cutoff.slice(0, 4)); let lastUpdated: string | null = null; const items = [];
  try {
    for (const ind of WORLD_BANK_INDICATORS) {
      const p = parseWorldBank(await (await get(`https://api.worldbank.org/v2/country/USA;CHN;EUU;JPN;WLD/indicator/${ind.id}?format=json&date=${year - 4}:${year}&per_page=100`)).json(), ind.name, cutoff);
      lastUpdated = p.lastUpdated ?? lastUpdated; items.push(...p.rows);
    }
  } catch { return { ...feed('World Bank Open Data', 'https://data.worldbank.org/', cutoff, [], 'World Bank API temporarily unavailable.'), lastUpdated: null }; }
  return { ...feed('World Bank Open Data', 'https://data.worldbank.org/', cutoff, items, `Annual values for completed years before the analysis year. The World Bank revises data without vintages, so historical runs may include later revisions. Dataset last updated ${lastUpdated ?? 'unknown'}.`), lastUpdated };
}
async function earnings(ticker: string, cutoff: string, start: string): Promise<FreeSourcesEvidence['earningsReleases']> {
  const src = 'SEC EDGAR 8-K Item 2.02 exhibits';
  try {
    const cik = await secCik(ticker); if (!cik) return feed(src, null, cutoff, [], 'No SEC registrant found for this ticker.');
    const cikNum = String(Number(cik)); const items = [];
    for (const f of earningsFilings(await secSubmissions(cik), cutoff, start)) {
      const folder = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${f.accession.replace(/-/g, '')}`;
      const name = exhibitName(await (await get(`${folder}/index.json`, { headers: { 'User-Agent': SEC_UA() } })).json()); if (!name) continue;
      const url = `${folder}/${name}`; const html = await (await get(url, { headers: { 'User-Agent': SEC_UA() } }, 20000)).text();
      items.push({ filed: f.filed, accession: f.accession, url, excerpt: htmlText(html) });
    }
    return feed(src, `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=8-K`, cutoff, items, items.length ? 'Opening excerpt of the company-issued earnings press release (Exhibit 99), filed on or before the cutoff. Company statements are unaudited and may include non-GAAP figures.' : 'No earnings-release 8-K (Item 2.02) was filed inside the lookback window.');
  } catch { return feed(src, null, cutoff, [], 'SEC earnings-release retrieval temporarily unavailable.'); }
}

/** Sequential retrieval with per-source caching; failures are recorded as unavailable and never block a run. */
export async function getFreeSourcesEvidence(sb: EvidenceClient, userId: string, ticker: string, cutoff: string, lookbackDays: number): Promise<FreeSourcesEvidence> {
  const start = new Date(Date.parse(`${cutoff}T00:00:00Z`) - Math.max(lookbackDays, 30) * 86400000).toISOString().slice(0, 10);
  const releaseStart = new Date(Date.parse(`${cutoff}T00:00:00Z`) - 120 * 86400000).toISOString().slice(0, 10);
  const day = 86400000; const k = `v1:${ticker}:${cutoff}`;
  const earningsReleases = await cached(sb, userId, 'sec-earnings', k, day, () => earnings(ticker, cutoff, releaseStart));
  const shortInterest = await cached(sb, userId, 'finra-short', k, 12 * 3600000, () => finra(ticker, cutoff));
  const globalMacro = await cached(sb, userId, 'worldbank', `v1:${cutoff.slice(0, 4)}`, 7 * day, () => worldBank(cutoff));
  const gdeltNews = await cached(sb, userId, 'gdelt', `${k}:${lookbackDays}`, 3 * 3600000, () => gdelt(ticker, cutoff, start));
  const social = feed<never>('Social media', null, cutoff, [], SOCIAL_UNAVAILABLE);
  return { gdelt: gdeltNews, shortInterest, globalMacro, earningsReleases, social };
}
