import { describe, expect, it, vi } from 'vitest';
import { lookupCompanyFallback } from '@/lib/company-search.server';
import { resolveTicker } from '@/lib/companies';

describe('company search backups', () => {
  it('uses the second free endpoint when the first fails', async () => {
    const upstream = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(Response.json({ quotes: [{ symbol: 'SIE.DE', longname: 'Siemens AG', quoteType: 'EQUITY', exchDisp: 'XETRA' }] }));
    const result = await lookupCompanyFallback('Siemens', upstream);
    expect(result.companies[0]?.ticker).toBe('SIE.DE');
    expect(upstream.mock.calls[1]?.[0]).toContain('query2.finance.yahoo.com');
  });
  it('retains SEC matches when all remote providers fail', async () => {
    const upstream = vi.fn().mockRejectedValue(new Error('offline'));
    expect((await lookupCompanyFallback('Lumentum', upstream)).companies[0]?.ticker).toBe('LITE');
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it.each([['Coherent Corp.', 'COHR'], ['Palantir Technologies Inc.', 'PLTR'], ['Salesforce, Inc.', 'CRM'], ['Adobe Inc.', 'ADBE'], ['Lumentum', 'LITE']])('resolves %s as %s', (name, ticker) => {
    expect(resolveTicker(name)).toBe(ticker);
  });
  it('preserves directly entered international ticker symbols', () => {
    expect(resolveTicker('sie.de')).toBe('SIE.DE');
  });
});