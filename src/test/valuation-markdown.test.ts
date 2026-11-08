import { describe, it, expect } from 'vitest';
import { valuationMarkdown } from '@/lib/report-content';
describe('valuation export',()=>{
 it('shows scenarios and keeps missing values unavailable',()=>{
  const md=valuationMarkdown({status:'estimated',method:'dcf',price:44.77,intrinsicValue:50,priceTarget:53.2,bear:null,base:null,bull:null,intrinsic:{scenarios:[{name:'Base',discountRate:.0855,value:50,target:53.2}]},comparables:{peers:[{ticker:'HPQ'}]},limitations:[]});
  expect(md).toContain('12-month target: $53.20');
  expect(md).toContain('| Base | 8.55% | $50.00 | $53.20 |');
  expect(md).toContain('Peer-implied range: Unavailable / Unavailable / Unavailable');
  expect(md).toContain('Verified peers: HPQ');
 });
});
