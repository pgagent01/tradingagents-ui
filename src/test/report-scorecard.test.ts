import { describe,expect,it } from 'vitest';
import { scoreReport,calibration,scoreAnchor,type ScoreAnchor } from '@/lib/report-scorecard';
const anchor:ScoreAnchor={date:'2025-01-01',price:100,target:120,horizonMonths:12,bear:80,bull:140,recommendation:'BUY',conviction:80};
const row=(date:string,close:number)=>({date,close,high:close+1,low:close-1});
describe('saved report outcome scoring',()=>{
 it('measures 30-day stock return against SPY on the same trading day',()=>{const s=scoreReport(anchor,[row('2025-01-01',100),row('2025-01-31',110)],[row('2025-01-01',200),row('2025-01-31',210)],'2025-02-01');expect(s.windows[0]?.returnPct).toBeCloseTo(10);expect(s.windows[0]?.excessPct).toBeCloseTo(5);expect(s.windows[1]?.status).toBe('pending');});
 it('keeps a 12-month target unjudged at 30 days and records daily touches',()=>{const s=scoreReport(anchor,[row('2025-01-01',100),row('2025-01-31',120)],[row('2025-01-01',200),row('2025-01-31',210)],'2025-02-01');expect(s.target.matured).toBe(false);expect(s.target.firstHit).toBe('2025-01-31');});
 it('excludes future prices and never substitutes missing horizon prices',()=>{const s=scoreReport(anchor,[row('2025-01-01',100),row('2026-01-02',999)],[],'2025-02-01');expect(s.windows[0]?.returnPct).toBeNull();expect(s.target.firstHit).toBeNull();});
 it('computes peak-to-trough close drawdown and keeps HOLD direction neutral',()=>{const s=scoreReport({...anchor,recommendation:'HOLD'},[row('2025-01-01',100),row('2025-01-10',120),row('2025-01-20',90),row('2025-01-31',110)],[row('2025-01-01',200),row('2025-01-31',210)],'2025-02-01');expect(s.windows[0]?.maxDrawdownPct).toBe(-25);expect(s.windows[0]?.directionalExcessPct).toBeNull();});
 it('does not interpret legacy current quotes as analysis-date prices',()=>{expect(scoreAnchor({stock_snapshot:{price:999}},'2025-01-01',null,'HOLD',50).price).toBeNull();});
 it('labels calibration samples below 20 and does not count pending reports',()=>{const s=scoreReport(anchor,[],[],'2025-01-02');expect(calibration([{conviction:80,recommendation:'BUY',score:s}])[2]).toMatchObject({count:0,meanDirectionalExcess:null,smallSample:true});});
});