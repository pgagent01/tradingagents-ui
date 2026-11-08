import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { PeerSnapshotRow } from '@/lib/valuation/peer-snapshot';
import { heatTone } from '@/lib/report-visuals';
function useMounted(){const [m,setM]=useState(false);useEffect(()=>setM(true),[]);return m;}
const axis={tickLine:false,axisLine:false} as const;
const cfg={change1d:{label:'1 day %',color:'var(--chart-3)'},change30d:{label:'30 days %',color:'var(--chart-2)'},change1y:{label:'1 year %',color:'var(--chart-1)'},pe:{label:'P/E',color:'var(--chart-1)'},evSales:{label:'EV/Sales',color:'var(--chart-2)'},evEbit:{label:'EV/EBIT',color:'var(--chart-3)'},operatingMargin:{label:'Operating margin %',color:'var(--chart-1)'},fcfMargin:{label:'FCF margin %',color:'var(--chart-2)'},revenueGrowth:{label:'Revenue growth %',color:'var(--chart-3)'},returnPct:{label:'This stock %',color:'var(--chart-1)'},benchmarkPct:{label:'S&P 500 (SPY) %',color:'var(--chart-5)'}};
function Box({title,note,children}:{title:string;note:string;children:React.ReactNode}){return <div className="min-w-0 rounded-md border border-border p-3"><h3 className="text-sm font-semibold">{title}</h3><p className="mb-2 text-xs text-muted-foreground">{note}</p>{children}</div>;}
function Bars({data,keys,x}:{data:object[];keys:(keyof typeof cfg)[];x:string}){
  return <ChartContainer config={cfg} className="h-56 w-full aspect-auto"><BarChart data={data} accessibilityLayer><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey={x} {...axis}/><YAxis width={40} {...axis}/><ReferenceLine y={0} stroke="var(--border)"/><ChartTooltip content={<ChartTooltipContent/>}/><ChartLegend content={<ChartLegendContent/>}/>{keys.map(k=><Bar key={k} dataKey={k} fill={`var(--color-${k})`} radius={3}/>)}</BarChart></ChartContainer>;
}
export function PeerCharts({rows}:{rows:PeerSnapshotRow[]}){
  if(!useMounted()||rows.length<2) return null;
  return <div className="grid gap-4 lg:grid-cols-3">
    <Box title="Share price moves" note="How each stock has traded recently."><Bars data={rows} keys={['change1d','change30d','change1y']} x="ticker"/></Box>
    <Box title="Valuation multiples" note="Lower = cheaper per dollar of profit or sales. Blank when profit is negative."><Bars data={rows} keys={['pe','evSales','evEbit']} x="ticker"/></Box>
    <Box title="Business quality & growth" note="Margins over the last 12 months; growth is the latest fiscal year."><Bars data={rows} keys={['operatingMargin','fcfMargin','revenueGrowth']} x="ticker"/></Box>
  </div>;
}
type Win={days:number;status:string;returnPct:number|null;benchmarkPct:number|null};
export function ScorecardChart({windows}:{windows:Win[]}){
  const mounted=useMounted(); const data=windows.filter(w=>w.status==='available').map(w=>({label:`${w.days} days`,returnPct:w.returnPct,benchmarkPct:w.benchmarkPct}));
  if(!mounted) return null;
  if(!data.length) return <p className="text-xs text-muted-foreground">The return chart appears once the first 30-day window has passed.</p>;
  return <Box title="Return since the report vs the S&P 500" note="Price change only; excludes dividends."><Bars data={data} keys={['returnPct','benchmarkPct']} x="label"/></Box>;
}
type Cell={discountRate:unknown;terminalGrowth:unknown;value:unknown};
export function SensitivityHeatmap({cells,price}:{cells:Cell[];price:number|null}){
  const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
  const rates=[...new Set(cells.map(c=>n(c.discountRate)).filter((v):v is number=>v!==null))].sort((a,b)=>a-b);
  const growths=[...new Set(cells.map(c=>n(c.terminalGrowth)).filter((v):v is number=>v!==null))].sort((a,b)=>a-b);
  if(!rates.length||!growths.length) return null;
  const find=(r:number,g:number)=>n(cells.find(c=>n(c.discountRate)===r&&n(c.terminalGrowth)===g)?.value);
  const pc=(v:number)=>`${(v*100).toFixed(2)}%`;
  return <div><div className="overflow-x-auto"><table className="text-xs"><thead><tr><th className="p-2 text-left font-medium text-muted-foreground">Discount rate ↓ / long-term growth →</th>{growths.map(g=><th key={g} className="p-2 font-mono font-medium">{pc(g)}</th>)}</tr></thead>
    <tbody>{rates.map(r=><tr key={r}><th className="p-2 text-left font-mono font-medium">{pc(r)}</th>{growths.map(g=>{const v=find(r,g);return <td key={g} className={`min-w-24 rounded border border-background p-2 text-center font-mono ${heatTone(v,price)}`}>{v===null?'—':`$${v.toFixed(2)}`}</td>;})}</tr>)}</tbody></table></div>
    <p className="mt-1 text-xs text-muted-foreground">{price!==null?`Green = above the report price ($${price.toFixed(2)}), red = below; stronger colour = bigger gap.`:'No report price saved, so cells are not coloured.'}</p></div>;
}
