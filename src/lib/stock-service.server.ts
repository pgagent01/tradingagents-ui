import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { readDataCache,writeDataCache } from '@/lib/data-cache.server';
import { ownFmpCredential } from '@/lib/fmp.server';
import { ownAlphaCredential, cachedAlphaOverview, type AlphaCredential } from '@/lib/alphavantage.server';
import { getStockData } from '@/lib/stock-data.server';
import { object,type StockData,type StockRange } from '@/lib/stock-data';
import { validateStockFinancials } from '@/lib/financial-quality';
export async function cachedStockData(sb:SupabaseClient<Database>,userId:string,ticker:string,range:StockRange,period:'annual'|'quarter'){
  let credential=null;try{credential=await ownFmpCredential(sb,userId);}catch{/* Optional keys must not break public data. */}
  let alpha:AlphaCredential|null=null;try{alpha=await ownAlphaCredential(sb,userId);}catch{/* Optional data remains owner-only. */}
  const alphaCredential=alpha;
  if(alphaCredential)alphaCredential.overview=()=>cachedAlphaOverview(sb,userId,ticker,alphaCredential);
  const cacheKey=`v4:${ticker}:${range}:${period}:${credential?.version??'public'}:${alpha?.version??'no-alpha'}`;
  const cached=await readDataCache(sb,userId,'stocks',cacheKey);const previous=object(cached?.payload);
  if(cached?.fresh&&previous['ticker']===ticker&&Array.isArray(previous['candles']))return {...cached.payload as unknown as StockData,cached:true};
  const data=validateStockFinancials(await getStockData(ticker,range,userId,credential,period,alpha));
  if(!data.quoteSource&&!data.chartSource&&previous['ticker']===ticker&&Array.isArray(previous['candles']))return {...cached?.payload as unknown as StockData,...(data.financialSource?{financialSource:data.financialSource,financialDate:data.financialDate,ratios:data.ratios,statements:data.statements}:{}),cached:true,warnings:[...(Array.isArray(previous['warnings'])?previous['warnings'].filter((w):w is string=>typeof w==='string'):[]),'Providers unavailable; showing previously saved data.']};
  await writeDataCache(sb,userId,'stocks',cacheKey,data,60000);return data;
}