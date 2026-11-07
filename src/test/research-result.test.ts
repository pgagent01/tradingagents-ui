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
import { parseResearchJson } from '@/lib/research-result';
describe('parseResearchJson', () => {
  const base = { executive_summary: 'x', fundamental_analysis: 'x', technical_analysis: 'x', sentiment_news: 'x', risk_debate: 'x', final_synthesis: 'x', catalysts: [], upside_risks: [], downside_risks: [], financial_snapshot: [] };
  it('normalizes casing, string numbers, fences and think blocks', () => {
    const r = parseResearchJson('<think>{x}</think>```json\n' + JSON.stringify({ ...base, recommendation: 'Strong_Buy', conviction_score: '72', risk_level: 'medium', price_target: '$120.5' }) + '\n```');
    expect(r.recommendation).toBe('STRONG BUY'); expect(r.conviction_score).toBe(72); expect(r.risk_level).toBe('Moderate'); expect(r.price_target).toBe(120.5);
  });
  it('still rejects a missing rating', () => {
    expect(() => parseResearchJson(JSON.stringify({ ...base, conviction_score: 50, risk_level: 'High' }))).toThrow();
  });
});

describe('synthesis JSON recovery', () => {
  const body = '"recommendation":"BUY","price_target":250,"conviction_score":70,"risk_level":"Moderate","executive_summary":"line one\nline two","fundamental_analysis":"a {b}","technical_analysis":"","sentiment_news":"","risk_debate":"","final_synthesis":"","catalysts":[],"upside_risks":[],"downside_risks":[],"financial_snapshot":[]';
  it('ignores reasoning braces and accepts literal newlines in strings', async () => {
    const { parseResearchJson } = await import('@/lib/research-result');
    const r = parseResearchJson(`Thinking about {growth} first...\n{${body}}\nDone {x}`);
    expect(r.recommendation).toBe('BUY');
    expect(r.executive_summary).toBe('line one\nline two');
  });
  it('reports truncated output distinctly', async () => {
    const { extractJsonObject, ReportFormatError } = await import('@/lib/research-result');
    expect(() => extractJsonObject(`{${body.slice(0, 80)}`)).toThrow(ReportFormatError);
    try { extractJsonObject(`{${body.slice(0, 80)}`); } catch (e) { expect((e as { reason: string }).reason).toBe('truncated'); }
  });
});
