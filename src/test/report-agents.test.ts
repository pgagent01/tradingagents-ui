import { describe, expect, it } from 'vitest';
import { reportAgentIds } from '@/lib/report-agents';
describe('saved report agents', () => {
  it('keeps immutable report selection instead of later run choices', () => {
    expect(reportAgentIds({ research_metadata: { agents: ['fundamentals', 'technical'] } }, ['news'])).toEqual(['fundamentals', 'technical']);
  });
  it('uses stored specialist outputs before legacy selection and excludes synthesis', () => {
    expect(reportAgentIds({ analyst_outputs: { risk: {}, synthesis: {} } }, ['news'])).toEqual(['risk']);
    expect(reportAgentIds({}, ['news', 'news'])).toEqual(['news']);
    expect(reportAgentIds({}, null)).toEqual([]);
  });
});