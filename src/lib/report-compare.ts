import { sectionObject,contentText } from '@/lib/report-content';
export type ComparableReport={id:string;ticker:string;created_at:string;run_id:string;recommendation:string|null;risk_level?:string|null;price_target:number|null;conviction_score:number|null;executive_summary:string|null;sections:unknown;total_input_tokens:number;total_output_tokens:number;total_cost_usd:number;analysis_date:string;is_demo:boolean;agents:string[];models:string[];depth:string};
export function selectComparableReports(reports:ComparableReport[],ticker:string,left?:string,right?:string){
  const eligible=reports.filter(r=>r.ticker.toUpperCase()===ticker.toUpperCase()).sort((a,b)=>b.analysis_date.localeCompare(a.analysis_date)||b.created_at.localeCompare(a.created_at));
  const requestedLeft=eligible.find(r=>r.id===left),requestedRight=eligible.find(r=>r.id===right);
  const first=requestedLeft??(requestedRight?eligible.find(r=>r.id!==requestedRight.id):eligible[1]??eligible[0]);
  const second=requestedRight&&requestedRight.id!==first?.id?requestedRight:eligible.find(r=>r.id!==first?.id);
  return {eligible,left:first,right:second};
}
export function compareNumbers(a:number|null|undefined,b:number|null|undefined){return typeof a==='number'&&Number.isFinite(a)&&typeof b==='number'&&Number.isFinite(b)?b-a:null;}
export function comparisonSnapshot(r:ComparableReport){const s=sectionObject(r.sections);const snapshot=sectionObject(s['stock_snapshot']);return {price:typeof snapshot['price']==='number'?snapshot['price']:null,marketCap:typeof snapshot['marketCap']==='number'?snapshot['marketCap']:null,risk:r.risk_level||contentText(s['risk_level'])||'Not recorded',synthesis:contentText(s['final_synthesis'])};}