import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { decryptSecret } from '@/lib/crypto.server';
import { object,numeric,type Candle,type StockRange } from '@/lib/stock-data';

export async function ownFmpCredential(supabase:SupabaseClient<Database>,userId:string){
  const {data,error}=await supabase.from('user_api_keys').select('key_ciphertext,updated_at').eq('user_id',userId).eq('provider','fmp').maybeSingle();
  if(error)throw new Error('Data credentials could not be loaded.');
  if(!data)return null;
  return {key:await decryptSecret(data.key_ciphertext,process.env['API_KEY_ENCRYPTION_SECRET']),version:data.updated_at};
}
export async function fmpRequest(endpoint:string,key:string,params:Record<string,string>){
  const query=new URLSearchParams({...params,apikey:key});
  const response=await fetch(`https://financialmodelingprep.com/stable/${endpoint}?${query}`,{signal:AbortSignal.timeout(10000)});
  // Never log URL, payload or provider error bodies; they may echo credentials.
  if(!response.ok)throw new Error(response.status===401?'FMP key rejected':response.status===429?'FMP rate limited':'FMP endpoint unavailable for this account');
  const raw:unknown=await response.json();if(!Array.isArray(raw))throw new Error('FMP endpoint unavailable for this account');return raw.map(object);
}
export async function validateFmpKey(key:string){
  for(const endpoint of ['profile','quote']){
    try{const rows=await fmpRequest(endpoint,key,{symbol:'AAPL'});if(rows.some(r=>r['symbol']==='AAPL'))return {provider:'fmp' as const,valid:true,message:'FMP key accepted. Historical and statement access depend on your plan.'};}catch{/* Profile and quote have separate plan entitlements. */}
  }
  return {provider:'fmp' as const,valid:false,message:'FMP could not validate this key. Check your key, endpoint access and rate limits.'};
}
export async function fmpQuote(ticker:string,key:string){
  const q=(await fmpRequest('quote',key,{symbol:ticker}))[0];if(!q||numeric(q['price'])===null)return null;
  const range=String(q['yearRange']??'').split('-').map(Number);
  return {price:numeric(q['price']),change:numeric(q['change']),changePercent:numeric(q['changePercentage']),marketCap:numeric(q['marketCap']),volume:numeric(q['volume']),low52:numeric(q['yearLow'])??numeric(range[0]),high52:numeric(q['yearHigh'])??numeric(range[1]),asOf:numeric(q['timestamp'])!==null?new Date(Number(q['timestamp'])*1000).toISOString():null};
}
export async function fmpChart(ticker:string,key:string,range:StockRange){
  const days={'1D':2,'1W':7,'1M':31,'6M':183,'1Y':366,'5Y':1827}[range];const from=new Date(Date.now()-days*86400000).toISOString().slice(0,10);
  const rows=await fmpRequest(range==='1D'?'historical-chart/5min':range==='1W'?'historical-chart/30min':'historical-price-eod/full',key,{symbol:ticker,from,to:new Date().toISOString().slice(0,10)});
  const candles:Candle[]=rows.flatMap(r=>{const date=String(r['date']??'');const time=Date.parse(date.includes(' ')?date.replace(' ','T')+'Z':date+'T00:00:00Z')/1000;const open=numeric(r['open']),high=numeric(r['high']),low=numeric(r['low']),close=numeric(r['close']);return Number.isFinite(time)&&open!==null&&high!==null&&low!==null&&close!==null?[{time,open,high,low,close,volume:numeric(r['volume'])}]:[];}).sort((a,b)=>a.time-b.time);
  return candles.length?candles:null;
}
export async function fmpFinancials(ticker:string,key:string,period:'annual'|'quarter'){
  const endpoints=['income-statement','balance-sheet-statement','cash-flow-statement','ratios','key-metrics'];
  const data:Record<string,Record<string,unknown>[]>={};
  // Sequential requests avoid a burst against the user's free-tier account.
  for(const endpoint of endpoints){try{data[endpoint]=await fmpRequest(endpoint,key,{symbol:ticker,period,limit:'1'});}catch{data[endpoint]=[];}}
  const income=data['income-statement']?.[0],balance=data['balance-sheet-statement']?.[0],cash=data['cash-flow-statement']?.[0],ratios=data['ratios']?.[0],metrics=data['key-metrics']?.[0];
  if(!income&&!balance&&!cash&&!ratios&&!metrics)return null;
  const rows=(r:Record<string,unknown>|undefined,fields:[string,string][])=>fields.map(([label,key])=>({label,value:numeric(r?.[key])}));
  const date=String(income?.['date']??balance?.['date']??cash?.['date']??ratios?.['date']??metrics?.['date']??'')||null;
  return {date,ratios:[{label:'P/E',value:numeric(ratios?.['priceToEarningsRatio'])},{label:'P/S',value:numeric(ratios?.['priceToSalesRatio'])},{label:'EV / EBITDA',value:numeric(ratios?.['enterpriseValueMultiple'])??numeric(metrics?.['evToEBITDA'])},{label:'Net margin %',value:numeric(ratios?.['netProfitMargin'])!==null?Number(ratios?.['netProfitMargin'])*100:null},{label:'ROE %',value:numeric(metrics?.['returnOnEquity'])!==null?Number(metrics?.['returnOnEquity'])*100:null}],statements:{income:rows(income,[['Revenue','revenue'],['Gross profit','grossProfit'],['Operating income','operatingIncome'],['Net income','netIncome']]),balance:rows(balance,[['Total assets','totalAssets'],['Total liabilities','totalLiabilities'],['Stockholders equity','totalStockholdersEquity'],['Cash & equivalents','cashAndCashEquivalents'],['Total debt','totalDebt']]),cash:rows(cash,[['Operating cash flow','operatingCashFlow'],['Investing cash flow','netCashUsedForInvestingActivites'],['Financing cash flow','netCashUsedProvidedByFinancingActivities'],['Free cash flow','freeCashFlow']])}};
}