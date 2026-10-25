import {it,expect} from 'vitest';
import {freshnessLabel} from '@/lib/freshness';
it('distinguishes recent retrieval, old evidence, and missing dates',()=>{const now=Date.parse('2026-10-25T23:00:00Z');expect(freshnessLabel('2026-10-25T22:55:00Z',now)).toBe('Recent');expect(freshnessLabel('2025-01-01',now)).toBe('Older data');expect(freshnessLabel(null,now)).toBe('Date unavailable');});