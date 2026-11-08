import { describe,it,expect,vi,beforeEach } from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn(),write:vi.fn()}));
vi.mock('@/lib/data-cache.server',()=>({readDataCache:mocks.read,writeDataCache:mocks.write}));
import { cachedYahooStats } from '@/lib/valuation/yahoo-stats.server';
describe('shared owner statistics cache',()=>{
  beforeEach(()=>{vi.clearAllMocks();});
  it('reuses durable values without fetching and scopes the key to the owner',async()=>{
    const fetchSpy=vi.spyOn(globalThis,'fetch');
    mocks.read.mockResolvedValue({fresh:true,payload:{trailingPe:25,marketCap:1000}});
    expect(await cachedYahooStats({} as never,'owner-a','DELL')).toMatchObject({trailingPe:25});
    expect(mocks.read).toHaveBeenCalledWith({},'owner-a','yahoo-stats','v2:DELL');
    expect(fetchSpy).not.toHaveBeenCalled();expect(mocks.write).not.toHaveBeenCalled();fetchSpy.mockRestore();
  });
  it('does not renew hot-cached provider data for another full TTL after durable expiry',async()=>{
    mocks.read.mockResolvedValue(null);
    const fetchSpy=vi.spyOn(globalThis,'fetch').mockImplementation(async(input)=>{
      const url=String(input);
      if(url.includes('fc.yahoo.com'))return new Response('',{headers:{'set-cookie':'test=public'}});
      if(url.includes('getcrumb'))return new Response('publiccrumb');
      return Response.json({quoteSummary:{result:[{price:{currency:'USD',marketCap:{raw:1000}}}]}});
    });
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-08T14:00:00Z'));
    try{
      await cachedYahooStats({} as never,'owner-a','CACHE-TTL');
      expect(mocks.write.mock.calls[0]?.[5]).toBe(1800000);
      vi.setSystemTime(new Date('2026-11-08T14:20:00Z'));
      await cachedYahooStats({} as never,'owner-a','CACHE-TTL');
      expect(mocks.write.mock.calls[1]?.[5]).toBe(600000);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    }finally{vi.useRealTimers();fetchSpy.mockRestore();}
  });
});