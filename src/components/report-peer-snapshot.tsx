import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { getReportPeerSnapshot } from '@/lib/valuation/peer-snapshot.functions';
type Snap=Awaited<ReturnType<typeof getReportPeerSnapshot>>;
const pct=(n:number|null)=>n===null?'—':`${n>0?'+':''}${n.toFixed(2)}%`;
const big=(n:number|null)=>n===null?'—':Math.abs(n)>=1e12?`$${(n/1e12).toFixed(2)}T`:Math.abs(n)>=1e9?`$${(n/1e9).toFixed(1)}B`:`$${(n/1e6).toFixed(0)}M`;
const x=(n:number|null)=>n===null?'—':`${n.toFixed(1)}×`;
const tone=(n:number|null)=>n===null?'':n>=0?'text-primary':'text-destructive';
export function ReportPeerSnapshot({id}:{id:string}){
  const fetchSnap=useServerFn(getReportPeerSnapshot),[snap,setSnap]=useState<Snap|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function load(){setBusy(true);setError('');try{setSnap(await fetchSnap({data:{id}}));}catch{setError('Comparable company figures are unavailable right now. Your saved report is unchanged.');}finally{setBusy(false);}}
  return <section className="space-y-3 border-t border-border pt-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Comparable Companies Snapshot</h2><Button variant="outline" size="sm" onClick={()=>void load()} disabled={busy}><RefreshCw className={busy?'animate-spin':''}/>{snap?'Refresh':'Load comparables'}</Button></div>
    {error&&<p className="text-sm text-destructive">{error}</p>}
    {!snap&&!error&&<p className="text-sm text-muted-foreground">Compare this stock with three similar companies picked by the report’s AI model: price moves, valuation ratios, sales and size.</p>}
    {snap&&<>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground">{['Company','Price','1 day','30 days','1 year','Market cap','Sales (TTM)','Net income (TTM)','P/E','P/S','Net margin'].map(h=><th key={h} className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>)}</tr></thead>
      <tbody>{snap.rows.map(r=><tr key={r.ticker} className={`border-b border-border ${r.role==='subject'?'bg-muted/50 font-medium':''}`}>
        <td className="px-2 py-2"><div>{r.ticker}{r.role==='subject'&&<span className="ml-1 text-xs text-muted-foreground">(this report)</span>}</div><div className="text-xs text-muted-foreground">{r.company}</div>{r.note&&<div className="text-xs text-muted-foreground">{r.note}</div>}</td>
        <td className="px-2 py-2 whitespace-nowrap">{r.price===null?'—':`$${r.price.toFixed(2)}`}</td>
        {[r.change1d,r.change30d,r.change1y].map((v,i)=><td key={i} className={`px-2 py-2 whitespace-nowrap ${tone(v)}`}>{pct(v)}</td>)}
        <td className="px-2 py-2">{big(r.marketCap)}</td><td className="px-2 py-2">{big(r.ttmRevenue)}</td><td className="px-2 py-2">{big(r.ttmNetIncome)}</td><td className="px-2 py-2">{x(r.pe)}</td><td className="px-2 py-2">{x(r.ps)}</td><td className="px-2 py-2">{pct(r.netMargin)}</td></tr>)}</tbody></table></div>
      <p className="text-xs text-muted-foreground">{snap.note} {snap.model&&`Model: ${snap.model}. `}Sources: {snap.source}. Retrieved {snap.retrievedAt.slice(0,16).replace('T',' ')} UTC. P/E is blank for loss-making companies.</p>
    </>}
  </section>;
}
