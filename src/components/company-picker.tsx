import { useEffect, useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Search, ArrowRight, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { findCompanies, resolveTicker, COMPANY_CATALOG_SOURCE, COMPANY_CATALOG_RETRIEVED_AT } from '@/lib/companies';
import { searchCompanyBackup } from '@/lib/company-search.functions';
export function CompanyPicker({ value, onChange, onSelect }: { value: string; onChange: (v: string) => void; onSelect?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState('company');
  const id = useId();
  const backup = useServerFn(searchCompanyBackup);
  const lookup = useMutation({ mutationFn: (query: string) => backup({ data: { query } }) });
  const local = findCompanies(value);
  const matches = lookup.data && lookup.variables === value.trim() ? lookup.data.companies : local;
  const directValid = /^[A-Z][A-Z0-9.\-]{0,9}$/.test(value.trim().toUpperCase());
  useEffect(() => {
    if (mode !== 'company' || !open || local.length || value.trim().length < 2) return;
    const timer = window.setTimeout(() => lookup.mutate(value.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [value, mode, open]);
  function select(ticker: string) { onChange(ticker); setOpen(false); onSelect?.(ticker); }
  return <div className="min-w-0 space-y-1.5">
    <ToggleGroup type="single" value={mode} onValueChange={next => { if (next) { setMode(next); setOpen(false); setActive(0); lookup.reset(); } }} aria-label="Stock entry mode" className="justify-start" size="sm">
      <ToggleGroupItem value="company" className="h-7 text-xs">Company search</ToggleGroupItem>
      <ToggleGroupItem value="ticker" className="h-7 text-xs">Enter ticker</ToggleGroupItem>
    </ToggleGroup>
    <div className="relative min-w-0">
    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input aria-label={mode==='ticker'?'Ticker symbol':'Company or ticker'} aria-expanded={mode==='company'&&open} aria-controls={id} role={mode==='company'?'combobox':undefined} autoComplete="off" placeholder={mode==='ticker'?'LITE, NVDA, SIE.DE…':'Company or ticker…'} className="pl-9 pr-9 text-sm" value={value}
      onFocus={() => setOpen(true)} onBlur={() => { window.setTimeout(() => setOpen(false), 150); if(mode==='ticker')onChange(value.trim().toUpperCase()); else onChange(resolveTicker(value)); }}
      onChange={e => { onChange(mode==='ticker'?e.target.value.toUpperCase():e.target.value); setOpen(true); setActive(0); }}
      onKeyDown={e => { if(e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i+1,matches.length-1)); } if(e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0,i-1)); } if(e.key === 'Escape') setOpen(false); if(e.key === 'Enter') { e.preventDefault(); if(mode==='ticker'){if(directValid)select(value.trim().toUpperCase());}else if(matches[active])select(matches[active].ticker);else if(directValid)select(resolveTicker(value)); } }} />
    {mode==='ticker'&&<Button size="icon" variant="ghost" aria-label="Use ticker" title="Use ticker" className="absolute right-0 top-0 h-9 w-9" disabled={!directValid} onClick={()=>select(value.trim().toUpperCase())}><ArrowRight className="h-4 w-4"/></Button>}
    {mode==='company'&&open && matches.length > 0 && <div id={id} role="listbox" className="absolute z-30 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-lg">
      {matches.map((c,i) => <Button key={c.ticker} role="option" aria-selected={active===i} variant={active===i ? 'secondary' : 'ghost'} className="h-auto w-full justify-between gap-3 px-2 py-2 text-left" onMouseDown={e => e.preventDefault()} onClick={() => select(c.ticker)}>
        <span className="min-w-0"><span className="block font-mono text-xs font-semibold">{c.ticker}</span><span className="block truncate text-xs text-muted-foreground">{c.name}</span></span><span className="text-[10px] text-muted-foreground">{c.exchange}</span>
      </Button>)}
    </div>}
    </div>
    {mode==='company'&&<div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground"><a href={lookup.data&&lookup.variables===value.trim()&&lookup.data.source==='Yahoo Finance'?`https://finance.yahoo.com/lookup/?s=${encodeURIComponent(value)}`:COMPANY_CATALOG_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">{lookup.data&&lookup.variables===value.trim()?`${lookup.data.source} · ${lookup.data.cached?'Cached':'Fetched'} ${new Date(lookup.data.fetchedAt).toLocaleDateString()}`:`SEC catalog · Saved ${new Date(COMPANY_CATALOG_RETRIEVED_AT).toLocaleDateString()}`}</a><Button size="sm" variant="ghost" className="h-6 px-1 text-[10px]" disabled={value.trim().length<2||lookup.isPending} onMouseDown={e=>e.preventDefault()} onClick={()=>{setOpen(true);lookup.mutate(value.trim());}}><RefreshCw className="h-3 w-3"/>{lookup.isPending?'Searching…':'Backup search'}</Button></div>}
    {mode==='company'&&lookup.isError&&<p className="text-[10px] text-muted-foreground">Backup search unavailable. Saved company matches remain available.</p>}
    {mode==='company'&&open&&!matches.length&&!lookup.isPending&&value.trim().length>1&&<p className="text-[10px] text-muted-foreground">No company match.</p>}
    {mode==='ticker'&&value.trim()&&!directValid&&<p className="text-[10px] text-negative">Enter a ticker symbol, not a company name.</p>}
  </div>;
}