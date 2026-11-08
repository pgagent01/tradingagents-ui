import {it,expect} from 'vitest';
import {reviewCalculatedTarget} from '@/lib/report-quality';
const valuation={priceTarget:110,intrinsic:{scenarios:[{target:80},{target:110},{target:140}]}};
it('persists calculated base instead of an out-of-range model price target',()=>{
 const result=reviewCalculatedTarget(200,valuation,100);
 expect(result.target).toBe(110);expect(result.warnings[0]?.code).toBe('model_target_outside_calculated_range');
});
it('does not confuse a valid in-range target with spot intrinsic value',()=>{
 expect(reviewCalculatedTarget(130,valuation,100)).toEqual({target:110,warnings:[]});
});
it('does not invent a calculated target when scenario inputs are unavailable',()=>{
 expect(reviewCalculatedTarget(null,{priceTarget:null},100).target).toBeNull();
});