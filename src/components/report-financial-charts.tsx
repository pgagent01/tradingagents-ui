import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { financialChartData, scenarioChartData } from '@/lib/financial-charts';
const cfg={revenue:{label:'Revenue',color:'var(--chart-1)'},operatingIncome:{label:'Operating income',color:'var(--chart-2)'},netIncome:{label:'Net income',color:'var(--chart-3)'},operatingCashFlow:{label:'Operating cash flow',color:'var(--chart-1)'},capex:{label:'Capex',color:'var(--chart-4)'},freeCashFlow:{label:'Free cash flow',color:'var(--chart-2)'},grossMargin:{label:'Gross margin %',color:'var(--chart-1)'},operatingMargin:{label:'Operating margin %',color:'var(--chart-2)'},netMargin:{label:'Net margin %',color:'var(--chart-3)'},value:{label:'Intrinsic value',color:'var(--chart-1)'},target:{label:'12-month target',color:'var(--chart-2)'}};
function useMounted(){const [m,setM]=useState(false);useEffect(()=>setM(true),[]);return m;}
function Card({title,note,children}:{title:string;note:string;children:React.ReactNode}){return <div className="min-w-0 rounded-md border border-border p-3"><h3 className="text-sm font-semibold">{title}</h3><p className="mb-2 text-xs text-muted-foreground">{note}</p>{children}</div>;}
const axis={tickLine:false,axisLine:false} as const;
export function ReportFinancialCharts({sections}:{sections:unknown}){
  const mounted=useMounted(); const rows=financialChartData(sections);
  if(rows.length<2) return <p className="text-xs text-muted-foreground">Charts need at least two saved SEC fiscal years; not available for this report.</p>;
  if(!mounted) return <div className="h-64"/>;
  const hasMargin=rows.some(r=>r.operatingMargin!==null||r.netMargin!==null);
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="Revenue & profit (USD billions)" note="Annual SEC filings. Gaps mean the figure was not reported.">
      <ChartContainer config={cfg} className="h-64 w-full aspect-auto"><BarChart data={rows} accessibilityLayer><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="label" {...axis}/><YAxis width={45} {...axis}/><ReferenceLine y={0} stroke="var(--border)"/><ChartTooltip content={<ChartTooltipContent/>}/><ChartLegend content={<ChartLegendContent/>}/><Bar dataKey="revenue" fill="var(--color-revenue)" radius={3}/><Bar dataKey="operatingIncome" fill="var(--color-operatingIncome)" radius={3}/><Bar dataKey="netIncome" fill="var(--color-netIncome)" radius={3}/></BarChart></ChartContainer></Card>
    <Card title="Cash flow (USD billions)" note="Free cash flow = operating cash flow minus capital spending.">
      <ChartContainer config={cfg} className="h-64 w-full aspect-auto"><BarChart data={rows} accessibilityLayer><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="label" {...axis}/><YAxis width={45} {...axis}/><ReferenceLine y={0} stroke="var(--border)"/><ChartTooltip content={<ChartTooltipContent/>}/><ChartLegend content={<ChartLegendContent/>}/><Bar dataKey="operatingCashFlow" fill="var(--color-operatingCashFlow)" radius={3}/><Bar dataKey="capex" fill="var(--color-capex)" radius={3}/><Bar dataKey="freeCashFlow" fill="var(--color-freeCashFlow)" radius={3}/></BarChart></ChartContainer></Card>
    {hasMargin&&<Card title="Margins (%)" note="Share of revenue kept as profit. Gross margin is blank when not reported.">
      <ChartContainer config={cfg} className="h-64 w-full aspect-auto"><LineChart data={rows} accessibilityLayer><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="label" {...axis}/><YAxis width={40} {...axis}/><ReferenceLine y={0} stroke="var(--border)"/><ChartTooltip content={<ChartTooltipContent/>}/><ChartLegend content={<ChartLegendContent/>}/>{(['grossMargin','operatingMargin','netMargin'] as const).map(k=><Line key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} strokeWidth={2} dot connectNulls={false}/>)}</LineChart></ChartContainer></Card>}
  </div>;
}
export function ReportScenarioChart({valuation,price}:{valuation:unknown;price:number|null}){
  const mounted=useMounted(); const data=scenarioChartData(valuation);
  if(!data.length||!mounted) return null;
  return <Card title="Valuation scenarios vs current price (USD per share)" note={price!==null?`Dashed line = price used in the report ($${price.toFixed(2)}). Model estimates, not forecasts.`:'Model estimates, not forecasts.'}>
    <ChartContainer config={cfg} className="h-56 w-full aspect-auto"><BarChart data={data} accessibilityLayer><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="name" {...axis}/><YAxis width={45} {...axis}/>{price!==null&&<ReferenceLine y={price} stroke="var(--foreground)" strokeDasharray="4 4"/>}<ChartTooltip content={<ChartTooltipContent/>}/><ChartLegend content={<ChartLegendContent/>}/><Bar dataKey="value" fill="var(--color-value)" radius={3}/><Bar dataKey="target" fill="var(--color-target)" radius={3}/></BarChart></ChartContainer></Card>;
}
