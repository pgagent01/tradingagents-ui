import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { STOCK_RANGES,validTicker } from '@/lib/stock-data';
export const fetchStockData=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ticker:z.string().trim().toUpperCase().refine(validTicker,'Enter a valid ticker'),range:z.enum(STOCK_RANGES),period:z.enum(['annual','quarter']).default('annual')}))
  .handler(async({data,context})=>{const {getStockData}=await import('@/lib/stock-data.server');const {ownFmpCredential}=await import('@/lib/fmp.server');let credential=null;try{credential=await ownFmpCredential(context.supabase,context.userId);}catch{/* Public sources remain usable if the optional key cannot be opened. */}return getStockData(data.ticker,data.range,context.userId,credential,data.period);});