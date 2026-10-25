export type Tier={cost:string;min:number;max?:number};
export type CreditRates={input:Tier[];output:Tier[];cacheRead:Tier[];cacheWrite:Tier[]};
function rate(tiers:Tier[],context:number) { const tier=[...tiers].sort((a,b)=>b.min-a.min).find(t=>context>=t.min&&(t.max===undefined||context<=t.max));const n=tier?Number(tier.cost):NaN;return Number.isFinite(n)&&n>=0?n:null; }
export function calculateCredits(rates:CreditRates,input:number,output:number,cacheRead=0,cacheWrite=0) {
  if([input,output,cacheRead,cacheWrite].some(n=>!Number.isFinite(n)||n<0)||cacheRead+cacheWrite>input)return null;
  const ir=rate(rates.input,input),or=rate(rates.output,input),cr=rate(rates.cacheRead,input),cw=rate(rates.cacheWrite,input);
  if(ir===null||or===null||(cacheRead>0&&cr===null)||(cacheWrite>0&&cw===null)) return null;
  return Math.max(0,input-cacheRead-cacheWrite)*ir+output*or+cacheRead*(cr??0)+cacheWrite*(cw??0);
}