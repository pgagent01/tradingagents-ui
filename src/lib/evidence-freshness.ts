export function resumeEvidencePolicy(analysisDate:string,startedAt:string|null,resumeCount:number,now=new Date()) {
  const today=now.toISOString().slice(0,10),age=startedAt?now.getTime()-Date.parse(startedAt):0;
  const stale=resumeCount>0&&Number.isFinite(age)&&age>24*3600000;
  return {stale,refresh:stale&&analysisDate===today,historical:analysisDate!==today,cutoff:analysisDate};
}