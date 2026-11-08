/** Heat-map tone: compares a value to the price; within ±10% is neutral. */
export function heatTone(value: number | null, price: number | null): string {
  if (value===null||price===null||price<=0) return 'bg-muted';
  const gap=value/price-1;
  if (Math.abs(gap)<0.1) return 'bg-muted';
  if (gap>0) return gap>=0.5?'bg-primary/40':'bg-primary/20';
  return gap<=-0.5?'bg-destructive/40':'bg-destructive/20';
}
