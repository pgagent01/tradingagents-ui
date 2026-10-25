import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const resumeMyAiAccess=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:state,error:stateError}=await context.supabase.from('ai_access_state').select('paused').eq('user_id',context.userId).maybeSingle();if(stateError)throw new Error('AI access state is unavailable.');if(!state?.paused)return {resumed:true};
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {error}=await supabaseAdmin.from('ai_access_state').update({paused:false,reason:null,updated_at:new Date().toISOString()}).eq('user_id',context.userId);if(error) throw error;
  return {resumed:true};
});