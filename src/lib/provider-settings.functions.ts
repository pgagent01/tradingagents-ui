import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { normalizeProvider } from '@/lib/access-rules';
export const getActiveProvider=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data,error}=await context.supabase.from('user_settings').select('default_provider').eq('user_id',context.userId).maybeSingle();
  if(error)throw new Error('Active provider could not be loaded.');
  return data?.default_provider??'openai';
});
export const setActiveProvider=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((data:{provider:string})=>({provider:data.provider==='lovable'?'lovable':normalizeProvider(data.provider)})).handler(async({data,context})=>{
  if(data.provider==='lovable') {
    const {data:admin,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
    if(error||!admin)throw new Error('Built-in AI is reserved for the primary/admin account.');
  }
  const {error}=await context.supabase.from('user_settings').upsert({user_id:context.userId,default_provider:data.provider},{onConflict:'user_id'});
  if(error)throw new Error('Active provider could not be saved.');return data.provider;
});