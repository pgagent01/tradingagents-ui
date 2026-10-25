import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const getAiCatalog=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:admin,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(error) throw error;
  if(!admin) return {allowed:false,models:[] as {id:string;name:string}[]};
  const key=process.env['LOVABLE_API_KEY'];if(!key) throw new Error('Built-in AI is not configured.');
  const response=await fetch('https://ai.gateway.lovable.dev/v1/models',{headers:{Authorization:`Bearer ${key}`}});
  if(!response.ok) throw new Error('Built-in model availability could not be verified.');
  const {readCatalog}=await import('@/lib/ai/execution.server');
  const catalog=readCatalog(await response.json());
  return {allowed:true,models:catalog.filter(m=>m.id.startsWith('openai/')&&m.surfaces.includes('responses')&&m.retention==='zero'&&!m.deprecated).map(m=>({id:m.id,name:m.name}))};
});