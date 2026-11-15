import { describe, expect, it } from 'vitest';
import { canonicalNewsUrl, groupNewsEvents } from '@/lib/news-quality';
import { isRelevantHeadline, mergeHeadlines, relevanceTerms, rssHeadlines, yahooHeadlines } from '@/lib/research-evidence';
const h = {title:'Pfizer raises full year earnings guidance after strong quarter',publisher:'Reuters',publishedAt:'2026-11-14T10:00:00Z',url:'https://news.example/a'};
describe('news quality rules', () => {
  it('preserves semantic query values while removing tracking', () => {
    expect(canonicalNewsUrl('https://news.example/a?id=2&utm_source=x#top')).toBe('https://news.example/a?id=2');
    expect(mergeHeadlines([[h,{...h,title:'Pfizer announces new product',url:'https://news.example/a?id=2'}]])).toHaveLength(2);
    expect(canonicalNewsUrl('https://secret@news.example/a')).toBeNull();
  });
  it('retains repeated coverage in one event without counting duplicate feed URLs', () => {
    const g = groupNewsEvents([h,{...h,url:h.url+'?utm_source=x'},{...h,publisher:'Yahoo Finance',url:'https://finance.example/b'}]);
    expect(g).toHaveLength(1); expect(g[0]?.coverage).toHaveLength(2); expect(g[0]?.publisherCount).toBe(2);
  });
  it('does not merge contradictory actions or repeated stories beyond 48 hours', () => {
    expect(groupNewsEvents([h,{...h,title:h.title.replace('raises','cuts'),url:'https://news.example/b'}])).toHaveLength(2);
    expect(groupNewsEvents([h,{...h,publishedAt:'2026-11-10T10:00:00Z',url:'https://news.example/b'}])).toHaveLength(2);
  });
  it('rejects ambiguous bare symbols and company substring matches', () => {
    expect(isRelevantHeadline('A CAT sits on a roof',relevanceTerms('CAT','Caterpillar Inc'))).toBe(false);
    expect(isRelevantHeadline('$CAT earnings rise',relevanceTerms('CAT','Caterpillar Inc'))).toBe(true);
    expect(isRelevantHeadline('Caterpillar reports earnings',relevanceTerms('CAT','Caterpillar Inc'))).toBe(true);
    expect(isRelevantHeadline('Alphabetical sorting improves',relevanceTerms('GOOGL','Alphabet Inc'))).toBe(false);
    expect(isRelevantHeadline('Berkshire reports earnings',relevanceTerms('BRK-B','Berkshire Hathaway Inc'))).toBe(true);
  });
  it('retains only bounded publisher-feed excerpts and drops future publication', () => {
    const xml = '<rss><item><title>Pfizer earnings</title><link>https://news.example/a</link><pubDate>Sat, 14 Nov 2026 10:00:00 GMT</pubDate><description><![CDATA[<p>Pfizer increased its guidance.</p>]]></description></item></rss>';
    expect(rssHeadlines(xml,'2026-11-15T12:00:00Z','2026-11-01T00:00:00Z','Yahoo Finance',relevanceTerms('PFE','Pfizer'))[0]).toMatchObject({excerpt:'Pfizer increased its guidance.',excerptSource:'publisher_feed'});
    expect(rssHeadlines(xml,'2026-11-13T12:00:00Z','2026-11-01T00:00:00Z','Yahoo Finance',relevanceTerms('PFE','Pfizer'))).toEqual([]);
    expect(rssHeadlines(xml,'2026-11-15T12:00:00Z','2026-11-01T00:00:00Z','Google News',relevanceTerms('PFE','Pfizer'))[0]?.excerpt).toBeUndefined();
  });
  it('rejects invalid Yahoo timestamps without throwing', () => {
    expect(yahooHeadlines({news:[{title:'Pfizer',link:h.url,providerPublishTime:1e100}]},'2026-11-15T23:59:59Z','2026-11-01T00:00:00Z')).toEqual([]);
  });
});