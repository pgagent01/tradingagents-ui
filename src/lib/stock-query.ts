import { queryOptions } from '@tanstack/react-query';
import { fetchStockData } from '@/lib/stock-data.functions';
import { type StockRange } from '@/lib/stock-data';
export const stockQuery=(ticker:string,range:StockRange,period:'annual'|'quarter'='annual')=>queryOptions({queryKey:['stock-data',ticker,range,period],queryFn:()=>fetchStockData({data:{ticker,range,period}}),staleTime:60000,gcTime:1800000});