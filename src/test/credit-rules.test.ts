import {describe,it,expect} from 'vitest';
import {calculateCredits} from '@/lib/credit-rules';
import {tokenBudget,LOOKBACKS,PRESETS} from '@/lib/research-config';
const rates={input:[{min:0,cost:'0.00004'}],output:[{min:0,cost:'0.0002'}],cacheRead:[{min:0,cost:'0.000004'}],cacheWrite:[]};
describe('per-call credit accounting',()=>{
  it('separates cached and uncached prompt tokens',()=>expect(calculateCredits(rates,1000,100,500)).toBeCloseTo(0.042));
  it('keeps unavailable cache rates unknown, never zero',()=>expect(calculateCredits(rates,1000,100,0,50)).toBeNull());
  it('includes output tokens in the credit estimate',()=>expect(calculateCredits(rates,0,100)).toBeCloseTo(0.02));
  it('uses the matching context-length rate tier',()=>expect(calculateCredits({...rates,input:[{min:0,max:99,cost:'1'},{min:100,cost:'2'}]},100,0)).toBe(200));
});
describe('requested research scope',()=>{
  it('offers exhaustive at eight times quick budget',()=>expect(tokenBudget('exhaustive').input).toBe(tokenBudget('quick').input*8));
  it('preserves 30, 90 and one year lookbacks',()=>expect(LOOKBACKS.map(l=>l.days)).toEqual([30,90,365]));
  it('deep value includes fundamental and risk analysts',()=>expect(PRESETS[2].agents).toEqual(['fundamentals','risk','debate']));
});