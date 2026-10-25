import {describe,it,expect} from 'vitest';
import {selectComparableReports,compareNumbers,type ComparableReport} from '@/lib/report-compare';
const report=(id:string,ticker:string,date:string):ComparableReport=>({id,ticker,analysis_date:date,created_at:date,run_id:id,recommendation:'HOLD',price_target:null,conviction_score:null,executive_summary:null,sections:{},total_input_tokens:0,total_output_tokens:0,total_cost_usd:0,is_demo:false,agents:[],models:[],depth:'standard'});
describe('same-stock dated comparisons',()=>{
 it('never compares another stock or the same report twice',()=>{const selected=selectComparableReports([report('old','AAPL','2025-01-01'),report('new','AAPL','2026-01-01'),report('other','MSFT','2026-01-01')],'AAPL','old','other');expect(selected.left?.id).toBe('old');expect(selected.right?.id).toBe('new');expect(selected.eligible).toHaveLength(2);});
 it('requires two distinct reports and leaves unknown changes unavailable',()=>{expect(selectComparableReports([report('only','AAPL','2026-01-01')],'AAPL').right).toBeUndefined();expect(compareNumbers(null,100)).toBeNull();expect(compareNumbers(100,125)).toBe(25);});
});