import { createFileRoute,useNavigate,notFound } from '@tanstack/react-router';
import { StockInfo } from '@/components/stock-info';
import { stockQuery } from '@/lib/stock-query';
import { STOCK_RANGES,validTicker,type StockRange } from '@/lib/stock-data';
import { pageHead } from '@/lib/page-head';
import { DataError } from '@/components/route-feedback';
export const Route=createFileRoute('/_authenticated/stocks_/$ticker')({
  validateSearch:(search:Record<string,unknown>)=>({range:STOCK_RANGES.includes(search['range'] as StockRange)?search['range'] as StockRange:'1M' as StockRange,period:search['period']==='quarter'?'quarter' as const:'annual' as const}),
  loaderDeps:({search})=>({range:search.range,period:search.period}),loader:({context,params,deps})=>{const ticker=params.ticker.toUpperCase();if(!validTicker(ticker))throw notFound();return context.queryClient.ensureQueryData(stockQuery(ticker,deps.range,deps.period));},errorComponent:DataError,notFoundComponent:()=> <p>Enter a valid stock ticker.</p>,component:Stock,
  head:({params})=>pageHead(`${params.ticker.toUpperCase()} Stock Info`,'Latest stock quotes, interactive OHLCV charts, valuation ratios and financial statements.'),
});
function Stock(){const {ticker}=Route.useParams();const {range,period}=Route.useSearch();const nav=useNavigate();return <StockInfo key={ticker} ticker={ticker.toUpperCase()} range={range} period={period} onPeriod={period=>void nav({to:'/stocks/$ticker',params:{ticker},search:{range,period}})} onRange={range=>void nav({to:'/stocks/$ticker',params:{ticker},search:{range,period}})}/>;}