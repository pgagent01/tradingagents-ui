import { expect, it } from 'vitest';
import { dashboardStocks } from '@/lib/dashboard-insights';
it('counts completed real analyses by normalized ticker and orders recent stocks', () => {
  const run = (ticker: string, created_at: string, status = 'completed', is_demo = false) => ({ ticker, created_at, status, is_demo });
  const result = dashboardStocks([run('lite', '2026-11-01'), run('LITE', '2026-11-02'), run('AVGO', '2026-11-07'), run('BAD', '2026-11-07', 'failed'), run('DEMO', '2026-11-07', 'completed', true)]);
  expect(result.frequent[0]).toEqual({ ticker: 'LITE', count: 2, lastAnalyzed: '2026-11-02' });
  expect(result.recent.map(r => r.ticker)).toEqual(['AVGO', 'LITE']);
});