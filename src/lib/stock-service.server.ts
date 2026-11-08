import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { readDataCache,writeDataCache } from '@/lib/data-cache.server';
import { ownFmpCredential } from '@/lib/fmp.server';
import { ownAlphaCredential, cachedAlphaOverview, type AlphaCredential } from '@/lib/alphavantage.server';
import { getStockData } from '@/lib/stock-data.server';
import { object,type StockData,type StockRange } from '@/lib/stock-data';
import { validateStockFinancials } from '@/lib/financial-quality';
import { cachedYahooStats } from '@/lib/valuation/yahoo-stats.server';
export async function cachedStockData(sb:SupabaseClient<Database>,userId:string,ticker:string,range:StockRange,period:'annual'|'quarter'){
  let credential=null;try{credential=await ownFmpCredential(sb,userId);}catch{/* Optional keys must not break public data. */}
  let alpha:AlphaCredential|null=null;try{alpha=await ownAlphaCredential(sb,userId);}catch{/* Optional data remains owner-only. */}
  const alphaCredential=alpha;
  if(alphaCredential)alphaCredential.overview=()=>cachedAlphaOverview(sb,userId,ticker,alphaCredential);
  const cacheKey=`v5:${ticker}:${range}:${period}:${credential?.version??'public'}:${alpha?.version??'no-alpha'}`;
  const cached=await readDataCache(sb,userId,'stocks',cacheKey);const previous=object(cached?.payload);
  if(cached?.fresh&&previous['ticker']===ticker&&Array.isArray(previous['candles']))return {...cached.payload as unknown as StockData,cached:true};
  const data=validateStockFinancials(await getStockData(ticker,range,userId,credential,period,alpha));
  const stats=await cachedYahooStats(sb,userId,ticker).catch(()=>null);
  if(stats){
    if(stats.currency===data.currency && stats.marketCap!==null)data.marketCap=stats.marketCap;
    // Provider TTM ratios are separate from annual/quarter filing ratios, not silent replacements.
    const reported=[{label:'P/E · Yahoo TTM',value:stats.trailingPe!=null&&stats.trailingPe>0?stats.trailingPe:null},{label:'P/S · Yahoo TTM',value:stats.ps??null},{label:'EV / EBITDA · Yahoo TTM',value:stats.evEbitda},{label:'Net margin % · Yahoo TTM',value:stats.netMargin??null},{label:'ROE % · Yahoo TTM',value:stats.roe}].filter(r=>r.value!==null);
    data.ratios=[...reported,...data.ratios];
    if(reported.length)data.warnings.push(`Standard TTM metrics reported by Yahoo Finance, retrieved ${stats.retrievedAt??data.fetchedAt}; provider periods differ from the separately shown filing-period ratios.`);
  }
  if(!data.quoteSource&&!data.chartSource&&previous['ticker']===ticker&&Array.isArray(previous['candles']))return {...cached?.payload as unknown as StockData,...(data.financialSource?{financialSource:data.financialSource,financialDate:data.financialDate,ratios:data.ratios,statements:data.statements}:{}),cached:true,warnings:[...(Array.isArray(previous['warnings'])?previous['warnings'].filter((w):w is string=>typeof w==='string'):[]),'Providers unavailable; showing previously saved data.']};
  await writeDataCache(sb,userId,'stocks',cacheKey,data,60000);return data;
}