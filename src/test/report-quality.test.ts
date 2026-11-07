import { describe, expect, it } from 'vitest';
import { reviewReportClaims } from '@/lib/report-quality';
describe('bounded evidence claim checks',()=>{
  it('flags unavailable SMA200 claims when warm-up calculation supplied it',()=>{
    expect(reviewReportClaims({technical:'SMA200 is unavailable due to insufficient history.'},{indicators:{sma200:145}},null,'2026-11-07')).toMatchObject([{code:'available_indicator_denied',evidence:'sma200: 145'}]);
  });
  it('does not flag honestly unavailable indicators',()=>{
    expect(reviewReportClaims({technical:'SMA200 is unavailable.'},{indicators:{sma200:null}},null,'2026-11-07')).toEqual([]);
  });
  it('flags financial age against period end, not retrieval time',()=>{
    expect(reviewReportClaims({fundamentals:'Annual financials are over a year old.'},null,{annual:[{end:'2025-11-02'}]},'2026-11-01')[0]?.code).toBe('financial_age_conflict');
    expect(reviewReportClaims({fundamentals:'Annual financials are over a year old.'},null,{annual:[{end:'2025-11-02'}]},'2026-11-07')).toEqual([]);
  });
});