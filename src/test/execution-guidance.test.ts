import { expect, it } from 'vitest';
import { isExecutionQuiet, executionFailureHelp } from '@/lib/execution-guidance';
it('warns after 90 seconds without activity only for running work', () => {
  expect(isExecutionQuiet('running', 90000, 0)).toBe(true);
  expect(isExecutionQuiet('running', 89999, 0)).toBe(false);
  expect(isExecutionQuiet('completed', 90000, 0)).toBe(false);
});
it('distinguishes provider quota from exhausted credits', () => {
  expect(executionFailureHelp(429, '')).toContain('quota or rate limit');
  expect(executionFailureHelp(402, '')).toContain('AI credits are unavailable');
});