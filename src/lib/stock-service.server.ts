import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { readDataCache,writeDataCache } from '@/lib/data-cache.server';
import { ownFmpCredential } from '@/lib/fmp.server';
import { getStockData } from '@/lib/stock-data.server';
import { object,type StockData,type StockRange } from '@/lib/stock-data';
export async function cachedStockData(sb:SupabaseClient<Database>,userId:string,ticker:string,range:StockRange,period:'annual'|'quarter'){
  let credential=null;try{credential=await ownFmpCredential(sb,userId);}catch{/* Optional keys must not break public data. */}
  const cacheKey=`${ticker}:${range}:${period}:${credential?.version??'public'}`;
  const cached=await readDataCache(sb,userId,'stocks',cacheKey);const previous=object(cached?.payload);
  if(cached?.fresh&&previous['ticker']===ticker&&Array.isArray(previous['candles']))return {...cached.payload as unknown as StockData,cached:true};
  const data=await getStockData(ticker,range,userId,credential,period);
  if(!data.quoteSource&&!data.chartSource&&previous['ticker']===ticker&&Array.isArray(previous['candles']))return {...cached?.payload as unknown as StockData,...(data.financialSource?{financialSource:data.financialSource,financialDate:data.financialDate,ratios:data.ratios,statements:data.statements}:{}),cached:true,warnings:[...(Array.isArray(previous['warnings'])?previous['warnings'].filter((w):w is string=>typeof w==='string'):[]),'Providers unavailable; showing previously saved data.']};
  await writeDataCache(sb,userId,'stocks',cacheKey,data,60000);return data;
}