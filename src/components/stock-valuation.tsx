import { useQuery } from '@tanstack/react-query';
import { getValuation } from '@/lib/valuation/valuation.functions';
import { ReportValuation } from './report-valuation';
export function StockValuation({ ticker }: { ticker: string }) {
  const result = useQuery({ queryKey: ['valuation',ticker], queryFn: () => getValuation({ data: { ticker } }), staleTime: 5 * 60 * 1000, retry: false });
  if (result.isPending) return <p className="py-4 text-sm text-muted-foreground">Loading valuation evidence…</p>;
  if (result.isError) return <p className="py-4 text-sm text-muted-foreground">Valuation evidence temporarily unavailable.</p>;
  return <ReportValuation value={result.data}/>;
}