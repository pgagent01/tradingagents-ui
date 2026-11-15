import type { ReferenceEvidence } from './reference-evidence';
export function referenceMarkdown(value: ReferenceEvidence | undefined) {
  if(!value)return 'No company references saved.';
  return (['wikipedia','firecrawl','tiingo'] as const).flatMap(provider=>{
    const f=value[provider];if(!f)return [];
    return [`### ${provider==='wikipedia'?'Wikipedia · CC BY-SA':provider}`,`Status: ${f.status} · Retrieved: ${f.fetchedAt} · Cutoff: ${f.cutoff}`,f.note,...f.items.map(i=>`- [${i.title.replace(/[\[\]\n]/g,' ')}](${i.url}) · ${provider==='wikipedia'?'Revision':'Published'} ${i.publishedAt??'unavailable'}\n\n  ${i.text}`)];
  }).join('\n\n');
}