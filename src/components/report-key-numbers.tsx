import { keyNumbers } from '@/lib/report-key-numbers';
const usd = (n: number | null) => n === null ? '—' : `$${n.toFixed(2)}`;
const pct = (n: number | null) => n === null ? '' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
export function ReportKeyNumbers({ sections, target, rating, conviction }: { sections: unknown; target: number | null; rating: string | null; conviction: number | null }) {
  const k = keyNumbers(sections, target);
  const cells: [string, string, (string | undefined)?][] = [
    ['Decision', rating ?? '—', conviction === null ? undefined : `Conviction ${conviction}/100`],
    ['Price at analysis', usd(k.price)],
    ['Our 12-month target', target === null ? 'Withheld' : usd(target), target === null ? 'Not supported by calculation' : `${pct(k.upsidePct)} vs price`],
    ['Calculated value', usd(k.intrinsic), k.method ?? undefined],
    ['Wall Street average', usd(k.wallStreet), k.gapToWallStreetPct === null ? (k.wallStreetSource || undefined) : `Our target ${pct(k.gapToWallStreetPct)}`],
    ['Checks', k.untracedFigures === null ? '—' : `${k.untracedFigures} untraced`, `${k.checkedFigures ?? 0} figures checked · ${k.warnings} warnings`],
  ];
  return <section aria-label="Key numbers and decision" className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
    {cells.map(([label, value, sub]) => <div key={label} className="bg-card p-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 font-mono text-lg text-foreground">{value}</p>{sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}</div>)}
  </section>;
}
