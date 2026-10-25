export const AGENTS = [
  { id: 'fundamentals', name: 'Fundamentals', detail: 'Valuation & financial health' },
  { id: 'technical', name: 'Technical', detail: 'Price action & momentum' },
  { id: 'sentiment', name: 'Sentiment', detail: 'Market sentiment' },
  { id: 'news', name: 'News', detail: 'Catalysts & headlines' },
  { id: 'debate', name: 'Bull/Bear Debate', detail: 'Competing investment theses' },
  { id: 'risk', name: 'Risk Manager', detail: 'Exposure & downside' },
] as const;
export const AGENT_GROUPS=[
  {name:'Fundamental Analyst',agents:['fundamentals']},
  {name:'Technical Analyst',agents:['technical']},
  {name:'Sentiment & News Analyst',agents:['sentiment','news']},
  {name:'Risk / Valuation Debate',agents:['risk','debate']},
] as const;
export const PRESETS = [
  { name: 'Quick Scan', depth: 'quick', agents: ['technical', 'news'] },
  { name: 'Standard Due Diligence', depth: 'standard', agents: AGENTS.map(a => a.id) },
  { name: 'Deep Value & Risk', depth: 'deep', agents: ['fundamentals', 'risk', 'debate'] },
] as const;
export const DEPTHS=[
  {id:'quick',name:'Quick',detail:'Brief pass · headlines & price action · 1× token budget'},
  {id:'standard',name:'Standard',detail:'Balanced pass · financials, technicals & news · 2× token budget'},
  {id:'deep',name:'Deep',detail:'Longer review · filings, valuation & competing theses · 4× token budget'},
  {id:'exhaustive',name:'Exhaustive',detail:'Longest review · full available evidence & scenario stress tests · 8× token budget'},
] as const;
export const LOOKBACKS=[{days:30,label:'Last 30 Days'},{days:90,label:'Last 90 Days'},{days:365,label:'Last 1 Year'}] as const;
// Editable USD per million token assumptions, not a live provider tariff.
export type RoleModel = { provider: string; model: string; inputRate: number; outputRate: number };
export const MODEL_OPTIONS: RoleModel[] = [
  { provider: 'openai', model: 'gpt-4.1-mini', inputRate: 0.4, outputRate: 1.6 },
  { provider: 'openai', model: 'gpt-4.1', inputRate: 2, outputRate: 8 },
  { provider: 'anthropic', model: 'claude-haiku-4-5', inputRate: 1, outputRate: 5 },
  { provider: 'google', model: 'gemini-2.5-flash', inputRate: 0.3, outputRate: 2.5 },
  { provider:'openai',model:'gpt-4o',inputRate:2.5,outputRate:10 },
  { provider:'openai',model:'gpt-4o-mini',inputRate:0.15,outputRate:0.6 },
  { provider:'anthropic',model:'claude-sonnet-5',inputRate:3,outputRate:15 },
  { provider:'anthropic',model:'claude-opus-5-5',inputRate:5,outputRate:25 },
  { provider:'groq',model:'llama-3.3-70b-versatile',inputRate:0.59,outputRate:0.79 },
  { provider:'openrouter',model:'openai/gpt-4o-mini',inputRate:0.15,outputRate:0.6 },
];
export function providerDefault(provider:string):RoleModel {
  return provider==='lovable'?{provider,model:'openai/gpt-6-astra',inputRate:0,outputRate:0}:{...(MODEL_OPTIONS.find(m=>m.provider===provider)??{provider,model:'',inputRate:0,outputRate:0})};
}
export function validExecutionRoles(agents:string[],roles:Record<string,unknown>) {
  return agents.every(id=>{
    const r=roles[id];if(!r||typeof r!=='object')return false;
    const role=r as Partial<RoleModel>;
    if(typeof role.provider!=='string'||!['lovable','openai','anthropic','google','groq','openrouter','xai','deepseek'].includes(role.provider)||typeof role.model!=='string'||!role.model.trim()||role.model.length>100)return false;
    if(typeof role.inputRate!=='number'||typeof role.outputRate!=='number'||!Number.isFinite(role.inputRate)||!Number.isFinite(role.outputRate)||role.inputRate<0||role.outputRate<0)return false;
    const known=MODEL_OPTIONS.find(m=>m.model===role.model);
    return !known||known.provider===role.provider||role.provider==='lovable';
  });
}
export const DEFAULT_MODEL: RoleModel = { provider: 'openai', model: 'gpt-4.1-mini', inputRate: 0.4, outputRate: 1.6 };
export function tokenBudget(depth: string) {
  return depth==='exhaustive'?{input:8000,output:2000}:depth === 'quick' ? { input: 1000, output: 250 } : depth === 'deep' ? { input: 4000, output: 1000 } : { input: 2000, output: 500 };
}
export function usage(input: number, output: number, inputRate: number, outputRate: number) {
  return { input, output, total: input + output, cost: (input * inputRate + output * outputRate) / 1_000_000 };
}
export function estimateUsage(depth: string, roles: RoleModel[]) {
  const budget = tokenBudget(depth);
  return roles.reduce((sum, r) => {
    const u = usage(budget.input, budget.output, r.inputRate, r.outputRate);
    return { input: sum.input + u.input, output: sum.output + u.output, total: sum.total + u.total, cost: sum.cost + u.cost };
  }, { input: 0, output: 0, total: 0, cost: 0 });
}