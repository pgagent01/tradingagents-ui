import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
export const getCompanyProfile=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:{ticker:string})=>z.object({ticker:z.string().regex(/^[A-Z0-9][A-Z0-9.^-]{0,14}$/)}).parse(input)).handler(async({data,context})=>{const {companyProfile}=await import('@/lib/company-profile.server');return companyProfile(context.supabase,context.userId,data.ticker);});