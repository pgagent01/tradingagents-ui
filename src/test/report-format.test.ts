import { describe, expect, it } from 'vitest';
import { formatReportText, reportGlossary } from '@/lib/report-format';

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
});
