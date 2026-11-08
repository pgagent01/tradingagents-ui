import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { getValuation } from '@/lib/valuation/valuation.functions';
import { ReportValuation } from './report-valuation';
export function StockValuation({ ticker }: { ticker: string }) {
  const { data } = useSuspenseQuery(valuationQuery(ticker));
  return <div className="mx-auto mt-6 max-w-6xl"><ReportValuation value={data}/></div>;
}
export const valuationQuery = (ticker: string) => queryOptions({ queryKey: ['valuation',ticker], queryFn: () => getValuation({ data: { ticker } }), staleTime: 5 * 60 * 1000, retry: false });