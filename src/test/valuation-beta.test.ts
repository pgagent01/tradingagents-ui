import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/stock-service.server',()=>({cachedStockData:vi.fn()}));
import { adjustedBeta } from '@/lib/valuation/rates.server';
describe('beta adjustment',()=>{ it('shrinks a raw 2.18 beta toward 1',()=>{ expect(adjustedBeta(2.18)).toBeCloseTo(1.7906); expect(adjustedBeta(1)).toBeCloseTo(1); }); });
