import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const getAdminUsageAudit=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:allowed,error:roleError}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(roleError)throw new Error('Admin permissions could not be verified.');
  if(!allowed)return {allowed:false,points:[]};
  const {data,error}=await context.supabase.rpc('admin_usage_audit');
  if(error)throw new Error('Account cost auditing is unavailable.');
  return {allowed:true,points:(data??[]).map(p=>({account:p.account_id,day:p.day,runs:Number(p.runs),input:Number(p.input_tokens),output:Number(p.output_tokens),usd:Number(p.usd),credits:p.credits===null?null:Number(p.credits),unknown:Number(p.unknown_credits)}))};
});