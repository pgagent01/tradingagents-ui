import { describe,it,expect } from 'vitest';
import { findCompanies,resolveTicker } from '@/lib/companies';
import { usage,estimateUsage,PRESETS,DEFAULT_MODEL,providerDefault,validExecutionRoles } from '@/lib/research-config';
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
  it('Quick Scan includes Technical and News and estimates two agents',() => {
    const preset=PRESETS[0];
    expect(preset.agents).toEqual(['technical','news']);
    expect(estimateUsage(preset.depth,preset.agents.map(() => DEFAULT_MODEL))).toEqual({input:2000,output:500,total:2500,cost:0.0016});
  });
});
describe('Phase 4 execution configuration',()=>{
  it('defaults built-in Lovable roles to GPT-5 Nano',()=>expect(providerDefault('lovable').model).toBe('openai/gpt-5-nano'));
  it('initializes OpenRouter with its own provider-qualified model',()=>expect(providerDefault('openrouter')).toMatchObject({provider:'openrouter',model:'openai/gpt-4o-mini'}));
  it('requires a model configuration for every specialist',()=>expect(validExecutionRoles(['fundamentals','risk'],{fundamentals:DEFAULT_MODEL})).toBe(false));
  it('rejects unsupported execution providers',()=>expect(validExecutionRoles(['risk'],{risk:{...DEFAULT_MODEL,provider:'untrusted'}})).toBe(false));
  it('accepts OpenRouter role configuration',()=>expect(validExecutionRoles(['risk'],{risk:providerDefault('openrouter')})).toBe(true));
});
