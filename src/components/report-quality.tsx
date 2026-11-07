import { reviewReportClaims } from '@/lib/report-quality';
import { sectionObject, contentText } from '@/lib/report-content';
export function ReportQuality({sections,summary,analysisDate}:{sections:unknown;summary:string;analysisDate:string}) {
  const s=sectionObject(sections);const stored=sectionObject(s['analyst_outputs']);
  const texts=Object.fromEntries(Object.entries(stored).map(([agent,v])=>[agent,contentText(sectionObject(v)['content'])]));
  const warnings=reviewReportClaims({...texts,executive_summary:summary,technical_analysis:contentText(s['technical_analysis']),fundamental_analysis:contentText(s['fundamental_analysis']),final_synthesis:contentText(s['final_synthesis'])},s['technical_evidence'],sectionObject(s['external_evidence'])['fundamentals'],analysisDate);
  return <section aria-label="Evidence consistency review" className="space-y-3 border-t border-border pt-4"><h2 className="text-xl font-semibold">Evidence Consistency Review</h2><p className="text-xs text-muted-foreground">Checks indicator availability and annual financial age against saved evidence. This is not a complete factual audit.</p>{warnings.length?<ul className="space-y-3">{warnings.map((w,i)=><li key={i} className="border-l-2 border-warning pl-3"><p className="text-sm text-warning">{w.section.replace(/_/g,' ')}: {w.message}</p><p className="mt-1 break-words font-mono text-xs text-muted-foreground">{w.evidence}</p></li>)}</ul>:<p className="text-sm text-muted-foreground">No conflicts detected by these limited checks. Other claims and figures still require source review.</p>}</section>;
}
