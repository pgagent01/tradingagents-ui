import { sectionObject } from '@/lib/report-content';
export type FinancialChartRow = { label: string; end: string; revenue: number | null; operatingIncome: number | null; netIncome: number | null; operatingCashFlow: number | null; capex: number | null; freeCashFlow: number | null; grossMargin: number | null; operatingMargin: number | null; netMargin: number | null };
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
const margin=(a:number|null,r:number|null)=>a!==null&&r!==null&&r>0?a/r*100:null;
/** Reads the saved, uniformly shaped SEC annual periods; values in USD billions, missing stays null (a gap, never zero). */
export function financialChartData(sections: unknown): FinancialChartRow[] {
  const f=sectionObject(sectionObject(sectionObject(sections)['external_evidence'])['fundamentals']);
  const annual=Array.isArray(f['annual'])?f['annual']:[];
  const b=(v:number|null)=>v===null?null:v/1e9;
  return annual.map(p=>{const o=sectionObject(p);const revenue=num(o['revenue']),op=num(o['operatingIncome']),net=num(o['netIncome']),gross=num(o['grossProfit']),capex=num(o['capex']);
    const end=String(o['end']??'');
    return {label:`FY${end.slice(0,4)}`,end,revenue:b(revenue),operatingIncome:b(op),netIncome:b(net),operatingCashFlow:b(num(o['operatingCashFlow'])),capex:capex===null?null:-Math.abs(capex)/1e9,freeCashFlow:b(num(o['freeCashFlow'])),grossMargin:margin(gross,revenue),operatingMargin:margin(op,revenue),netMargin:margin(net,revenue)};
  }).filter(r=>r.end).sort((a,c)=>a.end.localeCompare(c.end));
}
/** Bear/base/bull intrinsic values and targets from the saved valuation; unavailable scenarios are dropped. */
export function scenarioChartData(valuation: unknown) {
  const sc=sectionObject(sectionObject(valuation)['intrinsic'])['scenarios'];
  return (Array.isArray(sc)?sc:[]).map(x=>{const s=sectionObject(x);return {name:String(s['name']??''),value:num(s['value']),target:num(s['target'])};}).filter(s=>s.value!==null||s.target!==null);
}
