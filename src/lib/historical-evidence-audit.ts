import {sectionObject} from './report-content';
export function historicalEvidenceAudit(sections:unknown,cutoff:string){
  const s=sectionObject(sections),e=sectionObject(s['external_evidence']),f=sectionObject(e['fundamentals']),news=sectionObject(e['news']),free=sectionObject(e['free']),macro=sectionObject(e['macro']);
  const rows=(v:unknown)=>Array.isArray(v)?v.map(sectionObject):[];
  const violations:string[]=[];
  for(const p of [...rows(f['annual']),...(Object.keys(sectionObject(f['latestQuarter'])).length?[sectionObject(f['latestQuarter'])]:[])]){if(typeof p['filed']==='string'&&p['filed']>cutoff)violations.push(`SEC filing dated ${p['filed']} is after cutoff.`);if(typeof p['end']==='string'&&p['end']>cutoff)violations.push(`Financial period ${p['end']} is after cutoff.`);}
  for(const p of rows(news['filings']))if(typeof p['filed']==='string'&&p['filed']>cutoff)violations.push(`News filing ${p['filed']} is after cutoff.`);
  for(const p of rows(news['headlines']))if(typeof p['publishedAt']==='string'&&p['publishedAt'].slice(0,10)>cutoff)violations.push(`Headline ${p['publishedAt']} is after cutoff.`);
  for(const p of rows(sectionObject(free['earningsReleases'])['items']))if(typeof p['filed']==='string'&&p['filed']>cutoff)violations.push(`Earnings release ${p['filed']} is after cutoff.`);
  for(const p of rows(macro['metrics']))if(typeof p['date']==='string'&&p['date']>cutoff)violations.push(`Macro observation ${p['date']} is after cutoff.`);
  const tech=sectionObject(s['technical_evidence']);for(const p of rows(tech['candles']))if(typeof p['time']==='number'&&new Date(p['time']*1000).toISOString().slice(0,10)>cutoff)violations.push('Technical bar is after cutoff.');
  return {cutoff,status:violations.length?'conflicts' as const:'no_dated_conflicts' as const,violations:[...new Set(violations)],limitations:['Checks saved explicit filing/publication/period/bar dates only; missing provenance is not proof of point-in-time availability.','Free price history is retrospectively adjusted. Untimestamped provider revisions, historical peer membership and missing publication vintages are not certified.']};
}