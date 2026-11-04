import { describe, expect, it } from 'vitest';
import { missingResearchProviders } from '@/lib/credential-guidance';

describe('research credential requirements', () => {
  it('requires each selected AI provider including synthesis, without duplicate warnings', () => {
    expect(missingResearchProviders(['nvidia', 'anthropic', 'anthropic'], ['nvidia'], false)).toEqual(['anthropic']);
  });
  it('does not require optional FRED or FMP keys', () => {
    expect(missingResearchProviders(['nvidia', 'fred', 'fmp'], ['nvidia'], false)).toEqual([]);
  });
  it('requires no user key for built-in AI', () => {
    expect(missingResearchProviders(['lovable'], [], false)).toEqual([]);
  });
  it('requires no provider keys for demo simulation', () => {
    expect(missingResearchProviders(['nvidia', 'openai'], [], true)).toEqual([]);
  });
  it('does not treat another provider or a data key as an AI credential', () => {
    expect(missingResearchProviders(['openai'], ['fred', 'fmp', 'nvidia'], false)).toEqual(['openai']);
  });
});