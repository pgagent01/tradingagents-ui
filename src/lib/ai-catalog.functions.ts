import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const getAiCatalog=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:admin,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(error) throw error;
  if(!admin) return {allowed:false,models:[] as {id:string;name:string;rates:import('@/lib/credit-rules').CreditRates}[],publicRates:true};
  const key=process.env['LOVABLE_API_KEY'];if(!key) throw new Error('Built-in AI is not configured.');
  const response=await fetch('https://ai.gateway.lovable.dev/v1/models',{headers:{Authorization:`Bearer ${key}`}});
  if(!response.ok) throw new Error('Built-in model availability could not be verified.');
  const {readCatalog,eligibleModel}=await import('@/lib/ai/execution.server');
  const raw=await response.json();const catalog=readCatalog(raw);
  return {allowed:true,publicRates:String(raw.workspace_models??'public_only').startsWith('public_only'),models:catalog.filter(eligibleModel).map(m=>({id:m.id,name:m.name,rates:m.rates}))};
});