import { sectionObject,contentText } from '@/lib/report-content';
export type ComparableReport={id:string;ticker:string;created_at:string;run_id:string;recommendation:string|null;price_target:number|null;conviction_score:number|null;executive_summary:string|null;sections:unknown;total_input_tokens:number;total_output_tokens:number;total_cost_usd:number;analysis_date:string;is_demo:boolean;agents:string[];models:string[];depth:string};
export function selectComparableReports(reports:ComparableReport[],ticker:string,left?:string,right?:string){
  const eligible=reports.filter(r=>r.ticker===ticker).sort((a,b)=>b.analysis_date.localeCompare(a.analysis_date)||b.created_at.localeCompare(a.created_at));
  const first=eligible.find(r=>r.id===left)??eligible[1]??eligible[0];const second=eligible.find(r=>r.id===right&&r.id!==first?.id)??eligible.find(r=>r.id!==first?.id);
  return {eligible,left:first,right:second};
}
export function compareNumbers(a:number|null|undefined,b:number|null|undefined){return typeof a==='number'&&typeof b==='number'?b-a:null;}
export function comparisonSnapshot(r:ComparableReport){const s=sectionObject(r.sections);const snapshot=sectionObject(s['stock_snapshot']);return {price:typeof snapshot['price']==='number'?snapshot['price']:null,marketCap:typeof snapshot['marketCap']==='number'?snapshot['marketCap']:null,risk:contentText(s['risk_level'])||'Not recorded',synthesis:contentText(s['final_synthesis'])};}