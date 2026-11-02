import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { findCompanies, resolveTicker } from '@/lib/companies';
export function CompanyPicker({ value, onChange, onSelect }: { value: string; onChange: (v: string) => void; onSelect?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = findCompanies(value);
  function select(ticker: string) { onChange(ticker); setOpen(false); onSelect?.(ticker); }
  return <div className="relative min-w-0">
    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input aria-label="Company or ticker" aria-expanded={open} aria-controls="company-matches" role="combobox" autoComplete="off" placeholder="Company or ticker…" className="pl-9 text-sm" value={value}
      onFocus={() => setOpen(true)} onBlur={() => { window.setTimeout(() => setOpen(false), 150); onChange(resolveTicker(value)); }}
      onChange={e => { onChange(e.target.value); setOpen(true); setActive(0); }}
      onKeyDown={e => { if(e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i+1,matches.length-1)); } if(e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0,i-1)); } if(e.key === 'Escape') setOpen(false); if(e.key === 'Enter') { e.preventDefault(); select(matches[active]?.ticker ?? resolveTicker(value)); } }} />
    {open && matches.length > 0 && <div id="company-matches" role="listbox" className="absolute z-30 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-lg">
      {matches.map((c,i) => <Button key={c.ticker} role="option" aria-selected={active===i} variant={active===i ? 'secondary' : 'ghost'} className="h-auto w-full justify-between gap-3 px-2 py-2 text-left" onMouseDown={e => e.preventDefault()} onClick={() => select(c.ticker)}>
        <span className="min-w-0"><span className="block font-mono text-xs font-semibold">{c.ticker}</span><span className="block truncate text-xs text-muted-foreground">{c.name}</span></span><span className="text-[10px] text-muted-foreground">{c.exchange}</span>
      </Button>)}
    </div>}
  </div>;
}