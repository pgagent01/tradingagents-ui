import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/integrations/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const calls = vi.hoisted(() => [] as string[]);
vi.mock('@ai-sdk/openai-compatible', () => ({ createOpenAICompatible: () => () => ({}) }));
vi.mock('@/lib/crypto.server', () => ({ decryptSecret: async () => 'synthetic-test-key' }));
vi.mock('@/lib/fred.server', () => ({ getFredEvidence: async () => ({ status: 'live', metrics: [{ series: 'FEDFUNDS', value: 4 }], note: '', asOf: '2026-11-07', fetchedAt: '2026-11-07' }) }));
vi.mock('@/lib/polymarket.server', () => ({ getPredictionEvidence: async () => ({ status: 'unavailable', markets: [], note: 'No matching markets', fetchedAt: null }) }));
vi.mock('@/lib/research-evidence.server', () => ({
  getNewsEvidence: async () => ({ status: 'partial', filings: [{ form: '10-Q', filed: '2026-11-05', url: 'https://www.sec.gov/filing' }], headlines: [], notes: ['No social feed'], cutoff: '2026-11-07' }),
  getFundamentalEvidence: async () => ({ status: 'available', annual: [{ revenue: 150 }], latestQuarter: { revenue: 50 }, cutoff: '2026-11-07' }),
}));
vi.mock('@/lib/stock-service.server', () => ({ cachedStockData: async () => null }));
vi.mock('@/lib/stock-data.server', () => ({ historicalDailyCandles: async () => null }));
vi.mock('ai', () => ({
  Output: { object: () => ({}) },
  streamText: (options: { messages: { content: string }[] }) => {
    const prompt = options.messages[0]?.content ?? '';
    calls.push(prompt);
    const agent = /Your role: (\w+)/.exec(prompt)?.[1] ?? 'synthesis';
    return {
      fullStream: (async function* () { yield { type: 'text-delta', text: `${agent} verified finding` }; })(),
      text: Promise.resolve(`${agent} verified finding`), totalUsage: Promise.resolve({ inputTokens: 10, outputTokens: 5 }),
      output: Promise.resolve({ recommendation: 'HOLD', price_target: null, conviction_score: 25, risk_level: 'High', executive_summary: 'Limited evidence', fundamental_analysis: 'F', technical_analysis: 'T', sentiment_news: 'S', risk_debate: 'R', catalysts: [], upside_risks: [], downside_risks: [], financial_snapshot: [], final_synthesis: 'Final' }),
    };
  },
}));

import { executeResearch } from '@/lib/ai/execution.server';

describe('real execution analyst handoffs', () => {
  it('passes all fresh specialist findings to risk, debate and saved synthesis with dated evidence', async () => {
    calls.length = 0;
    const agents = ['fundamentals', 'technical', 'sentiment', 'news', 'risk', 'debate'];
    const rpc = vi.fn(async (name: string) => ({ data: name === 'finalize_research_report' ? 'report-test' : null, error: null }));
    const sb = {
      from: (table: string) => {
        let inserted = false;
        const query = {
          select: () => query, eq: () => query, insert: () => { inserted = true; return query; }, update: () => query,
          single: async () => ({ data: table === 'user_api_keys' ? { key_ciphertext: 'synthetic-ciphertext' } : table === 'research_runs' ? { status: 'running' } : { id: 'output-test' }, error: null }),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: table === 'agent_outputs' && !inserted ? [] : null, error: null }).then(resolve),
        };
        return query;
      }, rpc,
    } as unknown as SupabaseClient<Database>;
    const role = { provider: 'groq', model: 'test-model', inputRate: 1, outputRate: 1 };
    const run: Database['public']['Tables']['research_runs']['Row'] = { id: 'run-test', user_id: 'owner-test', ticker: 'LITE', analysis_date: '2026-11-07', lookback_days: 90, research_depth: 'quick', selected_agents: agents, model_config: { roles: Object.fromEntries([...agents, 'synthesis'].map(a => [a, role])) }, status: 'running', completed_at: null, created_at: '2026-11-07T00:00:00Z', started_at: '2026-11-07T00:00:00Z', credit_basis: null, error_message: null, execution_lease_until: null, is_demo: false, lovable_credits: null, total_cost_usd: 0, total_input_tokens: 0, total_output_tokens: 0 };
    await executeResearch(sb, 'owner-test', run, undefined, 'synthetic-secret', new AbortController().signal, () => {});
    expect(calls).toHaveLength(7);
    for (const index of [4, 5, 6]) {
      for (const specialist of agents.slice(0, 4)) expect(calls[index]).toContain(`${specialist}: ${specialist} verified finding`);
      expect(calls[index]).toContain('sec_fundamentals');
      expect(calls[index]).toContain('news_and_filings');
    }
    expect(calls[5]).toContain('risk: risk verified finding');
    expect(calls[6]).toContain('debate: debate verified finding');
    expect(calls[0]).toContain('"revenue":150');
    expect(calls[0]).toContain('2026-11-05');
    expect(calls[2]).toContain('No social feed');
    const saved = rpc.mock.calls.find(([name]) => name === 'finalize_research_report');
    expect(saved).toBeDefined();
  });
});