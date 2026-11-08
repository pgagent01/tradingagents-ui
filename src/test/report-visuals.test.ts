import { describe, it, expect } from 'vitest';
import { heatTone } from '@/lib/report-visuals';
import { extendedRatios, annualGrowth } from '@/lib/valuation/peer-snapshot';
describe('comparable extra ratios',()=>{
 it('EV = cap + debt - cash; missing debt withholds EV ratios',()=>{
  const r=extendedRatios(100,20,10,50,11,5); expect(r.evSales).toBeCloseTo(2.2); expect(r.evEbit).toBeCloseTo(10); expect(r.fcfMargin).toBeCloseTo(10);
  expect(extendedRatios(100,null,10,50,11,5).evSales).toBeNull();
 });
 it('negative operating income gives no EV/EBIT',()=>{expect(extendedRatios(100,0,0,50,-5,1).evEbit).toBeNull();});
 it('growth needs a positive prior year',()=>{expect(annualGrowth(110,100)).toBeCloseTo(10);expect(annualGrowth(110,0)).toBeNull();expect(annualGrowth(110,null)).toBeNull();});
});
describe('heat map tone',()=>{
 it('within 10% of price is neutral, far above strong green, far below strong red',()=>{
  expect(heatTone(105,100)).toBe('bg-muted'); expect(heatTone(160,100)).toBe('bg-primary/40'); expect(heatTone(40,100)).toBe('bg-destructive/40'); expect(heatTone(5,null)).toBe('bg-muted');
 });
});
