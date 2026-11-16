import type { NewsEvidence, Headline } from './research-evidence';
import type { ReferenceEvidence } from './reference-evidence';
import { canonicalNewsUrl, groupNewsEvents } from './news-quality';
import type { EvidenceAudit } from './evidence-contract';

export function evidenceId(url: string) {
  let n=2166136261;for(const c of url)n=Math.imul(n^c.charCodeAt(0),16777619);
  return `NEWS-${(n>>>0).toString(16)}`;
}
/** Retain every retrieval service, but count a canonical original article once. */
export function unifiedNews(news: NewsEvidence, references: ReferenceEvidence, entityId = 'unresolved'): NewsEvidence {
  // Events already include the selected display headlines; do not count that projection as another retrieval.
  const eventCoverage=(news.events??[]).flatMap(e=>e.coverage);
  const headlines: Headline[] = [...eventCoverage,...news.headlines.filter(h=>!eventCoverage.some(c=>c.url===h.url&&c.feed===h.feed&&c.publishedAt===h.publishedAt&&c.title===h.title))];
  const audit:EvidenceAudit={version:'news-v2',scope:'Normalized adapter candidates only; upstream filtering and provider coverage are not a complete news census.',received:0,retained:0,duplicates:0,rejected:0,truncated:0,conflicts:0,reasons:{},records:[]};
  const record=(reason:string,evidenceId?:string,alternatives?:EvidenceAudit['records'][number]['alternatives'])=>{audit.reasons[reason]=(audit.reasons[reason]??0)+1;if(audit.records.length<50)audit.records.push({reason,...(evidenceId?{evidenceId}:{}),...(alternatives?{alternatives}:{})});};
  const states = { ...news.sourceStates };
  for (const [provider, feed] of [['firecrawl',references.firecrawl]] as const) {
    if (!feed) continue;
    states[provider] = { status:feed.status==='historical_unavailable'?'historical_unavailable':feed.httpStatus?'failed':feed.status==='available'?'available':'empty',count:feed.items.length,reason:feed.note };
    for (const item of feed.items) headlines.push({ title:item.title,publisher:canonicalNewsUrl(item.url)?new URL(item.url).hostname:provider,publishedAt:item.publishedAt??'',url:item.url,excerpt:item.text.slice(0,1800),excerptSource:'search_excerpt',feed:provider });
  }
  const unique = new Map<string, Headline>();
  const disputed=new Set<string>();
  for (const h of headlines.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt))) {
    audit.received++;
    const url=canonicalNewsUrl(h.url); const time=Date.parse(h.publishedAt);
    const cutoff=Math.min(Date.parse(`${news.cutoff}T23:59:59.999Z`),Date.parse(news.fetchedAt));
    const reason=!url?'invalid_url':!h.title.trim()?'missing_title':!Number.isFinite(time)?'missing_or_invalid_date':time<Date.parse(news.windowStart)?'before_window':!Number.isFinite(cutoff)||time>cutoff?'after_cutoff':null;
    if(reason){audit.rejected++;record(reason);continue;}
    if(!url)continue;
    const clean={...h,title:h.title.replace(/\s+/g,' ').trim().slice(0,300),...(h.excerpt?{excerpt:h.excerpt.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,1800)}:{})};
    const previous=unique.get(url);
    const retrievals=[...new Set([...(previous?.retrievalServices??[]),...(h.retrievalServices??[]),h.feed??'news'])];
    if(previous){
      audit.duplicates++;
      const dateConflict=previous.publishedAt.slice(0,10)!==h.publishedAt.slice(0,10);
      if(dateConflict)disputed.add(url);
      const textConflict=!!previous.excerpt&&!!clean.excerpt&&previous.excerpt!==clean.excerpt;
      if(dateConflict||textConflict){audit.conflicts++;record(dateConflict?'same_url_date_conflict':'same_url_excerpt_difference',previous.evidenceId,[{publishedAt:previous.publishedAt,...(previous.excerpt?{excerpt:previous.excerpt.slice(0,500)}:{}),service:previous.feed??'news'},{publishedAt:h.publishedAt,...(clean.excerpt?{excerpt:clean.excerpt.slice(0,500)}:{}),service:h.feed??'news'}]);}
      // A disputed publication day is not safe dated evidence. Preserve both alternatives in the audit.
      unique.set(url,{...previous,retrievalServices:retrievals,...(!previous.excerpt&&clean.excerpt?{excerpt:clean.excerpt,excerptSource:clean.excerptSource}:{})});
    }
    else unique.set(url,{...clean,url,evidenceId:evidenceId(url),retrievalServices:retrievals,provenance:{kind:'news',entityId,source:h.publisher,sourceUrl:url,retrievedAt:news.fetchedAt,effectiveAt:h.publishedAt,publishedAt:h.publishedAt,version:'news-v2'}});
  }
  const eligible=[...unique.values()].filter(h=>!disputed.has(h.url));
  audit.rejected+=disputed.size;
  if(disputed.size)audit.reasons['disputed_article_withheld']=disputed.size;
  const selected=eligible.slice(0,40);audit.retained=selected.length;audit.truncated=Math.max(0,eligible.length-selected.length);
  if(audit.truncated)record('display_limit');
  const events=groupNewsEvents(selected);
  for(const event of events)for(const article of event.coverage){
    const matching=event.coverage.filter(other=>other.url!==article.url&&article.excerpt&&article.excerpt.length>=120&&other.excerpt===article.excerpt).map(other=>other.evidenceId??evidenceId(other.url));
    if(matching.length)article.possibleSyndication=matching;
  }
  return {...news,headlines:selected,events,sourceStates:states,audit,status:selected.length&&news.filings.length?'available':selected.length||news.filings.length?'partial':'unavailable',notes:[...news.notes,'Unified original-article coverage; retrieval services are not independent publishers. At most 40 dated articles retained. Audit is bounded and excludes upstream discarded candidates; possible syndication is not proof of a common original source. Same-URL publication-day conflicts are withheld; differing excerpts remain alternatives, not independent corroboration.']};
}
export function technicalNewsEvents(news: NewsEvidence, start: string | null, end: string | null) {
  if(!start||!end)return [];
  return (news.events??[]).filter(e=>e.firstPublishedAt.slice(0,10)>=start.slice(0,10)&&e.firstPublishedAt.slice(0,10)<=end.slice(0,10)).slice(0,12).map(e=>({title:e.title,category:e.category,publishedAt:e.firstPublishedAt,evidenceIds:e.coverage.map(c=>c.evidenceId),urls:e.coverage.map(c=>c.url)}));
}