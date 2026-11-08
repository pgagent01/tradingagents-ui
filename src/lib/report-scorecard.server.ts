import type { EvidenceClient } from './data-cache.server';
import { readDataCache, writeDataCache } from './data-cache.server';
import { historicalDailyCandles } from './stock-data.server';
import { scoreAnchor, scoreReport, type ScorePrice } from './report-scorecard';
import { historicalEvidenceAudit } from './historical-evidence-audit';
export async function reportScorecard(sb:EvidenceClient,userId:string,report:{id:string;ticker:string;sections:unknown;price_target:number|null;recommendation:string|null;conviction_score:number|null},analysisDate:string) {
  const today=new Date().toISOString().slice(0,10),key=`v1:${report.id}:${today}`;
  const cached=await readDataCache(sb,userId,'report-scorecard',key);
  if(cached?.fresh)return {...cached.payload as unknown as ReturnType<typeof scoreReport>,dateAudit:historicalEvidenceAudit(report.sections,analysisDate)};
  const start=Date.parse(`${analysisDate}T00:00:00Z`),end=new Date(`${analysisDate}T00:00:00Z`);end.setUTCMonth(end.getUTCMonth()+12);end.setUTCDate(end.getUTCDate()+7);
  const cutoff=new Date(Math.min(end.getTime(),Date.parse(`${today}T00:00:00Z`))).toISOString().slice(0,10);
  const days=Math.min(800,Math.max(400,Math.ceil((Date.parse(cutoff)-start)/86400000)+14));
  const [stock,spy]=await Promise.all([historicalDailyCandles(report.ticker,cutoff,days).catch(()=>null),historicalDailyCandles('SPY',cutoff,days).catch(()=>null)]);
  const map=(rows:NonNullable<typeof stock>['candles']|undefined):ScorePrice[]=>(rows??[]).map(c=>({date:new Date(c.time*1000).toISOString().slice(0,10),close:c.close,high:c.high,low:c.low}));
  const score=scoreReport(scoreAnchor(report.sections,analysisDate,report.price_target,report.recommendation,report.conviction_score),map(stock?.candles),map(spy?.candles),today);
  await writeDataCache(sb,userId,'report-scorecard',key,score,stock&&spy?6*3600000:5*60000);
  return {...score,dateAudit:historicalEvidenceAudit(report.sections,analysisDate)};
}