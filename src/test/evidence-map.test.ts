import { it,expect } from 'vitest';
import { researchDataMap } from '@/lib/evidence-map';
it('does not describe disconnected social data as analyst inputs',()=>{
 const rows=researchDataMap({macro:{status:'unavailable',asOf:'2026-11-15',fetchedAt:null,note:'',metrics:[]},predictions:{status:'unavailable',fetchedAt:null,note:'',markets:[]}});
 expect(rows.some(r=>/Massive|Tiingo/.test(r.source))).toBe(false);
 expect(rows.find(r=>r.source==='Direct social posts')?.state).toBe('unavailable');
 expect(rows.find(r=>r.source==='SEC financials')?.agents).toEqual(['fundamentals','risk','debate','synthesis']);
});