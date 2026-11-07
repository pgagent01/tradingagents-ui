export const STOCK_RANGES = ['1D','1W','1M','6M','1Y','5Y'] as const;
export type StockRange = typeof STOCK_RANGES[number];
export type Candle = {time:number;open:number;high:number;low:number;close:number;volume:number|null};
export type FinancialRow = {label:string;value:number|null};
export type StockData = {
  ticker:string;company:string;currency:string;quoteSource:string|null;chartSource:string|null;financialSource:string|null;
  asOf:string|null;fetchedAt:string;cached:boolean;warnings:string[];candles:Candle[];
  price:number|null;change:number|null;changePercent:number|null;marketCap:number|null;low52:number|null;high52:number|null;volume:number|null;
  ratios:FinancialRow[];statements:Record<'income'|'balance'|'cash',FinancialRow[]>;financialDate:string|null;
};
export function numeric(v:unknown):number|null {return typeof v==='number'&&Number.isFinite(v)?v:null;}
export function object(v:unknown):Record<string,unknown>{return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};}
export function validTicker(ticker:string){return /^[A-Z0-9^][A-Z0-9.^-]{0,14}$/.test(ticker);}
export function parseYahooChart(raw:unknown) {
  const chart=object(object(raw)['chart']);const result=chart['result'];const data=object(Array.isArray(result)?result[0]:null);
  const meta=object(data['meta']);const indicators=object(data['indicators']);const q=indicators['quote'];const quote=object(Array.isArray(q)?q[0]:null);
  const times=data['timestamp'];const values=(key:string)=>Array.isArray(quote[key])?quote[key] as unknown[]:[];
  const candles:Candle[]=[];
  if(Array.isArray(times))times.forEach((t,i)=>{const time=numeric(t),open=numeric(values('open')[i]),high=numeric(values('high')[i]),low=numeric(values('low')[i]),close=numeric(values('close')[i]);if(time!==null&&open!==null&&high!==null&&low!==null&&close!==null)candles.push({time,open,high,low,close,volume:numeric(values('volume')[i])});});
  const price=numeric(meta['regularMarketPrice']);const previous=numeric(meta['previousClose'])??numeric(meta['regularMarketPreviousClose'])??numeric(meta['chartPreviousClose']);
  return {candles,meta,price,change:price!==null&&previous!==null?price-previous:null,changePercent:price!==null&&previous!==null&&previous!==0?(price-previous)/previous*100:null};
}
export function parseStooqCsv(csv:string):Candle[]{
  return csv.trim().split(/\r?\n/).slice(1).flatMap(line=>{const [date,...values]=line.split(',');const time=Date.parse(`${date}T00:00:00Z`)/1000;const [open,high,low,close,volume]=values.map(Number);if(!Number.isFinite(time)||open===undefined||high===undefined||low===undefined||close===undefined||![open,high,low,close].every(n=>Number.isFinite(n)&&n>0))return [];return [{time,open,high,low,close,volume:volume!==undefined&&Number.isFinite(volume)?volume:null}];}).sort((a,b)=>a.time-b.time);
}
export async function firstAvailable<T>(providers:{source:string;load:()=>Promise<T|null>}[]):Promise<{source:string;data:T}|null>{
  for(const provider of providers){try{const data=await provider.load();if(data!==null)return {source:provider.source,data};}catch{/* Provider failure is isolated; try the next source. */}}
  return null;
}
export function emptyStock(ticker:string,company:string):StockData{return {ticker,company,currency:'USD',quoteSource:null,chartSource:null,financialSource:null,asOf:null,fetchedAt:new Date().toISOString(),cached:false,warnings:[],candles:[],price:null,change:null,changePercent:null,marketCap:null,low52:null,high52:null,volume:null,ratios:[],statements:{income:[],balance:[],cash:[]},financialDate:null};}
export function parseSecFinancials(raw:unknown,price:number|null,period:'annual'|'quarter'='annual') {
  const facts=object(object(object(raw)['facts'])['us-gaap']);
  const entries=(names:string[],unit='USD')=>names.flatMap(name=>{const rows=object(object(facts[name])['units'])[unit];return Array.isArray(rows)?rows.map(object):[];});
  const form=period==='annual'?'10-K':'10-Q';
  const durationMatches=(r:Record<string,unknown>)=>{if(typeof r['start']!=='string'||typeof r['end']!=='string')return false;const days=(Date.parse(r['end'])-Date.parse(r['start']))/86400000;return period==='annual'?days>300:days>=60&&days<=110;};
  const annual=entries(['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet','RevenueFromContractWithCustomerIncludingAssessedTax','SalesRevenueGoodsNet']).filter(r=>r['form']===form&&durationMatches(r)).sort((a,b)=>String(b['end']).localeCompare(String(a['end']))||String(b['filed']).localeCompare(String(a['filed'])));
  const date=typeof annual[0]?.['end']==='string'?annual[0]['end']:null;
  const get=(names:string[],duration=false,unit='USD')=>{
    const rows=entries(names,unit).filter(r=>r['end']===date&&r['form']===form&&(!duration||durationMatches(r))).sort((a,b)=>String(b['filed']).localeCompare(String(a['filed'])));
    return numeric(rows[0]?.['val']);
  };
  const revenue=get(['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet','RevenueFromContractWithCustomerIncludingAssessedTax','SalesRevenueGoodsNet'],true),income=get(['NetIncomeLoss'],true),equity=get(['StockholdersEquity']),shares=get(['CommonStockSharesOutstanding'],false,'shares'),cash=get(['CashAndCashEquivalentsAtCarryingValue','CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents']),assets=get(['Assets']),totalLe=get(['LiabilitiesAndStockholdersEquity']),liabilities=get(['Liabilities'])??(totalLe!==null&&equity!==null?totalLe-equity:null),cost=get(['CostOfRevenue','CostOfGoodsAndServicesSold'],true),gross=get(['GrossProfit'],true)??(revenue!==null&&cost!==null?revenue-cost:null);
  const marketCap=shares!==null&&price!==null?shares*price:null;
  const divide=(a:number|null,b:number|null,scale=1)=>a!==null&&b!==null&&b!==0?a/b*scale:null;
  return {date,marketCap,ratios:[{label:'P/E · FY earnings',value:period==='annual'?divide(marketCap,income):null},{label:'P/S · FY revenue',value:period==='annual'?divide(marketCap,revenue):null},{label:'EV / EBITDA',value:null},{label:'Net margin %',value:divide(income,revenue,100)},{label:period==='annual'?'ROE % · year-end equity':'ROE % · quarter (not annualized)',value:divide(income,equity,100)}],statements:{income:[{label:'Revenue',value:revenue},{label:'Gross profit',value:gross},{label:'Operating income',value:get(['OperatingIncomeLoss'],true)},{label:'Net income',value:income}],balance:[{label:'Total assets',value:assets},{label:'Total liabilities',value:liabilities},{label:'Stockholders equity',value:equity},{label:'Cash & equivalents',value:cash}],cash:[{label:'Operating cash flow',value:get(['NetCashProvidedByUsedInOperatingActivities'],true)},{label:'Investing cash flow',value:get(['NetCashProvidedByUsedInInvestingActivities'],true)},{label:'Financing cash flow',value:get(['NetCashProvidedByUsedInFinancingActivities'],true)}]}};
}