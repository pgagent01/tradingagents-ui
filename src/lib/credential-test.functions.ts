import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { normalizeCredentialProvider } from '@/lib/access-rules';
export const testMyApiKey=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:{provider:string})=>({provider:normalizeCredentialProvider(input.provider)})).handler(async({data,context})=>{
  const {data:row,error}=await context.supabase.from('user_api_keys').select('key_ciphertext').eq('user_id',context.userId).eq('provider',data.provider).single();
  if(error) throw new Error('Save your own provider key first.');
  if(data.provider==='fred') {
    const {decryptSecret}=await import('@/lib/crypto.server');
    let key:string;try{key=await decryptSecret(row.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']);}catch{throw new Error('Stored credential cannot be opened securely. Save it again in Settings.');}
    const {validateFredKey}=await import('@/lib/fred.server');return validateFredKey(key);
  }
  const {data:state,error:stateError}=await context.supabase.from('ai_access_state').select('paused').eq('user_id',context.userId).maybeSingle();if(stateError)throw new Error('Credential access state is unavailable.');if(state?.paused)throw new Error('Access is paused. Restore provider access and explicitly resume before testing.');
  const {decryptSecret}=await import('@/lib/crypto.server');let key:string;try{key=await decryptSecret(row.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']);}catch{throw new Error('Stored credential cannot be opened securely. Save it again in Settings.');}
  const urls={openai:'https://api.openai.com/v1/models',anthropic:'https://api.anthropic.com/v1/models',groq:'https://api.groq.com/openai/v1/models',openrouter:'https://openrouter.ai/api/v1/key',google:'https://generativelanguage.googleapis.com/v1beta/models',xai:'https://api.x.ai/v1/models',deepseek:'https://api.deepseek.com/v1/models'};
  const headers:Record<string,string>=data.provider==='anthropic'?{'x-api-key':key,'anthropic-version':'2023-06-01'}:data.provider==='google'?{'x-goog-api-key':key}:{Authorization:`Bearer ${key}`};
  try {const response=await fetch(urls[data.provider],{headers,signal:AbortSignal.timeout(15000)});if(response.status===403){const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const {error:pauseError}=await supabaseAdmin.from('ai_access_state').upsert({user_id:context.userId,paused:true,reason:'Provider access denied. Restore access and explicitly resume before starting fresh work.'});if(pauseError)throw new Error('Access state could not be saved.');}return {provider:data.provider,valid:response.ok,message:response.ok?'Key accepted. Individual model access and available balance are not verified.':response.status===401?'Key rejected. Replace it in Settings.':response.status===403?'Provider access denied. Restore access before testing again.':response.status===429?'Provider is rate limited. Wait before testing again.':'Provider validation failed. Check your provider account.'};}
  catch{return {provider:data.provider,valid:false,message:'Could not reach the provider. No automatic retry was made.'};}
});