import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { STOCK_RANGES,validTicker } from '@/lib/stock-data';
export const fetchStockData=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ticker:z.string().trim().toUpperCase().refine(validTicker,'Enter a valid ticker'),range:z.enum(STOCK_RANGES)}))
  .handler(async({data})=>{const {getStockData}=await import('@/lib/stock-data.server');return getStockData(data.ticker,data.range);});