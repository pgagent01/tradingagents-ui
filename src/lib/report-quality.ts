import { sectionObject } from '@/lib/report-content';
export type ClaimWarning = { code: string; section: string; message: string; evidence: string };
/** Limited checks, never a full audit or a rewrite of saved conclusions. */
export function reviewReportClaims(texts: Record<string,string>, technical: unknown, fundamentals: unknown, analysisDate: string): ClaimWarning[] {
  const indicators=sectionObject(sectionObject(technical)['indicators']);
  const f=sectionObject(fundamentals);const annual=Array.isArray(f['annual'])?f['annual'].map(sectionObject):[];const latest=annual.at(-1);
  const age=typeof latest?.['end']==='string'?(Date.parse(analysisDate)-Date.parse(latest['end']))/86400000:null;
  const warnings:ClaimWarning[]=[];
  for(const [section,text] of Object.entries(texts)) {
    const sentences=text.split(/(?<=[.!?])\s+|\n/);
    for(const key of ['sma20','sma50','sma200','rsi14','atr14','macd12_26_9']) {
      const label=key.startsWith('sma')?`SMA\\s*${key.slice(3)}|${key.slice(3)}[- ]day (?:simple )?moving average`:key.startsWith('rsi')?'\\bRSI\\b':key.startsWith('atr')?'\\bATR\\b':'\\bMACD\\b';
      if(indicators[key]!==null&&indicators[key]!==undefined&&sentences.some(s=>new RegExp(label,'i').test(s)&&/(?:not (?:available|supplied|provided|calculated)|unavailable|missing|not enough|insufficient)/i.test(s)))warnings.push({code:'available_indicator_denied',section,message:`The text describes ${key.toUpperCase()} as unavailable, but the saved calculation contains it.`,evidence:`${key}: ${JSON.stringify(indicators[key])}`});
    }
    if(age!==null&&age>=0&&age<365&&sentences.some(s=>/financial|fiscal|annual|FY\d|10-K/i.test(s)&&/(?:more than|over|older than) (?:a|one|1) year|year[- ]old/i.test(s)))warnings.push({code:'financial_age_conflict',section,message:'The text describes annual financial evidence as over a year old, but the latest saved fiscal period is less than 365 days before analysis.',evidence:`Period end ${latest?.['end']}; analysis ${analysisDate}; ${Math.floor(age)} days.`});
  }
  return warnings;
}
export function claimReviewPrompt(technical:unknown,fundamentals:unknown,analysisDate:string) {
  const f=sectionObject(fundamentals);const annual=Array.isArray(f['annual'])?f['annual'].map(sectionObject):[];
  return '\nEvidence consistency rules: saved calculated indicators are authoritative for availability, even when lookback bars alone are fewer than the indicator period (warm-up bars are separate). Do not repeat prior claims that contradict these calculations. Financial age uses period end relative to analysis date, NOT retrieval time; filing date is separate. Annual, standalone quarter, YTD and TTM values must never be interchanged.\n'+JSON.stringify({analysisDate,latestAnnualPeriod:annual.at(-1)?.['end']??null,latestAnnualFiled:annual.at(-1)?.['filed']??null,indicators:sectionObject(technical)['indicators']??null});
}
