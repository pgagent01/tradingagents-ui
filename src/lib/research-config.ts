export const AGENTS = [
  { id: 'fundamentals', name: 'Fundamentals', detail: 'Valuation & financial health' },
  { id: 'technical', name: 'Technical', detail: 'Price action & momentum' },
  { id: 'sentiment', name: 'Sentiment', detail: 'Market sentiment' },
  { id: 'news', name: 'News', detail: 'Catalysts & headlines' },
  { id: 'debate', name: 'Bull/Bear Debate', detail: 'Competing investment theses' },
  { id: 'risk', name: 'Risk Manager', detail: 'Exposure & downside' },
] as const;
export const PRESETS = [
  { name: 'Quick Pulse', depth: 'quick', agents: ['technical', 'news'] },
  { name: 'Deep Fundamental', depth: 'deep', agents: ['fundamentals', 'news', 'debate', 'risk'] },
  { name: 'Institutional Consensus', depth: 'standard', agents: AGENTS.map(a => a.id) },
] as const;
// Editable USD per million token assumptions, not a live provider tariff.
export type RoleModel = { provider: string; model: string; inputRate: number; outputRate: number };
export const MODEL_OPTIONS: RoleModel[] = [
  { provider: 'openai', model: 'gpt-4.1-mini', inputRate: 0.4, outputRate: 1.6 },
  { provider: 'openai', model: 'gpt-4.1', inputRate: 2, outputRate: 8 },
  { provider: 'anthropic', model: 'claude-haiku-4-5', inputRate: 1, outputRate: 5 },
  { provider: 'google', model: 'gemini-2.5-flash', inputRate: 0.3, outputRate: 2.5 },
];
export const DEFAULT_MODEL: RoleModel = { provider: 'openai', model: 'gpt-4.1-mini', inputRate: 0.4, outputRate: 1.6 };
export function tokenBudget(depth: string) {
  return depth === 'quick' ? { input: 1000, output: 250 } : depth === 'deep' ? { input: 4000, output: 1000 } : { input: 2000, output: 500 };
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