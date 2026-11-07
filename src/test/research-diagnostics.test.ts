import { describe,it,expect } from 'vitest';
import { failureDiagnostic } from '@/lib/research-diagnostics';
describe('safe execution diagnostics',()=>{
 it('identifies storage failure without retrying billed work',()=>{expect(failureDiagnostic('run',{stage:'report_finalize',agent:'synthesis'},500,false)).toMatchObject({code:'report_storage_failed',stage:'report_finalize',automatic_retry:false});});
 it('identifies quota and cancellation without provider bodies',()=>{expect(failureDiagnostic('run',{stage:'model_stream',agent:'news'},429,false).code).toBe('rate_limited');expect(failureDiagnostic('run',{stage:'result_save',agent:'risk'},500,true)).toMatchObject({code:'cancelled',status:499});});
});