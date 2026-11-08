import { selectSecFact, type SecFact } from '@/lib/sec-periods';
/** Debt excludes leases: only explicit reported aggregates or complete components are combined. */
export function valuationBalance(facts: Record<string, unknown>, anchor: Record<string, unknown>, cutoff: string, dei?: Record<string, unknown>) {
  const get = (tags: string[], unit = 'USD') => selectSecFact(facts,tags,anchor,'instant',unit,cutoff);
  const combined = get(['LongTermDebtAndShortTermBorrowings','DebtCurrentAndNoncurrent','DebtLongtermAndShorttermCombinedAmount']);
  // DebtCurrent is the full current aggregate (current long-term debt plus short-term borrowings).
  const currentAll = get(['DebtCurrent']);
  const longTotal = get(['LongTermDebtCurrentAndNoncurrent']);
  const noncurrent = get(['LongTermDebtNoncurrent','LongTermDebtAndCapitalLeaseObligations']);
  const current = get(['LongTermDebtCurrent']);
  const short = get(['ShortTermBorrowings','ShortTermDebtCurrent']);
  let debt: SecFact | null = combined;
  const add = (a: SecFact,b: SecFact): SecFact => ({...a, value:a.value+b.value,tag:'DerivedTotalDebt',derived:true,inputs:[a,b]});
  if (!debt && noncurrent && currentAll) debt=add(noncurrent,currentAll);
  if (!debt && short) {
    if (longTotal) debt=add(longTotal,short);
    else if (noncurrent && current) debt=add(add(noncurrent,current),short);
  }
  const cash = get(['CashAndCashEquivalentsAtCarryingValue']);
  let shares = get(['CommonStockSharesOutstanding'],'shares');
  // Cover-page count from the SAME filing (dated shortly after period end) when the balance sheet omits it.
  if (!shares && dei) { const r=secRowsSameFiling(dei,anchor,cutoff); if (r) shares=r; }
  return { debt, cash, shares, note:'Same-filing debt, unrestricted cash and period-end common shares. Debt requires an explicit aggregate or complete long/short-term components; missing short-term borrowing is not zero. Lease liabilities, minority interests and preferred equity are not included.' };
}
function secRowsSameFiling(dei: Record<string, unknown>, anchor: Record<string, unknown>, cutoff: string): SecFact | null {
  const units=(dei['EntityCommonStockSharesOutstanding'] as {units?:{shares?:Record<string,unknown>[]}}|undefined)?.units?.shares??[];
  const rows=units.filter(r=>(anchor['accn']?r['accn']===anchor['accn']:r['filed']===anchor['filed'])&&String(r['filed'])<=cutoff);
  if(!rows.length) return null;
  const total=rows.reduce((a,r)=>a+Number(r['val']),0); const r=rows[0]!;
  // Multiple classes are summed; all come from the same cover page.
  return {value:total,tag:'dei:EntityCommonStockSharesOutstanding',unit:'shares',start:null,end:String(r['end']),filed:String(r['filed']),accession:typeof r['accn']==='string'?r['accn']:null,derived:rows.length>1};
}
