import { describe,it,expect } from 'vitest';
import { findCompanies,resolveTicker } from '@/lib/companies';
import { usage,estimateUsage,PRESETS,DEFAULT_MODEL } from '@/lib/research-config';
describe('company-to-ticker matching',() => {
  for(const [company,ticker] of [['Apple','AAPL'],['Nvidia','NVDA'],['Tesla','TSLA'],['Microsoft','MSFT'],['Amazon','AMZN'],['Google','GOOGL'],['Alphabet','GOOGL'],['Meta','META']]) {
    it(`${company} populates ${ticker}`,() => { expect(resolveTicker(company ?? '')).toBe(ticker);expect(findCompanies(company ?? '')[0]?.ticker).toBe(ticker); });
  }
  it('includes exchange information',() => { expect(findCompanies('Apple')[0]?.exchange).toBe('NASDAQ'); });
});
describe('per-report token costs',() => {
  it('combines input and output, charges their separate USD rates',() => {
    expect(usage(1000,250,2,8)).toEqual({input:1000,output:250,total:1250,cost:0.004});
  });
  it('Quick Pulse estimates exactly its two selected agents',() => {
    const preset=PRESETS[0];
    expect(preset.name).toBe('Quick Pulse');
    expect(estimateUsage(preset.depth,preset.agents.map(() => DEFAULT_MODEL))).toEqual({input:2000,output:500,total:2500,cost:0.0016});
  });
});