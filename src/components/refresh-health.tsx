import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const LABELS: Record<string, string> = { 'sec-filings': 'SEC filings', 'analyst-views': 'Analyst views', 'industry-norms': 'Industry averages (Damodaran)' };

/** Latest scheduled-refresh result per source. */
export function RefreshHealth() {
  const q = useQuery({ queryKey: ['data-refresh-health'], queryFn: async () => {
    const { data, error } = await supabase.from('data_refresh_runs').select('source,status,checked,refreshed,message,ran_at').order('ran_at', { ascending: false }).limit(30);
    if (error) throw error;
    const latest = new Map<string, NonNullable<typeof data>[number]>();
    for (const r of data ?? []) if (!latest.has(r.source)) latest.set(r.source, r);
    return [...latest.values()];
  } });
  if (q.isPending) return <p className="text-xs text-muted-foreground">Loading refresh status…</p>;
  if (q.isError) return <p className="text-xs text-destructive">Refresh status unavailable.</p>;
  if (!q.data.length) return <p className="text-xs text-muted-foreground">The daily refresh (06:15 UTC) has not run yet.</p>;
  return (
    <ul className="space-y-2">
      {q.data.map(r => (
        <li key={r.source} className="border-b border-border pb-2 text-xs">
          <span className="font-semibold">{LABELS[r.source] ?? r.source}</span>{' '}
          <span className={r.status === 'ok' ? 'text-primary' : 'text-destructive'}>{r.status === 'update_due' ? 'update due' : r.status}</span>{' '}
          <span className="text-muted-foreground">· {new Date(r.ran_at).toLocaleString()} · {r.message}</span>
        </li>
      ))}
    </ul>
  );
}
