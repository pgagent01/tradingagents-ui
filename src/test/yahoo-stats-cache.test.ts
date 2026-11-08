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
});