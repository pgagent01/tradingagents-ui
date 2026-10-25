import { decryptSecret } from '@/lib/crypto.server';
import { MACRO_SERIES, macroMetric, type MacroFeed } from '@/lib/data-evidence';
import { readDataCache, writeDataCache, type EvidenceClient } from '@/lib/data-cache.server';
import { sectionObject } from '@/lib/report-content';

export function fredObservationsUrl(key: string, series: string, asOf: string, limit = 16): URL {
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.search = new URLSearchParams({series_id:series,api_key:key,file_type:'json',limit:String(limit),sort_order:'desc',observation_end:asOf,realtime_start:asOf,realtime_end:asOf}).toString();
  return url;
}
export async function validateFredKey(key:string) {
  try {
    const response = await fetch(fredObservationsUrl(key,'FEDFUNDS',new Date().toISOString().slice(0,10),1),{signal:AbortSignal.timeout(15000)});
    const body: unknown = response.ok ? await response.json() : null;
    const valid = response.ok && Array.isArray(sectionObject(body)['observations']);
    return {provider:'fred' as const,valid,message:valid?'FRED key accepted. Macroeconomic observations are available.':response.status===429?'FRED is rate limited. Try again later.':'FRED key validation failed. Check your FRED account and key.'};
  } catch { return {provider:'fred' as const,valid:false,message:'Could not reach FRED. No automatic retry was made.'}; }
}
export async function getFredEvidence(sb:EvidenceClient,userId:string,asOf:string,encryption:string|undefined,signal:AbortSignal):Promise<MacroFeed> {
  const unavailable = (note:string):MacroFeed => ({status:'unavailable',asOf,fetchedAt:null,note,metrics:[]});
  const {data:key,error} = await sb.from('user_api_keys').select('key_ciphertext').eq('user_id',userId).eq('provider','fred').maybeSingle();
  if (error) return unavailable('FRED credential availability could not be checked.');
  if (!key) return unavailable('No FRED key configured. No mock macroeconomic values are used.');
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key.key_ciphertext));
  const fingerprint = Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  const cacheKey = `v1:${asOf}:${fingerprint}`;
  const cached = await readDataCache(sb,userId,'fred',cacheKey);
  const cachedFeed = cached?.payload as MacroFeed | undefined;
  if (cached?.fresh && cachedFeed?.metrics) return {...cachedFeed,status:'cached'};
  let credential: string;
  try { credential = await decryptSecret(key.key_ciphertext,encryption); } catch { return unavailable('Stored FRED key cannot be opened securely. Save it again in Settings.'); }
  const metrics = await Promise.all(MACRO_SERIES.map(async series => {
    try {
      const response = await fetch(fredObservationsUrl(credential,series.id,asOf),{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});
      if (!response.ok) return null;
      return macroMetric(series,await response.json());
    } catch { return null; } // Never log fetch exceptions: their URLs may include the key.
  }));
  if (signal.aborted) throw new DOMException('Cancelled','AbortError');
  const available = metrics.filter(m=>m!==null && m.value!==null);
  if (!available.length) return cachedFeed?.metrics?.length ? {...cachedFeed,status:'cached',note:`Stale cache fallback; retrieved ${cachedFeed.fetchedAt}. FRED could not be refreshed.`} : unavailable('FRED observations unavailable. Research proceeds without macro values.');
  const feed:MacroFeed = {status:'live',asOf,fetchedAt:new Date().toISOString(),note:`Point-in-time FRED vintage ${asOf}; observation dates differ by release frequency. ${available.length}/5 series available. Trends compare published observations, not live prices.`,metrics:available};
  await writeDataCache(sb,userId,'fred',cacheKey,feed,60*60*1000);
  return feed;
}