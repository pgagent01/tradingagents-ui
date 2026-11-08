import { describe, it, expect } from 'vitest';
import { periodChange, snapshotRatios } from '@/lib/valuation/peer-snapshot';
const day=86400, c=(d:number,close:number)=>({time:d*day,open:close,high:close,low:close,close,volume:0});
describe('peer snapshot',()=>{
 it('measures 30-day change from the last close on/before 30 days earlier',()=>{ expect(periodChange([c(0,100),c(10,80),c(30,90),c(31,95),c(60,99)],30)).toBeCloseTo(10); });
 it('returns null when history is shorter than the window',()=>{ expect(periodChange([c(300,100),c(400,110)],365)).toBeNull(); });
 it('withholds P/E for loss makers but keeps P/S',()=>{ expect(snapshotRatios(1000,500,-10)).toMatchObject({pe:null,ps:2,netMargin:-2}); expect(snapshotRatios(1000,500,50).pe).toBe(20); });
});
