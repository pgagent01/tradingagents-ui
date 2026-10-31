import { describe, it, expect, vi } from 'vitest';
import { createNvidiaFailoverFetch, nvidiaModelOrder } from '@/lib/ai/nvidia-failover.server';
import { openNvidiaCredentials, sealNvidiaCredentials, activeNvidiaKey } from '@/lib/nvidia-credentials.server';
import { encryptSecret } from '@/lib/crypto.server';
const selected='nvidia/nemotron-3.5-super-vl-120b-a12b';
describe('NVIDIA fallback',()=>{
  it('tries the other two configured models after transient failures with backoff',async()=>{
    const upstream=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response('',{status:502})).mockResolvedValueOnce(new Response('ok'));
    const wait=vi.fn().mockResolvedValue(undefined),notify=vi.fn().mockResolvedValue(undefined);
    const client=createNvidiaFailoverFetch(selected,notify,upstream,wait);
    expect((await client.fetch('https://integrate.api.nvidia.com/v1/chat/completions',{method:'POST',body:JSON.stringify({model:selected,stream:true})})).status).toBe(200);
    expect(upstream.mock.calls.map(c=>JSON.parse(c[1].body).model)).toEqual(nvidiaModelOrder(selected));
    expect(wait.mock.calls.map(c=>c[0])).toEqual([1000,2000]);
    expect(client.getModel()).toBe('mistralai/mistral-large-4-1t-a52b');
  });
  it.each([400,401,402,403,404,422,429])('never switches models or keys on terminal HTTP %s',async status=>{
    const upstream=vi.fn().mockResolvedValue(new Response('',{status}));const notify=vi.fn();
    const client=createNvidiaFailoverFetch(selected,notify,upstream);
    expect((await client.fetch('https://integrate.api.nvidia.com/v1/chat/completions')).status).toBe(status);
    expect(upstream).toHaveBeenCalledTimes(1);expect(notify).not.toHaveBeenCalled();
  });
  it('does not replay ambiguous network failures',async()=>{
    const upstream=vi.fn().mockRejectedValue(new Error('Network failure'));
    await expect(createNvidiaFailoverFetch(selected,async()=>{},upstream).fetch('https://integrate.api.nvidia.com/v1/chat/completions')).rejects.toThrow('Network failure');
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});
describe('NVIDIA encrypted key selection',()=>{
  it('encrypts all three keys and rotates only to the explicitly selected slot',async()=>{
    const keys=['synthetic-first','synthetic-second','synthetic-third'];
    const cipher=await sealNvidiaCredentials({version:1,active:2,keys},'test-encryption');
    keys.forEach(k=>expect(cipher).not.toContain(k));
    const pool=await openNvidiaCredentials(cipher,'test-encryption');expect(pool.keys).toHaveLength(3);expect(activeNvidiaKey(pool)).toBe('synthetic-third');
  });
  it('keeps existing single-key credentials compatible',async()=>{
    const pool=await openNvidiaCredentials(await encryptSecret('synthetic-legacy','test-encryption'),'test-encryption');
    expect(pool.active).toBe(0);expect(activeNvidiaKey(pool)).toBe('synthetic-legacy');
  });
});