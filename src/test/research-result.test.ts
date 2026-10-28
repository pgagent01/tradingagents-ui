import { describe, expect, it } from 'vitest';
import { resultSchema } from '@/lib/research-result';

const report = {
  recommendation: 'HOLD', price_target: null, conviction_score: 20,
  risk_level: 'High', executive_summary: 'Evidence is limited.',
  fundamental_analysis: '', technical_analysis: '', sentiment_news: '',
  risk_debate: '', catalysts: [], upside_risks: [], downside_risks: [],
  financial_snapshot: [], final_synthesis: 'Hold with low conviction.',
};

describe('live research rating contract', () => {
  it.each(['STRONG BUY', 'BUY', 'HOLD', 'SELL', 'STRONG SELL'])('retains a %s recommendation', recommendation => {
    expect(resultSchema.parse({ ...report, recommendation }).recommendation).toBe(recommendation);
  });
  it.each([undefined, null, '', 'NOT RATED'])('rejects missing or invalid rating %s', recommendation => {
    expect(resultSchema.safeParse({ ...report, recommendation }).success).toBe(false);
  });
  it('permits a rated report without inventing an unavailable price target', () => {
    const result = resultSchema.parse(report);
    expect(result.recommendation).toBe('HOLD');
    expect(result.price_target).toBeNull();
    expect(result.conviction_score).toBe(20);
  });
  it.each(['conviction_score', 'risk_level'])('rejects an absent %s', field => {
    expect(resultSchema.safeParse({ ...report, [field]: null }).success).toBe(false);
  });
});