import { COMPANIES } from '@/lib/companies';
import { fmpChart,fmpQuote,fmpFinancials } from '@/lib/fmp.server';
import { type AlphaCredential } from '@/lib/alphavantage.server';
import { emptyStock,firstAvailable,numeric,object,parseYahooChart,parseSecFinancials, type StockData,type StockRange } from '@/lib/stock-data';

const cache=new Map<string,{expires:number;data:StockData}>();
const pending=new Map<string,Promise<StockData>>();
const financialCache=new Map<string,{expires:number;raw:unknown}>();
let tickers:{expires:number;data:Record<string,unknown>}|undefined;
const ranges:Record<StockRange,{range:string;interval:string}>={'1D':{range:'1d',interval:'5m'},'1W':{range:'5d',interval:'30m'},'1M':{range:'1mo',interval:'1d'},'6M':{range:'6mo',interval:'1d'},'1Y':{range:'1y',interval:'1d'},'5Y':{range:'5y',interval:'1wk'}};
async function json(url:string,sec=false):Promise<unknown>{
  const response=await fetch(url,{signal:AbortSignal.timeout(sec?20000:8000),headers:{'User-Agent':sec?(process.env['SEC_USER_AGENT']??'TradingAgentsAI gprithvi@gmail.com'):'Mozilla/5.0',Accept:'application/json'}});
  if(!response.ok){if(sec)console.warn('SEC public request status',response.status);throw new Error('Market provider unavailable');}return response.json();
}
export async function secCik(ticker:string){
  if(!tickers||tickers.expires<Date.now())tickers={expires:Date.now()+86400000,data:object(await json('https://www.sec.gov/files/company_tickers.json',true))};
  const match=Object.values(tickers.data).map(object).find(r=>r['ticker']===ticker||r['ticker']===ticker.replace('.','-'));
  return match?String(match['cik_str']).padStart(10,'0'):null;
}
export async function secSubmissions(cik:string){return json(`https://data.sec.gov/submissions/CIK${cik}.json`,true);}
export async function yahooNewsSearch(ticker:string){
  const feed=await firstAvailable(['query1','query2'].map(host=>({source:host,load:async()=>{
    const raw=await json(`https://${host}.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=15&quotesCount=0`);
    return Array.isArray(object(raw)['news'])&& (object(raw)['news'] as unknown[]).length?raw:null;
  }})));
  return feed?.data??{news:[]};
}
/** Daily bars ending on a past analysis date; Yahoo prices are split-adjusted retrospectively. */
export async function historicalDailyCandles(ticker:string,analysisDate:string,lookbackDays=400){
  const end=Math.floor(Date.parse(`${analysisDate}T23:59:59Z`)/1000);const start=end-Math.min(800,Math.max(1,lookbackDays))*86400;const symbol=encodeURIComponent(ticker.replace('.','-'));
  const chart=await firstAvailable(['query1','query2'].map(host=>({source:`Yahoo Finance · ${host} · historical daily`,load:async()=>{const parsed=parseYahooChart(await json(`https://${host}.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end+1}&interval=1d`));return parsed.candles.length?parsed.candles.filter(c=>c.time<=end):null;}})));
  return chart?{candles:chart.data,source:chart.source}:null;
}
export async function secFacts(ticker:string){
  const cached=financialCache.get(ticker);if(cached&&cached.expires>Date.now())return cached.raw;
  const cik=await secCik(ticker);if(!cik)return null;const raw=await json(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,true);
  if(financialCache.size>=50)financialCache.delete(financialCache.keys().next().value??'');
  financialCache.set(ticker,{expires:Date.now()+21600000,raw});return raw;
}
async function loadStock(ticker:string,range:StockRange,fmp:string|null,period:'annual'|'quarter',alpha:AlphaCredential|null):Promise<StockData>{
  const result=emptyStock(ticker,COMPANIES.find(c=>c.ticker===ticker)?.name??ticker);
  const query=ranges[range];const symbol=encodeURIComponent(ticker.replace('.','-'));
  const chart=await firstAvailable(['query1','query2'].map(host=>({source:`Yahoo Finance · ${host}`,load:async()=>{const parsed=parseYahooChart(await json(`https://${host}.finance.yahoo.com/v8/finance/chart/${symbol}?range=${query.range}&interval=${query.interval}`));return parsed.candles.length?parsed:null;}})));
  if(chart){const {meta}=chart.data;Object.assign(result,{candles:chart.data.candles,price:chart.data.price,change:chart.data.change,changePercent:chart.data.changePercent,chartSource:chart.source,quoteSource:chart.source,currency:String(meta['currency']??'USD'),company:String(meta['longName']??meta['shortName']??result.company),low52:numeric(meta['fiftyTwoWeekLow']),high52:numeric(meta['fiftyTwoWeekHigh']),volume:numeric(meta['regularMarketVolume']),marketCap:numeric(meta['marketCap']),asOf:numeric(meta['regularMarketTime'])!==null?new Date(Number(meta['regularMarketTime'])*1000).toISOString():null});}
  if(chart&&range!=='1D'){try{const daily=parseYahooChart(await json(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`));result.change=daily.change;result.changePercent=daily.changePercent;}catch{result.change=null;result.changePercent=null;}}
  const av=alpha?.key;
  if(!result.candles.length&&fmp){try{const candles=await fmpChart(ticker,fmp,range);if(candles){result.candles=candles;result.chartSource='Financial Modeling Prep';}}catch{/* Continue with optional Alpha Vantage. */}}
  if(!result.candles.length&&av&&range!=='1D'){
    try{const raw=object(await json(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(av)}&outputsize=compact`));const series=object(raw['Time Series (Daily)']);result.candles=Object.entries(series).flatMap(([day,v])=>{const r=object(v),open=Number(r['1. open']),high=Number(r['2. high']),low=Number(r['3. low']),close=Number(r['4. close']);return [open,high,low,close].every(Number.isFinite)?[{time:Date.parse(day)/1000,open,high,low,close,volume:numeric(Number(r['5. volume']))}]:[];}).sort((a,b)=>a.time-b.time);if(result.candles.length)result.chartSource='Alpha Vantage · daily';}catch{/* Continue with quote fallbacks. */}
  }
  if(result.price===null){const quote=await firstAvailable<Partial<StockData>>([
    ...(fmp?[{source:'Financial Modeling Prep',load:()=>fmpQuote(ticker,fmp)}]:[]),
    ...(av?[{source:'Alpha Vantage',load:async()=>{const q=object(object(await json(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(av)}`))['Global Quote']);return Number(q['05. price'])>0?{price:Number(q['05. price']),change:numeric(Number(q['09. change'])),changePercent:numeric(Number(String(q['10. change percent']).replace('%',''))),asOf:typeof q['07. latest trading day']==='string'?`${q['07. latest trading day']}T00:00:00Z`:null}:null;}}]:[]),
  ]);if(quote)Object.assign(result,quote.data,{quoteSource:quote.source});}
  if(fmp){try{const financial=await fmpFinancials(ticker,fmp,period);if(financial)Object.assign(result,{financialSource:`Financial Modeling Prep · ${period}`,financialDate:financial.date,ratios:financial.ratios,statements:financial.statements});}catch{/* SEC remains available without FMP entitlements. */}}
  // SEC offers filings, not a substitute for current market quotes or price history.
  const key=(label:string)=>label.split(' ')[0]==='EV'?'EV/EBITDA':label.split(/[ ·]/)[0];
  if(!result.financialSource||result.ratios.some(r=>r.value===null)||Object.values(result.statements).some(rows=>!rows.length||rows.some(r=>r.value===null))){try{const raw=await secFacts(ticker);if(raw){const financial=parseSecFinancials(raw,result.price,period);
    if(financial.date&&!result.financialSource)Object.assign(result,{financialSource:`SEC EDGAR · ${period==='annual'?'annual 10-K':'quarterly 10-Q'}`,financialDate:financial.date,ratios:financial.ratios,statements:financial.statements});
    else if(financial.date&&financial.date===result.financialDate){let filled=false;
      result.ratios=result.ratios.map(row=>{if(row.value!==null)return row;const v=financial.ratios.find(r=>key(r.label)===key(row.label))?.value??null;if(v!==null)filled=true;return {...row,value:v};});
      result.statements=Object.fromEntries((['income','balance','cash'] as const).map(group=>{const own=result.statements[group];if(!own.length){if(financial.statements[group].some(r=>r.value!==null))filled=true;return [group,financial.statements[group]];}return [group,own.map(row=>{if(row.value!==null)return row;const v=financial.statements[group].find(r=>r.label===row.label)?.value??null;if(v!==null)filled=true;return {...row,value:v};})];})) as StockData['statements'];
      if(filled)result.financialSource=`${result.financialSource} + SEC EDGAR (gaps filled)`;}
    if(result.marketCap===null)result.marketCap=financial.marketCap;}}catch{result.warnings.push('SEC financial filings are temporarily unavailable.');}}
  if(period==='annual'&&alpha?.overview&&result.ratios.every(r=>!r.label.startsWith('EV / EBITDA')||r.value===null)){
    const overview=await alpha.overview();
    if(overview){result.ratios.push(...overview.ratios);result.financialSource=[result.financialSource,'Alpha Vantage · TTM ratios'].filter(Boolean).join(' + ');result.warnings.push(`Alpha Vantage TTM ratios: latest quarter ${overview.date??'unavailable'}; retrieved ${overview.fetchedAt}. These are not annual filing ratios.`);}
    else result.warnings.push('Alpha Vantage enrichment unavailable or quota limited. Public sources remain in use.');
  }
  if(!result.quoteSource)result.warnings.push('Latest quote unavailable. Optional FMP or Alpha Vantage keys can be added and tested in Settings → Data & Credentials; access depends on your provider plan. Yahoo and SEC require no key.');
  if(!result.chartSource)result.warnings.push('Price history unavailable from current providers.');
  if(result.chartSource==='Alpha Vantage · daily')result.warnings.push('Fallback history is daily and limited to the free provider window.');
  result.warnings.push('Quotes may be delayed. SEC ratios use annual filings; market cap may use filing-date shares, not live shares.');
  return result;
}
export async function getStockData(ticker:string,range:StockRange,userId:string,credential:{key:string;version:string}|null,period:'annual'|'quarter',alpha:AlphaCredential|null=null){
  const key=`v4:${userId}:${credential?.version??'public'}:${alpha?.version??'no-alpha'}:${ticker}:${range}:${period}`,cached=cache.get(key);if(cached&&cached.expires>Date.now())return {...cached.data,cached:true};
  const inflight=pending.get(key);if(inflight)return inflight;
  const task=loadStock(ticker,range,credential?.key??null,period,alpha).then(data=>{if(!data.chartSource&&cached){data.candles=cached.data.candles;data.chartSource=cached.data.chartSource;data.warnings.push(`Cached chart fetched ${cached.data.fetchedAt}; current chart unavailable.`);}if(cache.size>=100)cache.delete(cache.keys().next().value??'');cache.set(key,{expires:Date.now()+60000,data});return data;}).finally(()=>pending.delete(key));pending.set(key,task);return task;
}