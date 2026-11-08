import { selectSecFact, type SecFact } from '@/lib/sec-periods';
/** Debt excludes leases: only explicit reported aggregates or complete components are combined. */
export function valuationBalance(facts: Record<string, unknown>, anchor: Record<string, unknown>, cutoff: string) {
  const get = (tags: string[], unit = 'USD') => selectSecFact(facts,tags,anchor,'instant',unit,cutoff);
  const combined = get(['LongTermDebtAndShortTermBorrowings','DebtCurrentAndNoncurrent']);
  const longTotal = get(['LongTermDebtCurrentAndNoncurrent','LongTermDebt']);
  const noncurrent = get(['LongTermDebtNoncurrent']);
  const current = get(['LongTermDebtCurrent']);
  const short = get(['ShortTermBorrowings','ShortTermDebtCurrent']);
  let debt: SecFact | null = combined;
  const add = (a: SecFact,b: SecFact): SecFact => ({...a, value:a.value+b.value,tag:'DerivedTotalDebt',derived:true,inputs:[a,b]});
  if (!debt && short) {
    if (longTotal) debt=add(longTotal,short);
    else if (noncurrent && current) debt=add(add(noncurrent,current),short);
  }
  const cash = get(['CashAndCashEquivalentsAtCarryingValue']);
  const shares = get(['CommonStockSharesOutstanding'],'shares');
  return { debt, cash, shares, note:'Same-filing debt, unrestricted cash and period-end common shares. Debt requires an explicit aggregate or complete long/short-term components; missing short-term borrowing is not zero. Lease liabilities, minority interests and preferred equity are not included.' };
}