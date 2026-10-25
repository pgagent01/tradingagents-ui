export type AuditPoint = { day:string; runs:number; input:number; output:number; usd:number; credits:number|null; unknown:number };
export function summarizeUsage(points:AuditPoint[]) {
  return points.reduce((sum,p)=>({runs:sum.runs+p.runs,input:sum.input+p.input,output:sum.output+p.output,usd:sum.usd+p.usd,credits:sum.credits+(p.credits??0),unknown:sum.unknown+p.unknown}),{runs:0,input:0,output:0,usd:0,credits:0,unknown:0});
}
export function dailyUsage(points:AuditPoint[],from:string,to:string) {
  const grouped=new Map<string,AuditPoint>();
  for(const p of points.filter(p=>p.day>=from&&p.day<=to)) {
    const prior=grouped.get(p.day)??{day:p.day,runs:0,input:0,output:0,usd:0,credits:0,unknown:0};
    const sum=summarizeUsage([prior,p]);grouped.set(p.day,{day:p.day,...sum,credits:sum.unknown>0?null:sum.credits});
  }
  return [...grouped.values()].sort((a,b)=>a.day.localeCompare(b.day));
}
export function modelEfficiency(input:number,output:number,usd:number) {
  const total=input+output;return total>0?usd/total*1000:null;
}