import { selectSecFact, type SecFact } from '@/lib/sec-periods';
/** Debt excludes leases: only explicit reported aggregates or complete components are combined. */
export function valuationBalance(facts: Record<string, unknown>, anchor: Record<string, unknown>, cutoff: string, dei?: Record<string, unknown>, annualAnchor?: Record<string, unknown>) {
  const get = (tags: string[], unit = 'USD', at: Record<string, unknown> = anchor) => selectSecFact(facts,tags,at,'instant',unit,cutoff);
  const combined = get(['LongTermDebtAndShortTermBorrowings','DebtCurrentAndNoncurrent','DebtLongtermAndShorttermCombinedAmount']);
  // DebtCurrent is the full current aggregate (current long-term debt plus short-term borrowings).
  const currentAll = get(['DebtCurrent']);
  const longTotal = get(['LongTermDebtCurrentAndNoncurrent']);
  const noncurrent = get(['LongTermDebtNoncurrent','LongTermDebtAndCapitalLeaseObligations']);
  const current = get(['LongTermDebtCurrent']);
  const short = get(['ShortTermBorrowings','ShortTermDebtCurrent','CommercialPaper']);
  let debt: SecFact | null = combined;
  const add = (a: SecFact,b: SecFact): SecFact => ({...a, value:a.value+b.value,tag:'DerivedTotalDebt',derived:true,inputs:[a,b]});
  if (!debt && noncurrent && currentAll) debt=add(noncurrent,currentAll);
  if (!debt && short) {
    if (longTotal) debt=add(longTotal,short);
    else if (noncurrent && current) debt=add(add(noncurrent,current),short);
  }
  let debtNote = '';
  // Some filers tag quarterly debt only with company-specific extensions; fall back to the latest annual report's standard lines, using the scheduled next-12-month principal as the current portion when no current-debt line is filed.
  if (!debt && annualAnchor && annualAnchor !== anchor) {
    const g = (t: string[]) => get(t,'USD',annualAnchor);
    const nc = g(['LongTermDebtNoncurrent','LongTermDebtAndCapitalLeaseObligations']);
    const cur = g(['LongTermDebtCurrent']) ?? g(['LongTermDebtMaturitiesRepaymentsOfPrincipalInNextTwelveMonths']);
    const st = g(['ShortTermBorrowings','ShortTermDebtCurrent','CommercialPaper']);
    const all = g(['DebtCurrent']);
    const annual = g(['LongTermDebtAndShortTermBorrowings','DebtCurrentAndNoncurrent','DebtLongtermAndShorttermCombinedAmount']) ?? (nc && all ? add(nc,all) : nc && cur && st ? add(add(nc,cur),st) : null);
    if (annual) { debt = {...annual, derived:true, tag: annual.tag === 'DerivedTotalDebt' ? 'DerivedTotalDebtAnnualFallback' : annual.tag}; debtNote = ` Debt (${annual.end}) comes from the latest annual report because the newest filing uses only company-specific debt tags; it may be stale.`; }
  }
  const cash = get(['CashAndCashEquivalentsAtCarryingValue']);
  let shares = get(['CommonStockSharesOutstanding'],'shares');
  // Cover-page count from the SAME filing (dated shortly after period end) when the balance sheet omits it.
  if (!shares && dei) { const r=secRowsSameFiling(dei,anchor,cutoff); if (r) shares=r; }
  return { debt, cash, shares, note:'Same-filing debt, unrestricted cash and period-end common shares. Debt requires an explicit aggregate or complete long/short-term components; missing short-term borrowing is not zero. Lease liabilities, minority interests and preferred equity are not included.'+debtNote };
}
function secRowsSameFiling(dei: Record<string, unknown>, anchor: Record<string, unknown>, cutoff: string): SecFact | null {
  const units=(dei['EntityCommonStockSharesOutstanding'] as {units?:{shares?:Record<string,unknown>[]}}|undefined)?.units?.shares??[];
  const rows=units.filter(r=>(anchor['accn']?r['accn']===anchor['accn']:r['filed']===anchor['filed'])&&String(r['filed'])<=cutoff);
  if(!rows.length) return null;
  // Companyfacts strips dimensional class identifiers: differing values cannot safely be summed.
  const end=rows.map(r=>String(r['end'])).filter(d=>d>=String(anchor['end'])&&d<=cutoff).sort().at(-1);
  if(!end) return null;
  const dated=rows.filter(r=>r['end']===end);
  const values=[...new Set(dated.map(r=>r['val']).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0))];
  if(values.length!==1 || dated.some(r=>typeof r['val']!=='number'||!Number.isFinite(r['val'])||Number(r['val'])<=0)) return null;
  const r=dated[0]; const value=values[0]; if(!r||value===undefined)return null;
  return {value,tag:'dei:EntityCommonStockSharesOutstanding',unit:'shares',start:null,end,filed:String(r['filed']),accession:typeof r['accn']==='string'?r['accn']:null,derived:false};
}
/** Provider market cap, else quote × same-filing SEC shares (labeled by callers); null when either is missing. */
export function marketCapOrDerived(provider: number | null | undefined, price: number | null | undefined, shares: number | null | undefined): number | null {
  if (typeof provider==='number'&&provider>0) return provider;
  return typeof price==='number'&&price>0&&typeof shares==='number'&&shares>0?price*shares:null;
}
