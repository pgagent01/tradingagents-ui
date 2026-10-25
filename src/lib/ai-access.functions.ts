import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const resumeMyAiAccess=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:admin}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});if(!admin) throw new Error('Admin access required.');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {error}=await supabaseAdmin.from('ai_access_state').update({paused:false,reason:null,updated_at:new Date().toISOString()}).eq('user_id',context.userId);if(error) throw error;
  return {resumed:true};
});