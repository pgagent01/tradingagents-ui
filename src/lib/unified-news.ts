import type { NewsEvidence, Headline } from './research-evidence';
import type { ReferenceEvidence } from './reference-evidence';
import { canonicalNewsUrl, groupNewsEvents } from './news-quality';

export function evidenceId(url: string) {
  let n=2166136261;for(const c of url)n=Math.imul(n^c.charCodeAt(0),16777619);
  return `NEWS-${(n>>>0).toString(16)}`;
}
/** Retain every retrieval service, but count a canonical original article once. */
export function unifiedNews(news: NewsEvidence, references: ReferenceEvidence): NewsEvidence {
  const headlines: Headline[] = [...news.headlines,...(news.events??[]).flatMap(e=>e.coverage)];
  const states = { ...news.sourceStates };
  for (const [provider, feed] of [['firecrawl',references.firecrawl],['tiingo',references.tiingo]] as const) {
    if (!feed) continue;
    states[provider] = { status:feed.status==='historical_unavailable'?'historical_unavailable':feed.httpStatus?'failed':feed.status==='available'?'available':'empty',count:feed.items.length,reason:feed.note };
    for (const item of feed.items) if(item.publishedAt&&canonicalNewsUrl(item.url))headlines.push({ title:item.title,publisher:new URL(item.url).hostname,publishedAt:item.publishedAt,url:item.url,excerpt:item.text.slice(0,1800),excerptSource:'search_excerpt',feed:provider });
  }
  const unique = new Map<string, Headline>();
  for (const h of headlines.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt))) {
    const url=canonicalNewsUrl(h.url); const time=Date.parse(h.publishedAt);
    if(!url||!Number.isFinite(time)||time<Date.parse(news.windowStart)||time>Date.parse(`${news.cutoff}T23:59:59.999Z`))continue;
    if(h.excerpt)h.excerpt=h.excerpt.slice(0,1800);
    const previous=unique.get(url);
    const retrievals=[...new Set([...(previous?.retrievalServices??[]),h.feed??'news'])];
    if(previous){unique.set(url,{...previous,retrievalServices:retrievals,...(!previous.excerpt&&h.excerpt?{excerpt:h.excerpt,excerptSource:h.excerptSource}:{})});}
    else unique.set(url,{...h,url,evidenceId:evidenceId(url),retrievalServices:retrievals});
  }
  const selected=[...unique.values()].slice(0,40);
  return {...news,headlines:selected,events:groupNewsEvents(selected),sourceStates:states,status:selected.length||news.filings.length?'partial':news.status,notes:[...news.notes,'Unified original-article coverage; retrieval services are not independent publishers. At most 40 dated articles retained.']};
}
export function technicalNewsEvents(news: NewsEvidence, start: string | null, end: string | null) {
  if(!start||!end)return [];
  return (news.events??[]).filter(e=>e.firstPublishedAt.slice(0,10)>=start.slice(0,10)&&e.firstPublishedAt.slice(0,10)<=end.slice(0,10)).slice(0,12).map(e=>({title:e.title,category:e.category,publishedAt:e.firstPublishedAt,evidenceIds:e.coverage.map(c=>c.evidenceId),urls:e.coverage.map(c=>c.url)}));
}