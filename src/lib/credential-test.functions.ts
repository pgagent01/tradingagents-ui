import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { normalizeProvider } from '@/lib/access-rules';
export const testMyApiKey=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:{provider:string})=>({provider:normalizeProvider(input.provider)})).handler(async({data,context})=>{
  const {data:row,error}=await context.supabase.from('user_api_keys').select('key_ciphertext').eq('user_id',context.userId).eq('provider',data.provider).single();
  if(error) throw new Error('Save your own provider key first.');
  const {decryptSecret}=await import('@/lib/crypto.server');const key=await decryptSecret(row.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']);
  const urls={openai:'https://api.openai.com/v1/models',anthropic:'https://api.anthropic.com/v1/models',groq:'https://api.groq.com/openai/v1/models',google:'https://generativelanguage.googleapis.com/v1beta/models',xai:'https://api.x.ai/v1/models',deepseek:'https://api.deepseek.com/v1/models'};
  const headers:Record<string,string>=data.provider==='anthropic'?{'x-api-key':key,'anthropic-version':'2023-06-01'}:data.provider==='google'?{'x-goog-api-key':key}:{Authorization:`Bearer ${key}`};
  try {const response=await fetch(urls[data.provider],{headers});return {provider:data.provider,valid:response.ok,message:response.ok?'Key accepted for model listing. Individual model access and available balance are not verified.':response.status===401?'Key rejected. Replace it in Settings.':response.status===403?'Provider access denied. Restore access before testing again.':response.status===429?'Provider is rate limited. Wait before testing again.':'Provider validation failed. Check your provider account.'};}
  catch{return {provider:data.provider,valid:false,message:'Could not reach the provider. No automatic retry was made.'};}
});