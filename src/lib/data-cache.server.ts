import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/types';
export type EvidenceClient = SupabaseClient<Database>;
export async function readDataCache(sb: EvidenceClient, userId: string, provider: string, cacheKey: string) {
  const { data, error } = await sb.from('research_data_cache').select('payload,expires_at').eq('user_id',userId).eq('provider',provider).eq('cache_key',cacheKey).maybeSingle();
  if (error || !data) return null;
  return { payload:data.payload, fresh:Date.parse(data.expires_at)>Date.now() };
}
export async function writeDataCache(sb: EvidenceClient,userId:string,provider:string,cacheKey:string,payload:unknown,ttl:number) {
  // Only sanitized public evidence is stored; no API URLs containing credentials.
  const {error} = await sb.from('research_data_cache').upsert({user_id:userId,provider,cache_key:cacheKey,payload:payload as Json,fetched_at:new Date().toISOString(),expires_at:new Date(Date.now()+ttl).toISOString()});
  return !error;
}