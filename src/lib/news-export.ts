import type { NewsEvidence } from './research-evidence';
import { canonicalNewsUrl } from './news-quality';
/** Render the immutable evidence only; no network calls or live enrichment. */
export function newsEvidenceMarkdown(news: NewsEvidence | null | undefined) {
  if (!news) return 'No news evidence saved.';
  const lines = [`Retrieved: ${news.fetchedAt} · Window: ${news.windowStart} → ${news.cutoff}`, ...news.notes.map(n => `- ${n}`)];
  for (const [name,state] of Object.entries(news.sourceStates ?? {})) lines.push(`- ${name}: ${state.status} (${state.count} relevant items)`);
  for (const event of news.events ?? []) {
    lines.push('',`### ${event.title}`,`${event.category} (heuristic) · ${event.coverage.length} coverage items · ${event.publisherCount} named publishers, not independent corroboration`);
    for (const h of event.coverage) {
      const url = canonicalNewsUrl(h.url);
      lines.push(`- ${h.publishedAt} · ${h.publisher}${url?` · ${url}`:''}`);
      if (h.excerpt) lines.push(`  Partial publisher-feed excerpt: ${h.excerpt}`);
    }
  }
  if (!news.events?.length) for (const h of news.headlines) lines.push(`- ${h.publishedAt} · ${h.title} · ${h.publisher} · ${canonicalNewsUrl(h.url) ?? 'Link unavailable'}`);
  return lines.join('\n');
}