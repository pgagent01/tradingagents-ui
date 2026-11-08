import { describe,it,expect } from 'vitest';
import { valuationBalance } from '@/lib/valuation/financial-inputs';
const anchor={accn:'A',end:'2026-09-30',filed:'2026-10-29',form:'10-Q'};
const fact=(value:number)=>({units:{USD:[{...anchor,val:value}]}});
const dei=(rows:Record<string,unknown>[])=>({EntityCommonStockSharesOutstanding:{units:{shares:rows}}});
describe('Alphabet filing inputs',()=>{
 it('recognizes explicitly reported zero commercial paper with complete debt components',()=>{
  const r=valuationBalance({LongTermDebtNoncurrent:fact(125102e6),LongTermDebtCurrent:fact(1016e6),CommercialPaper:fact(0)},anchor,'2026-11-08');
  expect(r.debt?.value).toBe(126118e6);
 });
 it('does not assume missing short-term borrowings are zero',()=>{
  expect(valuationBalance({LongTermDebtNoncurrent:fact(125102e6),LongTermDebtCurrent:fact(1016e6)},anchor,'2026-11-08').debt).toBeNull();
 });
 it('deduplicates cover-page facts and never sums different cover dates',()=>{
  const rows=[{...anchor,end:'2026-10-20',val:12e9},{...anchor,end:'2026-10-20',val:12e9},{...anchor,end:'2026-10-01',val:13e9}];
  expect(valuationBalance({},anchor,'2026-11-08',dei(rows)).shares?.value).toBe(12e9);
 });
 it('withholds ambiguous share-class counts without dimension identities',()=>{
  expect(valuationBalance({},anchor,'2026-11-08',dei([{...anchor,end:'2026-10-20',val:6e9},{...anchor,end:'2026-10-20',val:5e9}])).shares).toBeNull();
 });
});