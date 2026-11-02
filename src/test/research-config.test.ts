import { describe,it,expect } from 'vitest';
import { findCompanies,resolveTicker } from '@/lib/companies';
import { usage,estimateUsage,PRESETS,DEFAULT_MODEL,providerDefault,validExecutionRoles, rankModelChoices, blendedTokenCost, catalogBlendedCost } from '@/lib/research-config';
describe('company-to-ticker matching',() => {
  it('resolves Lumentum to LITE in company search and submission',()=>{
    expect(resolveTicker('LUMENTUM')).toBe('LITE');
    expect(resolveTicker('Lumentum Holdings Inc.')).toBe('LITE');
    expect(findCompanies('Lumentum')[0]?.ticker).toBe('LITE');
    expect(findCompanies('LITE')[0]?.name).toBe('Lumentum Holdings Inc.');
  });
  it('resolves other SEC-listed companies outside the curated suggestions',()=>{
    expect(resolveTicker('Coherent Corp.')).toBe('COHR');
    expect(findCompanies('Coherent')[0]?.ticker).toBe('COHR');
  });
  it('never resolves an ambiguous fragment to an arbitrary company',()=>{
    expect(resolveTicker('bank')).toBe('BANK');
    expect(resolveTicker('xyzunknown')).toBe('XYZUNKNOWN');
  });
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
    expect(estimateUsage(preset.depth,preset.agents.map(() => DEFAULT_MODEL))).toEqual({input:2000,output:500,total:2500,cost:0.00045});
  });
});
describe('Phase 4 execution configuration',()=>{
  it('defaults built-in Lovable roles to requested GPT-6 Luna',()=>expect(providerDefault('lovable').model).toBe('openai/gpt-6-luna'));
  it('defaults BYOK OpenAI roles to native GPT-6 Luna',()=>expect(providerDefault('openai').model).toBe('gpt-6-luna'));
  it('defaults Claude to Haiku 4.5',()=>expect(providerDefault('anthropic').model).toBe('claude-haiku-4-5'));
  it('defaults Google to current Gemini 3.1 Flash-Lite',()=>expect(providerDefault('google').model).toBe('gemini-3.1-flash-lite'));
  it('initializes OpenRouter with its own provider-qualified model',()=>expect(providerDefault('openrouter')).toMatchObject({provider:'openrouter',model:'openai/gpt-4o-mini'}));
  it('requires a model configuration for every specialist',()=>expect(validExecutionRoles(['fundamentals','risk'],{fundamentals:DEFAULT_MODEL})).toBe(false));
  it('rejects unsupported execution providers',()=>expect(validExecutionRoles(['risk'],{risk:{...DEFAULT_MODEL,provider:'untrusted'}})).toBe(false));
  it('accepts OpenRouter role configuration',()=>expect(validExecutionRoles(['risk'],{risk:providerDefault('openrouter')})).toBe(true));
});
describe('model cost rankings',()=>{
  it('uses an equal input/output blend',()=>expect(blendedTokenCost(0.0000004,0.000002)).toBeCloseTo(0.0000012,12));
  it('ranks cheapest first with ascending consecutive ranks',()=>{
    expect(rankModelChoices([{model:'mini',blendedCost:0.0000105},{model:'luna',blendedCost:0.0000012},{model:'lite',blendedCost:0.0000035}]).map(m=>[m.model,m.rank])).toEqual([['luna',1],['lite',2],['mini',3]]);
  });
  it('uses uncached base-tier catalog rates',()=>expect(catalogBlendedCost({input:[{min:272000,cost:'0.0000008'},{min:0,cost:'0.0000004'}],output:[{min:0,cost:'0.000002'}]})).toBeCloseTo(0.0000012,12));
  it('places missing prices last without a cheapest rank',()=>{
    expect(rankModelChoices([{model:'unknown',blendedCost:null},{model:'free',blendedCost:0}]).map(m=>[m.model,m.rank])).toEqual([['free',1],['unknown',null]]);
    expect(catalogBlendedCost({input:[],output:[{min:0,cost:'1'}]})).toBeNull();
  });
  it('breaks equal-cost ties by model identifier',()=>expect(rankModelChoices([{model:'z',blendedCost:1},{model:'a',blendedCost:1}]).map(m=>m.model)).toEqual(['a','z']));
});
