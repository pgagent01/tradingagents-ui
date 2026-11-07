import { describe, expect, it } from 'vitest';
import { reviewPriceTarget } from '@/lib/report-quality';

describe('conservative price target review', () => {
  it('withholds a target that simply repeats the observed LITE quote', () => {
    const result = reviewPriceTarget(538.59, 538.59);
    expect(result.target).toBeNull();
    expect(result.warnings[0]?.code).toBe('spot_price_target');
  });
  it('does not invent AVGO missing targets when a quote exists', () => {
    expect(reviewPriceTarget(null, 200)).toMatchObject({ target: null, warnings: [{ code: 'missing_price_target' }] });
  });
  it('withholds targets without current evidence including historical runs', () => {
    expect(reviewPriceTarget(600, null)).toMatchObject({ target: null, warnings: [{ code: 'unanchored_price_target' }] });
  });
  it.each([0, -5, Infinity])('withholds an invalid target %s', target => {
    expect(reviewPriceTarget(target, 100).target).toBeNull();
  });
  it('retains distinct positive model estimates without asserting accuracy', () => {
    expect(reviewPriceTarget(600, 538.59)).toEqual({ target: 600, warnings: [] });
  });
});