import { describe, expect, it } from 'vitest';
import { secAnchor, selectSecFact } from '@/lib/sec-periods';
import { parseSecFinancials } from '@/lib/stock-data';
import { fundamentalEvidence } from '@/lib/research-evidence';
const row=(end:string,val:number,start='2026-01-01',accn='same')=>({start,end,val,accn,filed:'2026-11-01',form:'10-Q'});
const data=(rows:ReturnType<typeof row>[])=>({Revenues:{units:{USD:rows}}});
describe('SEC quarter alignment',()=>{
  it('derives Q2 from same-filing same-concept YTD comparatives',()=>{
    const facts=data([row('2026-03-31',100),row('2026-06-30',260)]);const anchor=secAnchor(facts,['Revenues'],'quarter');
    expect(anchor).not.toBeNull();if(!anchor)throw Error('Missing anchor');
    expect(selectSecFact(facts,['Revenues'],anchor,'quarter')).toMatchObject({value:160,derived:true,start:'2026-04-01',inputs:[{value:260},{value:100}]});
  });
  it('derives Q3 from Q2 rather than Q1',()=>{
    const facts=data([row('2026-03-31',100),row('2026-06-30',260),row('2026-09-30',450)]);const anchor=secAnchor(facts,['Revenues'],'quarter');if(!anchor)throw Error('Missing anchor');
    expect(selectSecFact(facts,['Revenues'],anchor,'quarter')?.value).toBe(190);
  });
  it('prefers a directly reported standalone quarter',()=>{
    const facts=data([row('2026-03-31',100),row('2026-06-30',260),row('2026-06-30',155,'2026-04-01')]);const anchor=secAnchor(facts,['Revenues'],'quarter');if(!anchor)throw Error('Missing anchor');
    expect(selectSecFact(facts,['Revenues'],anchor,'quarter')).toMatchObject({value:155,derived:false});
  });
  it('withholds YTD when the prior period comes from another filing version',()=>{
    const facts=data([row('2026-03-31',100,'2026-01-01','old'),row('2026-06-30',260)]);
    expect(parseSecFinancials({facts:{'us-gaap':facts}},null,'quarter').statements.income[0]?.value).toBeNull();
    expect(fundamentalEvidence({facts:{'us-gaap':facts}},'2026-11-07').latestQuarter?.revenue).toBeNull();
  });
  it('does not combine different annual start dates or restated versions',()=>{
    const anchor={...row('2025-12-31',200,'2025-01-01'),form:'10-K'};
    const facts={...data([anchor]),NetIncomeLoss:{units:{USD:[{...anchor,val:50,start:'2024-12-01'},{...anchor,val:90,accn:'other'}]}}};
    expect(selectSecFact(facts,['NetIncomeLoss'],anchor,'annual')).toBeNull();
  });
  it('excludes facts with future period ends even if filed before cutoff',()=>{
    expect(secAnchor(data([row('2026-09-30',450)]),['Revenues'],'quarter','2026-06-30')).toBeNull();
  });
});