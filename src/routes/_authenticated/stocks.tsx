import { createFileRoute,useNavigate } from '@tanstack/react-router';
import { StockInfo } from '@/components/stock-info';
import { stockQuery } from '@/lib/stock-query';
import { STOCK_RANGES,type StockRange } from '@/lib/stock-data';
import { pageHead } from '@/lib/page-head';
import { DataError } from '@/components/route-feedback';
export const Route=createFileRoute('/_authenticated/stocks')({
  head:()=>pageHead('Stock Info','Explore stock prices, interactive charts, financial ratios and SEC statements.'),
  validateSearch:(search:Record<string,unknown>)=>({range:STOCK_RANGES.includes(search['range'] as StockRange)?search['range'] as StockRange:'1M' as StockRange}),
  loaderDeps:({search})=>({range:search.range}),loader:({context,deps})=>context.queryClient.ensureQueryData(stockQuery('AAPL',deps.range)),errorComponent:DataError,notFoundComponent:()=> <p>Stock unavailable.</p>,component:Stocks,
});
function Stocks(){const {range}=Route.useSearch();const nav=useNavigate();return <StockInfo ticker="AAPL" range={range} onRange={range=>void nav({to:'/stocks',search:{range}})}/>;}