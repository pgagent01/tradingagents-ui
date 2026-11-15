import type { Headline } from './research-evidence';

export type NewsEvent = { title: string; category: string; firstPublishedAt: string; lastPublishedAt: string; coverage: Headline[]; publisherCount: number };
export type NewsSourceState = { status: 'available' | 'empty' | 'failed' | 'historical_unavailable'; count: number; reason?: string };
/** Remove tracking only; semantic query parameters must survive. No URL is fetched here. */
export function canonicalNewsUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (/^(utm_.+|guccounter|guce_referrer.*|fbclid|gclid|ncid)$/i.test(key)) u.searchParams.delete(key);
    u.searchParams.sort(); return u.href;
  } catch { return null; }
}
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !/^(a|an|the|and|of|to|in|on|for|with|at|by)$/.test(w));
const key = (s: string) => words(s).join(' ');
export function newsCategory(title: string): string {
  if (/\b(earnings|guidance|quarterly results|profit|revenue forecast)\b/i.test(title)) return 'Earnings / guidance';
  if (/\b(lawsuit|sues|litigation|court|settlement)\b/i.test(title)) return 'Litigation';
  if (/\b(regulator|regulatory|antitrust|approval|probe)\b/i.test(title)) return 'Regulation';
  if (/\b(launch|launches|product|unveils|rollout)\b/i.test(title)) return 'Products';
  if (/\b(financing|debt|bond|buyback|dividend|acquisition|merger)\b/i.test(title)) return 'Financing / corporate actions';
  return 'Other';
}
/** Near-identical titles only: opposite actions, numbers or dates cannot silently merge. */
function sameEvent(a: Headline, b: Headline) {
  if (Math.abs(Date.parse(a.publishedAt) - Date.parse(b.publishedAt)) > 48 * 3600000) return false;
  if (key(a.title) === key(b.title)) return true;
  if (newsCategory(a.title) !== newsCategory(b.title)) return false;
  const discriminators = (s: string) => words(s).filter(w => /\d/.test(w) || /^(raises|cuts|beats|misses|falls|rises|not|denies|approves|rejects)$/.test(w)).sort().join('|');
  if (discriminators(a.title) !== discriminators(b.title)) return false;
  const x = new Set(words(a.title)), y = new Set(words(b.title));
  const intersection = [...x].filter(w => y.has(w)).length;
  return intersection >= 6 && intersection / new Set([...x, ...y]).size >= 0.85;
}
export function groupNewsEvents(headlines: Headline[]): NewsEvent[] {
  const groups: NewsEvent[] = [];
  const seen = new Set<string>();
  for (const h of [...headlines].sort((a,b) => b.publishedAt.localeCompare(a.publishedAt))) {
    const url = canonicalNewsUrl(h.url);
    if (!url || !Number.isFinite(Date.parse(h.publishedAt))) continue;
    const id = `${url}|${key(h.title)}`;
    if (seen.has(id)) continue; seen.add(id);
    const existing = groups.find(g => g.coverage.every(c => sameEvent(c, h)));
    if (existing) { existing.coverage.push(h); existing.firstPublishedAt = h.publishedAt; }
    else groups.push({title:h.title,category:newsCategory(h.title),firstPublishedAt:h.publishedAt,lastPublishedAt:h.publishedAt,coverage:[h],publisherCount:0});
  }
  for (const g of groups) g.publisherCount = new Set(g.coverage.map(h => h.publisher.toLowerCase())).size;
  return groups;
}
export const NEWS_ANALYSIS_RULES = 'Use grouped events, not headline volume, as evidence. Event categories are heuristic labels, not verified business impacts. Named publisher counts are not independent corroboration: aggregators and syndication can repeat one source. Cite publication date and original link for material claims. Separate reported facts, company statements, opinion and your interpretation. Explain business impact and opposing evidence; title tone alone does not establish earnings impact. Use only supplied excerpts, label them partial, and do not claim to have read an article body when it is absent. News tone, social opinion and prediction probabilities remain separate. Sparse or unavailable social evidence means insufficient evidence, not neutral. Never infer sentiment shifts without comparable dated samples; sentiment alone cannot determine intrinsic value or a price target.';