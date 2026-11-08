import { sectionObject } from './report-content';
export type ScorePrice = { date: string; close: number; high: number; low: number };
export type ScoreAnchor = { date: string; price: number | null; target: number | null; horizonMonths: number | null; bear: number | null; bull: number | null; recommendation: string | null; conviction: number | null };
export function scoreAnchor(sections: unknown, analysisDate: string, target: number | null, recommendation: string | null, conviction: number | null): ScoreAnchor {
  const s=sectionObject(sections),saved=sectionObject(s['scoring_anchor']),v=sectionObject(s['valuation']);
  const number=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>0?x:null;
  // A legacy current quote is not a dated analysis-price observation.
  return {date:typeof saved['date']==='string'?saved['date']:analysisDate,price:number(saved['price']),target:number(saved['target'])??number(target),horizonMonths:number(saved['horizonMonths'])??number(v['horizonMonths']),bear:number(saved['bear']),bull:number(saved['bull']),recommendation,conviction};
}
export function scoreReport(anchor: ScoreAnchor, stock: ScorePrice[], benchmark: ScorePrice[], asOf: string) {
  const clean=(rows:ScorePrice[])=>rows.filter(r=>r.date<=asOf&&Number.isFinite(r.close)&&r.close>0&&Number.isFinite(r.high)&&Number.isFinite(r.low)).sort((a,b)=>a.date.localeCompare(b.date));
  const prices=clean(stock),spy=clean(benchmark);
  const baseline=prices.filter(p=>p.date<=anchor.date).at(-1);
  const base=anchor.price??baseline?.close??null;
  const spyBase=spy.filter(p=>p.date<=(baseline?.date??anchor.date)).at(-1);
  const calendar=(days:number)=>new Date(Date.parse(`${anchor.date}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
  const targetEnd=new Date(`${anchor.date}T00:00:00Z`); targetEnd.setUTCMonth(targetEnd.getUTCMonth()+(anchor.horizonMonths??12));
  const targetDate=targetEnd.toISOString().slice(0,10);
  const windows=[30,90,180,365].map(days=>{
    const due=calendar(days),matured=due<=asOf;
    // First shared trading day on/after the horizon, at most seven days later.
    const end=matured?prices.find(p=>p.date>=due&&p.date<=calendar(days+7)&&spy.some(b=>b.date===p.date)):undefined;
    const spyEnd=spy.find(p=>p.date===end?.date);
    const pct=base!==null&&base>0&&end?(end.close/base-1)*100:null;
    const benchmarkReturn=spyBase&&spyEnd?(spyEnd.close/spyBase.close-1)*100:null;
    const path=end?prices.filter(p=>p.date>anchor.date&&p.date<=end.date):[];
    let peak=base??0,drawdown:number|null=path.length&&peak>0?0:null;
    for(const p of path){peak=Math.max(peak,p.close);if(peak>0)drawdown=Math.min(drawdown??0,(p.close/peak-1)*100);}
    const excess=pct!==null&&benchmarkReturn!==null?pct-benchmarkReturn:null;
    const stance=anchor.recommendation?.includes('BUY')?'buy':anchor.recommendation?.includes('SELL')?'sell':'hold';
    return {days,due,date:end?.date??null,status:!matured?'pending' as const:end&&base?'available' as const:'unavailable' as const,returnPct:pct,benchmarkPct:benchmarkReturn,excessPct:excess,maxDrawdownPct:drawdown,directionalExcessPct:excess===null||stance==='hold'?null:stance==='sell'?-excess:excess};
  });
  const path=prices.filter(p=>p.date>anchor.date&&p.date<=targetDate);
  const hit=(level:number|null)=>level===null||base===null?null:path.find(p=>level>=base?p.high>=level:p.low<=level)?.date??null;
  return {version:1,asOf,anchorDate:anchor.date,baselineDate:anchor.price!==null?anchor.date:baseline?.date??null,baselinePrice:base,baselineBasis:anchor.price!==null?'Saved analysis-date close':'Historical adjusted close; not an original report snapshot',windows,target:{value:anchor.target,due:targetDate,matured:targetDate<=asOf,firstHit:hit(anchor.target),bearHit:hit(anchor.bear),bullHit:hit(anchor.bull)},notes:['Price returns exclude dividends, fees and taxes; Yahoo history is retrospectively split-adjusted. This is outcome measurement, not a point-in-time backtest.','Target touches use daily highs/lows through the target horizon; reaching a target early is not proof of a correct 12-month forecast.','HOLD has no assumed trade direction; SELL directional excess measures avoided underperformance, not a simulated short position.']};
}
export type ReportScorecard = ReturnType<typeof scoreReport>;
export function calibration(rows:{conviction:number|null;recommendation:string|null;score:ReportScorecard}[]) {
  return [{label:'Below 50',min:0,max:49},{label:'50–74',min:50,max:74},{label:'75–100',min:75,max:100}].map(bin=>{
    const usable=rows.filter(r=>r.conviction!==null&&r.conviction>=bin.min&&r.conviction<=bin.max).map(r=>r.score.windows.find(w=>w.days===90)?.directionalExcessPct).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n));
    return {label:bin.label,count:usable.length,meanDirectionalExcess:usable.length?usable.reduce((a,b)=>a+b,0)/usable.length:null,smallSample:usable.length<20};
  });
}