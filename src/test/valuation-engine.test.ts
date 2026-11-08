import { describe, expect, it } from 'vitest';
import { dcfValue, excessReturnValue, ffoValue, scenarioValue, blendedCostOfCapital, twelveMonthTarget } from '@/lib/valuation/methods';
import { eligiblePeers, quantile, summarizePeers, type Peer, type ComparableEvidence } from '@/lib/valuation/comparables';
import { selectMethod } from '@/lib/valuation/select-method';
import { valuationEvidence } from '@/lib/valuation/engine';
const peer = (ticker: string, marketCap = 100, pe: number | null = 20): Peer => ({ ticker, company: ticker, marketCap, industry: 'Software', currency: 'USD', date: '2026-11-08', source: 'https://finance.yahoo.com/', multiples: { pe, forwardPe: null, evSales: null, evEbitda: null, pFcf: null, pb: null } });
describe('deterministic valuation formulas', () => {
  it('discounts business cash flow then subtracts net debt exactly once', () => {
    expect(dcfValue({ cashFlows: [100], discountRate: .1, terminalGrowth: 0, netDebt: 100, shares: 10 }).value).toBeCloseTo(90);
  });
  it('rejects terminal growth equal to discount rate', () => {
    expect(dcfValue({ cashFlows: [100], discountRate: .03, terminalGrowth: .03, netDebt: 0, shares: 10 }).value).toBeNull();
  });
  it('requires positive terminal cash flow even after interim losses', () => {
    expect(dcfValue({ cashFlows: [100,-1], discountRate: .1, terminalGrowth: 0, netDebt: 0, shares: 10 }).value).toBeNull();
  });
  it('values a bank through book equity and excess returns', () => {
    expect(excessReturnValue({ bookEquity: 1000, shares: 100, returnOnEquity: .15, costOfEquity: .1, growth: .02 }).value).toBeCloseTo(16.25);
  });
  it('values reported REIT FFO per share at an explicit multiple', () => { expect(ffoValue(100,10,15).value).toBe(150); });
  it('rejects nonpositive REIT FFO', () => { expect(ffoValue(-100,10,15).value).toBeNull(); });
  it('discounts an explicit future revenue and margin scenario', () => {
    expect(scenarioValue({ revenue: 1000, growth: .1, years: 1, margin: .1, earningsMultiple: 20, shares: 100, discountRate: .1 }).value).toBeCloseTo(20);
  });
  it('weights debt with its after-tax borrowing cost', () => {
    expect(blendedCostOfCapital({ equity: 800, debt: 200, costOfEquity: .1, costOfDebt: .05, taxRate: .25 })).toBeCloseTo(.0875);
  });
  it('uses equity cost for a debt-free business', () => {
    expect(blendedCostOfCapital({ equity: 800, debt: 0, costOfEquity: .1, costOfDebt: 0, taxRate: 0 })).toBe(.1);
  });
  it('rolls value one year and subtracts explicit dividends', () => { expect(twelveMonthTarget(100,.1,2)).toBeCloseTo(108); });
});
describe('peer rules', () => {
  it('includes the 0.25x and 4x boundaries and excludes values outside them', () => {
    expect(eligiblePeers([peer('LOW',25),peer('HIGH',400),peer('SMALL',24),peer('BIG',401)], 'SELF',100,'Software').map(p=>p.ticker).sort()).toEqual(['HIGH','LOW']);
  });
  it('caps peers at eight', () => { expect(eligiblePeers(Array.from({length:12},(_,i)=>peer(`P${i}`)), 'SELF',100,'Software')).toHaveLength(8); });
  it('excludes self, duplicate listings, mismatched industry and currency', () => {
    expect(eligiblePeers([peer('SELF'),peer('A'),peer('A'),{...peer('B'),industry:'Bank'},{...peer('C'),currency:'EUR'}], 'SELF',100,'Software').map(p=>p.ticker)).toEqual(['A']);
  });
  it('uses median rather than an outlier-sensitive mean', () => { expect(quantile([10,20,30,1000],.5)).toBe(25); });
  it('excludes negative and missing multiples and requires three observations', () => {
    expect(summarizePeers([peer('A',100,10),peer('B',100,-1),peer('C',100,null)], {pe:100},10,0)).toEqual([]);
  });
  it('calculates implied P/E equity value from the subject earnings', () => {
    expect(summarizePeers([peer('A',100,10),peer('B',100,20),peer('C',100,30)],{pe:100},10,null)[0]?.impliedBase).toBe(200);
  });
  it('does not turn a missing denominator into a zero value', () => {
    expect(summarizePeers([peer('A'),peer('B'),peer('C')],{},10,null)[0]?.impliedBase).toBeNull();
  });
});
describe('method and missing-input safeguards', () => {
  it('selects equity valuation for banks', () => { expect(selectMethod('Commercial banks',100,10).method).toBe('excess_return'); });
  it('selects FFO and NAV for REITs', () => { expect(selectMethod('Real estate investment trust',100,10).method).toBe('ffo_nav'); });
  it('selects revenue scenarios for loss-makers', () => { expect(selectMethod('Software',100,-10).method).toBe('revenue_scenario'); });
  it('withholds a method for pre-revenue biotech', () => { expect(selectMethod('Biotechnology',0,-10).method).toBe('unavailable'); });
  it('never invents intrinsic value or a 12-month target from peer ratios', () => {
    const c: ComparableEvidence = {status:'available',industry:'Software',fetchedAt:'2026-11-08',cached:false,peers:[peer('A'),peer('B'),peer('C')],summaries:[],note:'Provider TTM'};
    const v = valuationEvidence(null,c,100,'2026-11-08');
    expect(v.intrinsicValue).toBeNull(); expect(v.priceTarget).toBeNull(); expect(v.base).toBeNull();
  });
});