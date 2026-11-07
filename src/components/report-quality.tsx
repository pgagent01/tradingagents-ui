import { reviewReportClaims, type ClaimWarning } from '@/lib/report-quality';
import { sectionObject, contentText } from '@/lib/report-content';
export function ReportQuality({sections,summary,analysisDate}:{sections:unknown;summary:string;analysisDate:string}) {
  const s=sectionObject(sections);const stored=sectionObject(s['analyst_outputs']);
  const texts=Object.fromEntries(Object.entries(stored).map(([agent,v])=>[agent,contentText(sectionObject(v)['content'])]));
  const raw=sectionObject(s['quality_review'])['warnings'];
  const saved:ClaimWarning[]=Array.isArray(raw)?raw.map(sectionObject).filter(w=>['code','section','message','evidence'].every(k=>typeof w[k]==='string')).map(w=>({code:contentText(w['code']),section:contentText(w['section']),message:contentText(w['message']),evidence:contentText(w['evidence'])})):[];
  const computed=reviewReportClaims({...texts,executive_summary:summary,technical_analysis:contentText(s['technical_analysis']),fundamental_analysis:contentText(s['fundamental_analysis']),final_synthesis:contentText(s['final_synthesis'])},s['technical_evidence'],sectionObject(s['external_evidence'])['fundamentals'],analysisDate);
  const warnings=[...saved,...computed.filter(w=>!saved.some(s=>s.code===w.code&&s.section===w.section))];
  return <section aria-label="Evidence consistency review" className="space-y-3 border-t border-border pt-4"><h2 className="text-xl font-semibold">Evidence Consistency Review</h2><p className="text-xs text-muted-foreground">Checks indicator availability and annual financial age against saved evidence, plus saved price-target warnings on newer reports. This is not a complete factual audit.</p>{warnings.length?<ul className="space-y-3">{warnings.map((w,i)=><li key={i} className="border-l-2 border-warning pl-3"><p className="text-sm text-warning">{w.section.replace(/_/g,' ')}: {w.message}</p><p className="mt-1 break-words font-mono text-xs text-muted-foreground">{w.evidence}</p></li>)}</ul>:<p className="text-sm text-muted-foreground">No conflicts detected by these limited checks. Other claims and figures still require source review.</p>}</section>;
}
