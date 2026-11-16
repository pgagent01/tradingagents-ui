/** Wall Street analyst targets and ratings: pure, browser-safe parsing and merging. Outside opinion, never valuation evidence. */
export type AnalystAction = { firm: string; date: string; toGrade: string | null; fromGrade: string | null; action: string | null; targetAction: string | null; target: number | null; priorTarget: number | null; source: 'Yahoo Finance' | 'Financial Modeling Prep'; sourceUrl: string };
export type AnalystConsensus = { source: 'Yahoo Finance' | 'Financial Modeling Prep'; sourceUrl: string; mean: number | null; median: number | null; high: number | null; low: number | null; analysts: number | null; rating: string | null; ratingMean: number | null; currency: string | null; retrievedAt: string };
export type RatingTrend = { period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number };
export type AnalystViews = {
  status: 'available' | 'unavailable' | 'historical_partial';
  ticker: string; cutoff: string; retrievedAt: string | null;
  consensus: AnalystConsensus[]; trend: RatingTrend[]; actions: AnalystActions;
  derived: { firmsWithTargets: number; mean: number | null; high: number | null; low: number | null; dispersionPct: number | null; downgrades90d: number; upgrades90d: number; targetCuts90d: number; targetRaises90d: number } | null;
  disagreements: string[]; notes: string[];
};
type AnalystActions = AnalystAction[];
const num = (v: unknown): number | null => { const x = typeof v === 'object' && v !== null ? (v as Record<string, unknown>)['raw'] : v; const n = typeof x === 'string' && x.trim() === '' ? NaN : Number(x); return x === null || x === undefined || !Number.isFinite(n) ? null : n; };
const str = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null;
const obj = (v: unknown) => (typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : {});
const pos = (n: number | null) => n !== null && n > 0 ? n : null;
const DAY = 86400000;

export function yahooAnalystUrl(ticker: string) { return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/analysis`; }
export function parseYahooConsensus(res: Record<string, unknown>, ticker: string, retrievedAt: string): AnalystConsensus | null {
  const f = obj(res['financialData']);
  const c: AnalystConsensus = { source: 'Yahoo Finance', sourceUrl: yahooAnalystUrl(ticker), mean: pos(num(f['targetMeanPrice'])), median: pos(num(f['targetMedianPrice'])), high: pos(num(f['targetHighPrice'])), low: pos(num(f['targetLowPrice'])), analysts: num(f['numberOfAnalystOpinions']), rating: str(f['recommendationKey']), ratingMean: num(f['recommendationMean']), currency: str(f['financialCurrency']), retrievedAt };
  return c.mean === null && c.rating === null ? null : c;
}
export function parseYahooTrend(res: Record<string, unknown>): RatingTrend[] {
  const t = obj(res['recommendationTrend'])['trend'];
  return (Array.isArray(t) ? t : []).map(obj).flatMap(r => { const p = str(r['period']); const v = ['strongBuy', 'buy', 'hold', 'sell', 'strongSell'].map(k => num(r[k])); return p && v.every(n => n !== null && n >= 0) ? [{ period: p, strongBuy: v[0]!, buy: v[1]!, hold: v[2]!, sell: v[3]!, strongSell: v[4]! }] : []; }).slice(0, 4);
}
export function parseYahooActions(res: Record<string, unknown>, ticker: string): AnalystAction[] {
  const h = obj(res['upgradeDowngradeHistory'])['history'];
  return (Array.isArray(h) ? h : []).map(obj).flatMap(r => { const t = num(r['epochGradeDate']); const firm = str(r['firm']); if (t === null || !firm) return []; return [{ firm, date: new Date(t * 1000).toISOString().slice(0, 10), toGrade: str(r['toGrade']), fromGrade: str(r['fromGrade']), action: str(r['action']), targetAction: str(r['priceTargetAction']), target: pos(num(r['currentPriceTarget'])), priorTarget: pos(num(r['priorPriceTarget'])), source: 'Yahoo Finance' as const, sourceUrl: yahooAnalystUrl(ticker) }]; });
}
export function parseFmpConsensus(rows: Record<string, unknown>[], ticker: string, retrievedAt: string): AnalystConsensus | null {
  const r = rows.find(x => x['symbol'] === ticker); if (!r) return null;
  const mean = pos(num(r['targetConsensus'])); if (mean === null) return null;
  return { source: 'Financial Modeling Prep', sourceUrl: `https://financialmodelingprep.com/financial-summary/${encodeURIComponent(ticker)}`, mean, median: pos(num(r['targetMedian'])), high: pos(num(r['targetHigh'])), low: pos(num(r['targetLow'])), analysts: null, rating: null, ratingMean: null, currency: null, retrievedAt };
}
export function parseFmpActions(rows: Record<string, unknown>[], ticker: string): AnalystAction[] {
  return rows.flatMap(r => { const firm = str(r['analystCompany']) ?? str(r['gradingCompany']); const date = str(r['publishedDate'] ?? r['date'])?.slice(0, 10); if (!firm || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (r['symbol'] && r['symbol'] !== ticker)) return []; const link = str(r['newsURL']); return [{ firm, date, toGrade: str(r['newGrade']), fromGrade: str(r['previousGrade']), action: str(r['action']), targetAction: null, target: pos(num(r['priceTarget'])), priorTarget: null, source: 'Financial Modeling Prep' as const, sourceUrl: link && /^https:\/\//.test(link) ? link : `https://financialmodelingprep.com/financial-summary/${encodeURIComponent(ticker)}` }]; });
}
/** Newest dated action per firm within 12 months of the cutoff; nothing published after the cutoff. */
export function latestPerFirm(actions: AnalystAction[], cutoff: string): AnalystAction[] {
  const min = new Date(Date.parse(cutoff) - 365 * DAY).toISOString().slice(0, 10);
  const best = new Map<string, AnalystAction>();
  for (const a of actions) { if (a.date > cutoff || a.date < min) continue; const k = a.firm.toLowerCase(); const prev = best.get(k); if (!prev || a.date > prev.date || (a.date === prev.date && prev.target === null && a.target !== null)) best.set(k, a); }
  return [...best.values()].sort((a, b) => b.date.localeCompare(a.date));
}
const DOWN = /down/i, UP = /^up/i;
export function buildAnalystViews(input: { ticker: string; cutoff: string; today: string; consensus: (AnalystConsensus | null)[]; trend: RatingTrend[]; actions: AnalystAction[]; retrievedAt: string | null; crossTrend?: { label: string; trend: RatingTrend[] } | null }): AnalystViews {
  const historical = input.cutoff < input.today;
  const notes: string[] = ['Analyst targets and ratings are outside opinions, not verified evidence or our valuation.'];
  // Consensus snapshots and monthly trends are current-only; they cannot be dated to a past cutoff.
  const consensus = historical ? [] : input.consensus.filter((c): c is AnalystConsensus => c !== null);
  const trend = historical ? [] : input.trend;
  if (historical) notes.push('Historical run: current consensus and rating counts excluded; only firm actions published on or before the analysis date are used.');
  const firms = latestPerFirm(input.actions, input.cutoff);
  const targets = firms.map(f => f.target).filter((n): n is number => n !== null);
  const recent = input.actions.filter(a => a.date <= input.cutoff && a.date >= new Date(Date.parse(input.cutoff) - 90 * DAY).toISOString().slice(0, 10));
  const mean = targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : null;
  const derived = firms.length ? { firmsWithTargets: targets.length, mean: mean === null ? null : Math.round(mean * 100) / 100, high: targets.length ? Math.max(...targets) : null, low: targets.length ? Math.min(...targets) : null, dispersionPct: targets.length >= 2 && mean ? Math.round((Math.max(...targets) - Math.min(...targets)) / mean * 1000) / 10 : null, downgrades90d: recent.filter(a => DOWN.test(a.action ?? '')).length, upgrades90d: recent.filter(a => UP.test(a.action ?? '')).length, targetCuts90d: recent.filter(a => /lower/i.test(a.targetAction ?? '') || (a.target !== null && a.priorTarget !== null && a.target < a.priorTarget)).length, targetRaises90d: recent.filter(a => /raise/i.test(a.targetAction ?? '') || (a.target !== null && a.priorTarget !== null && a.target > a.priorTarget)).length } : null;
  if (derived) notes.push('Derived firm-level average uses each firm\'s newest dated target within 12 months; it is calculated by this app, not a provider consensus.');
  const disagreements = consensusDisagreements(consensus);
  if (!historical && input.crossTrend) { const d = trendDisagreement(trend, input.crossTrend.trend, 'Yahoo', input.crossTrend.label); if (d) disagreements.push(d); else if (input.crossTrend.trend.length && trend.length) notes.push(`${input.crossTrend.label} rating counts agree with Yahoo within 15 points.`); }
  const status = consensus.length || firms.length ? (historical ? 'historical_partial' : 'available') : 'unavailable';
  return { status, ticker: input.ticker, cutoff: input.cutoff, retrievedAt: input.retrievedAt, consensus, trend, actions: firms.slice(0, 25), derived, disagreements, notes };
}
/** Flag provider consensus means more than 10% apart; never average them together. */
export function consensusDisagreements(c: AnalystConsensus[], tol = 0.10): string[] {
  const out: string[] = [];
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) { const a = c[i]!, b = c[j]!; if (a.mean && b.mean && Math.abs(a.mean / b.mean - 1) > tol) out.push(`${a.source} average target ${a.mean.toFixed(2)} differs from ${b.source} ${b.mean.toFixed(2)} by more than ${tol * 100}%; both shown, not averaged.`); }
  return out;
}
export function primaryConsensusMean(v: AnalystViews | null | undefined): number | null { return v?.consensus[0]?.mean ?? v?.derived?.mean ?? null; }
/** Gap note between our target and analyst average; descriptive only. */
export function analystGap(ourTarget: number | null, v: AnalystViews | null | undefined, tol = 0.40): { gapPct: number; message: string } | null {
  const avg = primaryConsensusMean(v); if (ourTarget === null || !avg) return null;
  const gap = ourTarget / avg - 1; if (Math.abs(gap) <= tol) return null;
  return { gapPct: Math.round(gap * 1000) / 10, message: `Our target ${ourTarget.toFixed(2)} is ${Math.abs(gap * 100).toFixed(0)}% ${gap < 0 ? 'below' : 'above'} the analyst average ${avg.toFixed(2)}. Review growth, margin, reinvestment and discount-rate assumptions; analysts may use forward estimates we do not have.` };
}
/** A target within 0.5% of the analyst average without our own calculation behind it is treated as copied. */
export function copiesConsensus(target: number | null, calculated: number | null, v: AnalystViews | null | undefined, tol = 0.005): boolean {
  if (target === null || calculated !== null) return false;
  const avgs = [...(v?.consensus ?? []).flatMap(c => [c.mean, c.median]), v?.derived?.mean ?? null].filter((n): n is number => typeof n === 'number' && n > 0);
  return avgs.some(a => Math.abs(target / a - 1) <= tol);
}
/** Role-specific slices passed to analysts, each with source and date. */
export function analystViewsFor(agent: string, v: AnalystViews | null | undefined): unknown {
  if (!v || v.status === 'unavailable') return null;
  const base = { status: v.status, cutoff: v.cutoff, retrievedAt: v.retrievedAt, notes: v.notes, disagreements: v.disagreements };
  const consensus = v.consensus.map(c => ({ source: c.source, url: c.sourceUrl, mean: c.mean, median: c.median, high: c.high, low: c.low, analysts: c.analysts, rating: c.rating, retrievedAt: c.retrievedAt }));
  const changes = v.actions.slice(0, 12).map(a => ({ firm: a.firm, date: a.date, rating: a.toGrade, from: a.fromGrade, action: a.action, targetAction: a.targetAction, target: a.target, priorTarget: a.priorTarget, source: a.source, url: a.sourceUrl }));
  const extremes = (() => { const t = v.actions.filter(a => a.target !== null); if (!t.length) return null; const hi = t.reduce((a, b) => b.target! > a.target! ? b : a), lo = t.reduce((a, b) => b.target! < a.target! ? b : a); return { highest: { firm: hi.firm, target: hi.target, rating: hi.toGrade, date: hi.date, source: hi.source }, lowest: { firm: lo.firm, target: lo.target, rating: lo.toGrade, date: lo.date, source: lo.source } }; })();
  switch (agent) {
    case 'fundamentals': return { ...base, consensus, derived: v.derived };
    case 'news': return { ...base, recent_rating_and_target_changes: changes };
    case 'sentiment': return { ...base, rating_trend: v.trend, consensus_rating: consensus.map(c => ({ source: c.source, rating: c.rating, analysts: c.analysts })), derived: v.derived && { upgrades90d: v.derived.upgrades90d, downgrades90d: v.derived.downgrades90d, targetCuts90d: v.derived.targetCuts90d, targetRaises90d: v.derived.targetRaises90d } };
    case 'debate': return { ...base, extremes, consensus };
    case 'risk': return { ...base, dispersionPct: v.derived?.dispersionPct ?? null, downgrades: changes.filter(c => DOWN.test(c.action ?? '') || /lower/i.test(c.targetAction ?? '')) };
    case 'synthesis': return { ...base, consensus, derived: v.derived, extremes, recent_rating_and_target_changes: changes, rating_trend: v.trend };
    default: return null;
  }
}
const share = (t: RatingTrend) => { const n = t.strongBuy + t.buy + t.hold + t.sell + t.strongSell; return n ? (t.strongBuy + t.buy) / n : null; };
/** Cross-check latest Buy share between two rating-count sources; flags gaps over 15 points, never merges them. */
export function trendDisagreement(a: RatingTrend[], b: RatingTrend[], labelA: string, labelB: string, tol = 0.15): string | null {
  const x = a[0] ? share(a[0]) : null, y = b[0] ? share(b[0]) : null;
  if (x === null || y === null || Math.abs(x - y) <= tol) return null;
  return `${labelA} shows ${(x * 100).toFixed(0)}% Buy ratings vs ${labelB} ${(y * 100).toFixed(0)}% (latest month); both kept separate.`;
}
export const ANALYST_VIEW_RULES = 'Wall Street analyst targets and ratings are outside opinion, not proof or verified evidence. Cite the firm (or provider) and date for any target you mention. If our calculated target differs materially from the analyst average, explain the likely drivers. Never copy the analyst average or median as our price target; our target must come from the supplied valuation. Provider disagreements must be mentioned with both values.';
export function analystViewsMarkdown(v: unknown): string {
  const a = v as AnalystViews | null | undefined;
  if (!a || !a.status || a.status === 'unavailable') return 'No analyst targets or ratings were saved.';
  const usd = (n: number | null) => n === null ? '—' : n.toFixed(2);
  const lines = a.consensus.map(c => `- **${c.source}** (${c.retrievedAt.slice(0, 10)}): average ${usd(c.mean)}, median ${usd(c.median)}, range ${usd(c.low)}–${usd(c.high)}, ${c.analysts ?? '—'} analysts, rating ${c.rating ?? '—'} · [source](${c.sourceUrl})`);
  if (a.derived) lines.push(`- Firm-level (calculated): ${a.derived.firmsWithTargets} firms, average ${usd(a.derived.mean)}, range ${usd(a.derived.low)}–${usd(a.derived.high)}; last 90 days: ${a.derived.upgrades90d} upgrades, ${a.derived.downgrades90d} downgrades, ${a.derived.targetRaises90d} target raises, ${a.derived.targetCuts90d} target cuts`);
  const table = a.actions.length ? `\n\n| Firm | Date | Rating | Target | Prior | Source |\n| --- | --- | --- | --- | --- | --- |\n${a.actions.map(x => `| ${x.firm} | ${x.date} | ${x.toGrade ?? '—'} | ${usd(x.target)} | ${usd(x.priorTarget)} | [${x.source}](${x.sourceUrl}) |`).join('\n')}` : '';
  return `${lines.join('\n')}${table}\n\n${[...a.disagreements, ...a.notes].map(n => `> ${n}`).join('\n')}`;
}
