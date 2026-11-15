import { readDataCache, writeDataCache, type EvidenceClient } from './data-cache.server';
import { COMPANIES } from './companies';
import { secCik, secSubmissions } from './stock-data.server';
import { object } from './stock-data';
import { wikipediaReference, type ReferenceFeed } from './reference-evidence';

export async function resolvedCompany(ticker: string) {
  let name = COMPANIES.find(c => c.ticker === ticker)?.name ?? ticker;
  let cik: string | null = null;
  let submissions: Record<string, unknown> = {};
  try { cik = await secCik(ticker); if (cik) { submissions = object(await secSubmissions(cik)); if (typeof submissions['name'] === 'string') name = submissions['name']; } } catch { /* Saved catalog is a safe fallback. */ }
  return { name: name.replace(/\b(incorporated|inc\.?|corp\.?|corporation|plc|ltd\.?)\b/gi, '').replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim(), cik, submissions };
}
const pending = new Map<string, Promise<ReferenceFeed>>();
export function companyWikipedia(sb: EvidenceClient, userId: string, ticker: string, name: string, cutoff: string): Promise<ReferenceFeed> {
  const key = `v2:${ticker}:${name}:${cutoff}`;
  const id = `${userId}:${key}`; const existing = pending.get(id); if (existing) return existing;
  const request = (async () => {
    const base: ReferenceFeed = { status: 'unavailable', fetchedAt: new Date().toISOString(), cutoff, cached: false, items: [], note: 'Wikipedia secondary company context; revision date is not each fact’s effective date. CC BY-SA; original revision linked.' };
    if (cutoff !== base.fetchedAt.slice(0, 10)) return { ...base, status: 'historical_unavailable' as const, note: 'Current Wikipedia excluded; historical revision context is not implemented.' };
    const cache = await readDataCache(sb, userId, 'wikipedia-research', key);
    const saved = cache?.payload as ReferenceFeed | undefined;
    if (cache?.fresh && saved?.items) return { ...saved, cached: true };
    try {
      const q = new URLSearchParams({ action:'query',generator:'search',gsrsearch:`${name} company`,gsrlimit:'3',prop:'extracts|revisions',exintro:'1',explaintext:'1',exchars:'3000',rvprop:'ids|timestamp',format:'json',formatversion:'2' });
      const r = await fetch(`https://en.wikipedia.org/w/api.php?${q}`, { headers:{'User-Agent':'TradingAgentsAI company research (https://tradingagents-ui.lovable.app)'},signal:AbortSignal.timeout(10000),redirect:'error' });
      if (!r.ok) { await r.body?.cancel(); throw new Error('Wikipedia unavailable'); }
      const reader=r.body?.getReader();if(!reader)throw new Error('Empty response');
      const chunks:Uint8Array[]=[];let size=0;
      try{while(true){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>500000)throw new Error('Response too large');chunks.push(p.value);}}finally{await reader.cancel();}
      const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
      const items = wikipediaReference(JSON.parse(new TextDecoder().decode(bytes)), name, new Date().toISOString());
      const fresh: ReferenceFeed = { ...base, items, status: items.length ? 'available' : 'unavailable' };
      if (!items.length) fresh.note += ' No unambiguous dated company page verified.';
      await writeDataCache(sb, userId, 'wikipedia-research', key, fresh, items.length ? 86400000 : 1800000);
      return fresh;
    } catch {
      return saved?.status === 'available' ? { ...saved, cached:true, note:`${saved.note} Stale snapshot from ${saved.fetchedAt}; refresh unavailable.` } : { ...base, note:'Wikipedia retrieval failed; no context invented.' };
    }
  })().finally(() => pending.delete(id));
  if (pending.size < 100) pending.set(id, request); return request;
}