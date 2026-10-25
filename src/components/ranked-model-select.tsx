import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ModelChoice, rankModelChoices } from '@/lib/research-config';

export function RankedModelSelect({label,value,models,onChange}: {
  label: string; value: string; models: ModelChoice[]; onChange: (value: string) => void;
}) {
  const ranked = rankModelChoices(models);
  return <Select value={value || '__custom__'} onValueChange={model => {if(model !== '__custom__') onChange(model);}}>
    <SelectTrigger aria-label={label} title="Ranked by 50% uncached input + 50% output cost; within this provider. Built-in uses base-tier catalog credits; BYOK uses configured USD assumptions." className="mb-1 h-auto min-h-9 w-full text-xs [&>span]:line-clamp-none [&>span]:min-w-0">
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="max-w-[calc(100vw-2rem)]">
      {!ranked.some(m => m.model === value) && <SelectItem value={value || '__custom__'}>{value || 'Custom model'} · Unranked</SelectItem>}
      {ranked.map(m => <SelectItem key={m.model} value={m.model} textValue={`${m.rank ? `#${m.rank}` : 'Unranked'} ${m.model}${m.rank === 1 ? ' Cheapest' : ''}`}>
        <span className="flex items-center gap-2 whitespace-normal text-xs">
          <span className="shrink-0 font-mono text-muted-foreground">{m.rank ? `#${m.rank}` : '—'}</span>
          <span className="min-w-0 break-all">{m.model}</span>
          {m.rank === 1 && <span className="shrink-0 rounded-sm border border-positive bg-positive/10 px-1.5 py-0.5 text-[10px] font-semibold text-positive">Cheapest</span>}
          {m.rank === null && <span className="shrink-0 text-muted-foreground">Price unavailable</span>}
        </span>
      </SelectItem>)}
    </SelectContent>
  </Select>;
}