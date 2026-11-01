import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { normalizeCredentialProvider } from '@/lib/access-rules';
export const testMyApiKey=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:{provider:string})=>({provider:normalizeCredentialProvider(input.provider)})).handler(async({data,context})=>{
  const {data:row,error}=await context.supabase.from('user_api_keys').select('key_ciphertext').eq('user_id',context.userId).eq('provider',data.provider).single();
  if(error) throw new Error('Save your own provider key first.');
  if(data.provider==='fmp') {
    const {decryptSecret}=await import('@/lib/crypto.server');
    let key:string;try{key=await decryptSecret(row.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']);}catch{throw new Error('Stored credential cannot be opened securely. Save it again in Settings.');}
    const {validateFmpKey}=await import('@/lib/fmp.server');return validateFmpKey(key);
  }
  if(data.provider==='fred') {
    const {decryptSecret}=await import('@/lib/crypto.server');
    let key:string;try{key=await decryptSecret(row.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']);}catch{throw new Error('Stored credential cannot be opened securely. Save it again in Settings.');}
    const {validateFredKey}=await import('@/lib/fred.server');return validateFredKey(key);
  }
  const {data:state,error:stateError}=await context.supabase.from('ai_access_state').select('paused').eq('user_id',context.userId).maybeSingle();if(stateError)throw new Error('Credential access state is unavailable.');if(state?.paused)throw new Error('Access is paused. Restore provider access and explicitly resume before testing.');
  const {decryptSecret}=await import('@/lib/crypto.server');let key:string;try{if(data.provider==='nvidia'){const {openNvidiaCredentials,activeNvidiaKey}=await import('@/lib/nvidia-credentials.server');key=activeNvidiaKey(await openNvidiaCredentials(row.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']));}else key=await decryptSecret(row.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']);}catch{throw new Error('Stored credential cannot be opened securely. Save it again in Settings.');}
  const urls={openai:'https://api.openai.com/v1/models',anthropic:'https://api.anthropic.com/v1/models',groq:'https://api.groq.com/openai/v1/models',openrouter:'https://openrouter.ai/api/v1/key',google:'https://generativelanguage.googleapis.com/v1beta/models',xai:'https://api.x.ai/v1/models',deepseek:'https://api.deepseek.com/v1/models',nvidia:'https://integrate.api.nvidia.com/v1/models'};
  const headers:Record<string,string>=data.provider==='anthropic'?{'x-api-key':key,'anthropic-version':'2023-06-01'}:data.provider==='google'?{'x-goog-api-key':key}:{Authorization:`Bearer ${key}`};
  // NVIDIA's catalog endpoint is not a model-access test; use a tiny inference request.
  try {const response=data.provider==='nvidia'?await fetch('https://integrate.api.nvidia.com/v1/chat/completions',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({model:'nvidia/nemotron-3.5-super-vl-120b-a12b',max_tokens:200,messages:[{role:'user',content:'Reply with OK.'}]}),signal:AbortSignal.timeout(60000)}):await fetch(urls[data.provider],{headers,signal:AbortSignal.timeout(15000)});if(response.status===403){const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const {error:pauseError}=await supabaseAdmin.from('ai_access_state').upsert({user_id:context.userId,paused:true,reason:'Provider access denied. Restore access and explicitly resume before starting fresh work.'});if(pauseError)throw new Error('Access state could not be saved.');}return {provider:data.provider,valid:response.ok,message:response.ok?'Key accepted. Individual model access and available balance are not verified.':response.status===401?'Key rejected. Replace it in Settings.':response.status===403?'Provider access denied. Restore access before testing again.':response.status===429?'Provider is rate limited. Wait before testing again.':[500,502,503,504].includes(response.status)?'Temporary provider server error. The key was not confirmed invalid.':'Provider validation failed. Check your provider account.'};}
  catch{return {provider:data.provider,valid:false,message:'Could not reach the provider. No automatic retry was made.'};}
});
// Sends one tiny prompt to a single model with the caller's own key; never returns the key.
export const pingMyModel=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:{provider:string;model:string;keySlot?:number})=>{
  const model=String(input.model??'').trim();if(!model||model.length>100)throw new Error('Choose a model.');
  if(input.keySlot!==undefined&&(!Number.isInteger(input.keySlot)||input.keySlot<0||input.keySlot>2))throw new Error('Select a configured key.');
  return {provider:normalizeCredentialProvider(input.provider),model,keySlot:input.keySlot};
}).handler(async({data,context})=>{
  if(data.provider==='fred'||data.provider==='fmp')throw new Error('Data providers have no models to ping.');
  const {data:row,error}=await context.supabase.from('user_api_keys').select('key_ciphertext').eq('user_id',context.userId).eq('provider',data.provider).single();
  if(error)throw new Error('Save your own provider key first.');
  const {data:state,error:stateError}=await context.supabase.from('ai_access_state').select('paused').eq('user_id',context.userId).maybeSingle();if(stateError||state?.paused)throw new Error('AI access is paused or unavailable. Restore access before testing.');
  const {decryptSecret}=await import('@/lib/crypto.server');let key:string;try{if(data.provider==='nvidia'){const {openNvidiaCredentials,activeNvidiaKey}=await import('@/lib/nvidia-credentials.server');const pool=await openNvidiaCredentials(row.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']);if(data.keySlot!==undefined)pool.active=data.keySlot;key=activeNvidiaKey(pool);}else key=await decryptSecret(row.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']);}catch{throw new Error('Stored credential cannot be opened securely. Save it again in Settings.');}
  const base={openai:'https://api.openai.com/v1',groq:'https://api.groq.com/openai/v1',openrouter:'https://openrouter.ai/api/v1',google:'https://generativelanguage.googleapis.com/v1beta/openai',xai:'https://api.x.ai/v1',deepseek:'https://api.deepseek.com/v1',nvidia:'https://integrate.api.nvidia.com/v1'} as const;
  const started=Date.now();
  try{
    const response=data.provider==='anthropic'
      ?await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:data.model,max_tokens:16,messages:[{role:'user',content:'Reply with OK.'}]}),signal:AbortSignal.timeout(60000)})
      :await fetch(`${base[data.provider]}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:data.model,max_tokens:200,messages:[{role:'user',content:'Reply with OK.'}]}),signal:AbortSignal.timeout(60000)});
    const latencyMs=Date.now()-started;
    if(response.status===402||response.status===403){const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const paused=await supabaseAdmin.from('ai_access_state').upsert({user_id:context.userId,paused:true,reason:'Provider credits or access unavailable. Restore access before resuming.'});if(paused.error)throw new Error('Access pause could not be saved.');}
    if(!response.ok)return {ok:false,terminal:true,latencyMs,message:response.status===401?'Key rejected.':response.status===404?'Model not found for this key.':response.status===429?'Rate limited — wait before testing again.':`Provider returned ${response.status}.`};
    const body=await response.json() as {choices?:{finish_reason?:string;message?:{content?:string;refusal?:string}}[];content?:{text?:string}[]};
    const reply=(body.choices?.[0]?.message?.content??body.content?.[0]?.text??'').trim().slice(0,80);
    if(!reply||body.choices?.[0]?.message?.refusal||body.choices?.[0]?.finish_reason==='content_filter')return {ok:false,terminal:true,latencyMs,message:'No usable reply or provider refusal. No retry was made.'};
    return {ok:true,terminal:false,latencyMs,message:'Received a test reply.'};
  }catch{return {ok:false,terminal:true,latencyMs:Date.now()-started,message:'Provider test did not complete. No retry was made.'};}
});
