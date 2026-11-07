import { describe, expect, it } from 'vitest';
import { formatReportText, reportGlossary } from '@/lib/report-format';
import { reportMarkdown, visibleReportText, type Report } from '@/lib/report-content';

describe('report formatting', () => {
  it('splits a long blob into multiple paragraphs without dropping text', () => {
    const blob = Array.from({ length: 12 }, (_, i) => `Sentence number ${i} explains revenue trends in detail for the quarter.`).join(' ');
    const out = formatReportText(blob);
    expect(out.split('\n\n').length).toBe(4);
    expect(out.replace(/\s+/g, ' ')).toBe(blob);
  });
  it('bolds leading labels but leaves lists and code untouched', () => {
    expect(formatReportText('Valuation: P/E is 30.')).toBe('**Valuation:** P/E is 30.');
    expect(formatReportText('```\nKey: value\n```')).toBe('```\nKey: value\n```');
  });
  it('only lists glossary terms present in the text', () => {
    const terms = reportGlossary('RSI is 72 and MACD crossed above signal.').map(t => t.term);
    expect(terms).toContain('MACD');
    expect(terms).toContain('RSI (Relative Strength Index)');
    expect(terms).not.toContain('Beta');
  });
  it('builds the glossary from visible fallback analyst text, not invisible metadata keys', () => {
    const report={sections:{rsi_metadata:'not displayed'},executive_summary:'Revenue increased.'} as unknown as Report;
    const text=visibleReportText(report,[{agent_id:'technical',content:'MACD crossed above signal.',model_used:'test',status:'completed'}]);
    expect(reportGlossary(text).map(g=>g.term)).toContain('MACD');
    expect(reportGlossary(text).map(g=>g.term)).not.toContain('RSI (Relative Strength Index)');
  });
  it('exports the glossary and saved technical evidence alongside research', () => {
    const report={ticker:'AVGO',created_at:'2026-11-07',sections:{technical_analysis:'MACD crossed above signal.',technical_evidence:{indicators:{sma200:145}}},executive_summary:'RSI is 72.',total_input_tokens:10,total_output_tokens:5,total_cost_usd:0,lovable_credits:null} as unknown as Report;
    const markdown=reportMarkdown(report,[],false);
    expect(markdown).toContain('## Appendix · Glossary of Key Terms');
    expect(markdown).toContain('### RSI (Relative Strength Index)');
    expect(markdown).toContain('Moving Average Convergence Divergence');
    expect(markdown).toContain('145');
  });
});

describe('long paragraph splitting keeps numbers', () => {
  it('never drops text around decimals', async () => {
    const { formatReportText } = await import('@/lib/report-format');
    const line = ('Revenue was $716.924B with RSI14 of 54.22 and margin 10.8%. ').repeat(12).trim();
    const out = formatReportText(line);
    expect(out.replace(/\s+/g, ' ')).toBe(line);
    expect(out).toContain('$716.924B');
  });
});
