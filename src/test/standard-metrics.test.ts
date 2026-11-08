import { describe, it, expect, vi } from 'vitest';
import { standardMetric } from '@/lib/valuation/standard-metrics';
import { parseYahooStats } from '@/lib/valuation/yahoo-stats.server';
describe('source-first standard metrics',()=>{
  it('uses directly sourced values without calculating an equivalent',()=>{
    const calculation=vi.fn(()=>99);
    expect(standardMetric(12.5,calculation,'Yahoo TTM','SEC')).toEqual({value:12.5,source:'Yahoo TTM'});
    expect(calculation).not.toHaveBeenCalled();
  });
  it('preserves a directly sourced zero',()=>{
    const calculation=vi.fn(()=>25);
    expect(standardMetric(0,calculation,'Yahoo','SEC').value).toBe(0);
    expect(calculation).not.toHaveBeenCalled();
  });
  it('calculates only unavailable or invalid values and records provenance',()=>{
    const calculation=vi.fn(()=>20);
    expect(standardMetric(null,calculation,'Yahoo','SEC')).toEqual({value:20,source:'SEC'});
    expect(calculation).toHaveBeenCalledOnce();
    expect(standardMetric(NaN,()=>null,'Yahoo','SEC').value).toBeNull();
  });
  it('parses matching trailing metrics and converts provider fractional percentages',()=>{
    const s=parseYahooStats({price:{currency:'USD',marketCap:{raw:1000}},summaryDetail:{trailingPE:{raw:25},priceToSalesTrailing12Months:{raw:4}},financialData:{financialCurrency:'USD',totalRevenue:{raw:250},profitMargins:{raw:-0.02},operatingMargins:{raw:0.15}},defaultKeyStatistics:{netIncomeToCommon:{raw:-5},'52WeekChange':{raw:0.3}}});
    expect(s).toMatchObject({trailingPe:25,ps:4,revenue:250,netIncome:-5,netMargin:-2,operatingMargin:15,change1y:30,financialCurrency:'USD'});
  });
  it('withholds unit-sensitive ratios for pence while preserving financial currency',()=>{
    const s=parseYahooStats({price:{currency:'GBp'},summaryDetail:{trailingPE:{raw:2000},priceToSalesTrailing12Months:{raw:100}},defaultKeyStatistics:{enterpriseToRevenue:{raw:2}},financialData:{financialCurrency:'GBP',totalRevenue:{raw:100}}});
    expect(s).toMatchObject({trailingPe:null,ps:null,evSales:null,financialCurrency:'GBP',revenue:100});
  });
});