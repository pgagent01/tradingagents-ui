/** Pure helpers for the scheduled freshness job (browser-safe). */
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' ? v as Record<string, unknown> : {};
const FORMS = /^(10-K|10-Q|8-K|20-F|40-F|6-K)/;
/** Newest periodic/current-report filing date (YYYY-MM-DD) in SEC submissions, or null. */
export function latestFilingDate(submissions: unknown): string | null {
  const recent = obj(obj(obj(submissions)['filings'])['recent']);
  const forms = arr(recent['form']); const dates = arr(recent['filingDate']);
  let best: string | null = null;
  forms.forEach((f, i) => { const d = dates[i]; if (typeof f === 'string' && FORMS.test(f) && typeof d === 'string' && (!best || d > best)) best = d; });
  return best;
}
/** A cached entry is stale when it was fetched before the start of the day a newer filing was made. */
export const cacheStaleAfterFiling = (fetchedAt: string, filed: string | null) => !!filed && fetchedAt < `${filed}T00:00:00Z`;
/** Damodaran republishes each January; a snapshot from an earlier year is due for update from February. */
export function industrySnapshotDue(effectiveDate: string, today: string): boolean {
  const y = Number(effectiveDate.slice(0, 4)); const ty = Number(today.slice(0, 4)); const tm = Number(today.slice(5, 7));
  return ty > y && (ty > y + 1 || tm >= 2);
}
/** Ticker key fragment used by owner caches (`v12:TICKER:date`, `TICKER:...`). */
export const tickerKeyPatterns = (ticker: string) => [`%:${ticker}:%`, `${ticker}:%`];
