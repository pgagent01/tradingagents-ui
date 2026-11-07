import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { metricGuidance } from '@/lib/metric-guidance';

export function MetricLabel({ label }: { label: string }) {
  const description = metricGuidance(label);
  return <span className="inline-flex items-center gap-1">{label}{description && <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={`About ${label}`} className="h-5 w-5 shrink-0 text-muted-foreground"><Info className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent className="max-w-[min(20rem,calc(100vw-2rem))] whitespace-normal leading-5" side="top">{description}</TooltipContent></Tooltip></TooltipProvider>}</span>;
}