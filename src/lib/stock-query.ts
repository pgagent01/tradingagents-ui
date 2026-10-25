import { queryOptions } from '@tanstack/react-query';
import { fetchStockData } from '@/lib/stock-data.functions';
import { type StockRange } from '@/lib/stock-data';
export const stockQuery=(ticker:string,range:StockRange)=>queryOptions({queryKey:['stock-data',ticker,range],queryFn:()=>fetchStockData({data:{ticker,range}}),staleTime:60000,gcTime:1800000});