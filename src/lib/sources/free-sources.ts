/** Browser-safe parsers for free public evidence sources. Every item stays dated and linked; look-ahead items are dropped. */
type Row = Record<string, unknown>;
const obj = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const num = (v: unknown): number | null => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const https = (u: unknown) => typeof u === 'string' && u.startsWith('https://') ? u : null;

export type FeedStatus = 'available' | 'unavailable' | 'historical_unavailable';
export type SourceFeed<T> = { status: FeedStatus; source: string; sourceUrl: string | null; cutoff: string; fetchedAt: string; cached: boolean; note: string; items: T[] };
export type GdeltArticle = { title: string; url: string; domain: string; country: string; seenAt: string };
export type GdeltNews = SourceFeed<GdeltArticle> & { tone: { date: string; value: number }[]; averageTone: number | null };
export type ShortInterest = { settlementDate: string; shortShares: number; previousShortShares: number | null; changePct: number | null; avgDailyVolume: number | null; daysToCover: number | null };
export type MacroIndicator = { country: string; indicator: string; name: string; year: string; value: number };
export type EarningsRelease = { filed: string; accession: string; url: string; excerpt: string };
export type FreeSourcesEvidence = { gdelt: GdeltNews; shortInterest: SourceFeed<ShortInterest>; globalMacro: SourceFeed<MacroIndicator> & { lastUpdated: string | null }; earningsReleases: SourceFeed<EarningsRelease>; social: SourceFeed<never> };

/** GDELT seendate is YYYYMMDDTHHMMSSZ. */
export function gdeltDate(s: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? '00'}:${m[5] ?? '00'}:${m[6] ?? '00'}Z` : null;
}
export function parseGdeltArticles(raw: unknown, cutoff: string, limit = 15): GdeltArticle[] {
  const seen = new Set<string>(); const out: GdeltArticle[] = [];
  for (const a of arr(obj(raw)['articles']).map(obj)) {
    const url = https(a['url']); const at = gdeltDate(String(a['seendate'] ?? '')); const title = String(a['title'] ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!url || !at || !title || at.slice(0, 10) > cutoff) continue;
    const k = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80); if (seen.has(k)) continue; seen.add(k);
    out.push({ title, url, domain: String(a['domain'] ?? '').slice(0, 100), country: String(a['sourcecountry'] ?? '').slice(0, 60), seenAt: at });
    if (out.length >= limit) break;
  }
  return out;
}
export function parseGdeltTone(raw: unknown, cutoff: string): { date: string; value: number }[] {
  const series = arr(obj(raw)['timeline']).map(obj)[0];
  return arr(series?.['data']).map(obj).map(d => ({ date: (gdeltDate(String(d['date'] ?? '')) ?? '').slice(0, 10), value: num(d['value']) })).filter((d): d is { date: string; value: number } => !!d.date && d.date <= cutoff && d.value !== null);
}
/** Days with zero coverage report tone 0; exclude them so silence is not counted as neutral sentiment. */
export function averageTone(points: { value: number }[]): number | null {
  const v = points.filter(p => p.value !== 0); return v.length ? Math.round(v.reduce((s, p) => s + p.value, 0) / v.length * 100) / 100 : null;
}
export function parseShortInterest(raw: unknown, ticker: string, cutoff: string, limit = 6): ShortInterest[] {
  return arr(raw).map(obj).filter(r => String(r['symbolCode'] ?? '').toUpperCase() === ticker.toUpperCase()).map(r => ({
    settlementDate: String(r['settlementDate'] ?? ''), shortShares: num(r['currentShortPositionQuantity']) ?? NaN, previousShortShares: num(r['previousShortPositionQuantity']),
    changePct: num(r['changePercent']), avgDailyVolume: num(r['averageDailyVolumeQuantity']), daysToCover: num(r['daysToCoverQuantity']),
  })).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.settlementDate) && r.settlementDate <= cutoff && Number.isFinite(r.shortShares))
    .sort((a, b) => b.settlementDate.localeCompare(a.settlementDate)).slice(0, limit);
}
export const WORLD_BANK_INDICATORS = [
  { id: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth (annual %)' },
  { id: 'FP.CPI.TOTL.ZG', name: 'Inflation, consumer prices (annual %)' },
] as const;
/** World Bank data is revised without vintages, so historical runs keep only years completed before the cutoff year. */
export function parseWorldBank(raw: unknown, name: string, cutoff: string): { lastUpdated: string | null; rows: MacroIndicator[] } {
  const body = arr(raw); const meta = obj(body[0]); const maxYear = Number(cutoff.slice(0, 4)) - 1;
  const rows = arr(body[1]).map(obj).map(r => ({ country: String(obj(r['country'])['value'] ?? ''), indicator: String(obj(r['indicator'])['id'] ?? ''), name, year: String(r['date'] ?? ''), value: num(r['value']) }))
    .filter((r): r is MacroIndicator => !!r.country && /^\d{4}$/.test(r.year) && Number(r.year) <= maxYear && r.value !== null);
  const latest = new Map<string, MacroIndicator>();
  for (const r of rows.sort((a, b) => b.year.localeCompare(a.year))) if (!latest.has(r.country)) latest.set(r.country, { ...r, value: Math.round(r.value * 100) / 100 });
  return { lastUpdated: typeof meta['lastupdated'] === 'string' ? meta['lastupdated'] : null, rows: [...latest.values()] };
}
/** Earnings 8-Ks carry item 2.02 (results of operations). */
export function earningsFilings(submissions: unknown, cutoff: string, windowStart: string, limit = 2): { filed: string; accession: string }[] {
  const recent = obj(obj(obj(submissions)['filings'])['recent']); const c = (k: string) => arr(recent[k]);
  const out: { filed: string; accession: string }[] = [];
  c('form').forEach((f, i) => {
    const filed = String(c('filingDate')[i] ?? ''); const items = String(c('items')[i] ?? '');
    if (String(f).replace(/\/A$/, '') === '8-K' && items.split(',').map(s => s.trim()).includes('2.02') && filed <= cutoff && filed >= windowStart) out.push({ filed, accession: String(c('accessionNumber')[i] ?? '') });
  });
  return out.filter(o => o.accession).slice(0, limit);
}
export function exhibitName(index: unknown): string | null {
  const names = arr(obj(obj(index)['directory'])['item']).map(i => String(obj(i)['name'] ?? ''));
  return names.find(n => /ex[-_]?99[-_.]?1?.*\.html?$/i.test(n)) ?? names.find(n => /ex[-_]?99.*\.html?$/i.test(n)) ?? null;
}
export function htmlText(html: string, max = 2500): string {
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/&#\d+;|&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
export const SOCIAL_UNAVAILABLE = 'No social-media feed is connected. Bluesky search now requires an authenticated account, Reddit requires approved API access and Stocktwits registrations are closed; sentiment uses news tone and headlines as proxies only.';
