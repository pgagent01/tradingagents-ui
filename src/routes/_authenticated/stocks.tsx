import { createFileRoute,useNavigate } from '@tanstack/react-router';
import { StockInfo } from '@/components/stock-info';
import { stockQuery } from '@/lib/stock-query';
import { STOCK_RANGES,type StockRange } from '@/lib/stock-data';
import { pageHead } from '@/lib/page-head';
import { DataError } from '@/components/route-feedback';
export const Route=createFileRoute('/_authenticated/stocks')({
  head:()=>pageHead('Stock Info','Explore stock prices, interactive charts, financial ratios and SEC statements.'),
  validateSearch:(search:Record<string,unknown>)=>({range:STOCK_RANGES.includes(search['range'] as StockRange)?search['range'] as StockRange:'1M' as StockRange,period:search['period']==='quarter'?'quarter' as const:'annual' as const}),
  loaderDeps:({search})=>({range:search.range,period:search.period}),loader:({context,deps})=>context.queryClient.ensureQueryData(stockQuery('AAPL',deps.range,deps.period)),errorComponent:DataError,notFoundComponent:()=> <p>Stock unavailable.</p>,component:Stocks,
});
function Stocks(){const {range,period}=Route.useSearch();const nav=useNavigate();return <StockInfo ticker="AAPL" range={range} period={period} onPeriod={period=>void nav({to:'/stocks',search:{range,period}})} onRange={range=>void nav({to:'/stocks',search:{range,period}})}/>;}