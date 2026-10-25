import { cn } from '@/lib/utils';
export function RecommendationBadge({value,demo=false}:{value:string|null;demo?:boolean}) {
  const positive=value?.includes('BUY');const negative=value?.includes('SELL');
  return <span className={cn('inline-flex rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold',demo?'border-border text-muted-foreground':positive?'border-positive/30 bg-positive/10 text-positive':negative?'border-negative/30 bg-negative/10 text-negative':'border-warning/30 bg-warning/10 text-warning')}>{demo?'DEMO · NOT RATED':value ?? 'NOT RATED'}</span>;
}