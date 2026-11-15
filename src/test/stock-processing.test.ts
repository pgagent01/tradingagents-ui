import { it,expect } from 'vitest';
import { comparePrices,processCandles,processStockData } from '@/lib/stock-processing';
import { emptyStock } from '@/lib/stock-data';
const price={source:'primary',ticker:'NEW',price:100,currency:'USD',asOf:'2026-11-15T12:00:00Z',url:'https://example.com/quote',kind:'quote' as const};
it('cross-verifies compatible redundant quotes and flags disagreement without averaging',()=>{
 expect(comparePrices(price,{...price,source:'backup',price:100.5}).status).toBe('consistent');
 const r=comparePrices(price,{...price,source:'backup',price:103});expect(r.status).toBe('conflicting');expect(r.primary.price).toBe(100);
});
it('does not cross-verify different security, currencies or quote dates',()=>{
 for(const changed of [{ticker:'OTHER'},{currency:'GBP'},{asOf:'2026-11-14T12:00:00Z'},{kind:'previous_close' as const}])expect(comparePrices(price,{...price,...changed}).status).toBe('not_comparable');
});
it('withholds invalid and conflicting duplicate OHLCV rather than choosing an arbitrary bar',()=>{
 const c={time:100,open:10,high:12,low:9,close:11,volume:100};
 const r=processCandles([c,{...c},{...c,close:10},{...c,time:101,high:8},{...c,time:102,volume:-1}]);
 expect(r.candles).toEqual([]);expect(r.rejected).toBe(2);expect(r.duplicates).toBe(2);expect(r.conflicts).toBe(1);
});
it.each(['NEWCO','DELL','RR.L','BRK.B','XYZ.AX'])('processes %s without stock-specific branches',ticker=>{
 const d=emptyStock(ticker,ticker);d.price=-1;d.statements.income=[{label:'Net income',value:-50,source:'SEC',accession:'filing-123'}];
 const r=processStockData(d);expect(r.price).toBeNull();expect(r.statements.income[0]).toMatchObject({value:-50,source:'SEC',accession:'filing-123'});
});