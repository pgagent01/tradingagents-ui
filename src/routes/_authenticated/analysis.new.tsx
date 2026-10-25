import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CompanyPicker } from '@/components/company-picker';
import { UsageMetrics } from '@/components/usage-metrics';
import { AGENTS, PRESETS, MODEL_OPTIONS, DEFAULT_MODEL, estimateUsage, type RoleModel } from '@/lib/research-config';
import { createAnalysis, getDemoSetting } from '@/lib/research.functions';
import { listMyApiKeys } from '@/lib/access.functions';
import { pageHead } from '@/lib/page-head';
import { resolveTicker } from '@/lib/companies';

export const Route = createFileRoute('/_authenticated/analysis/new')({
  head: () => pageHead('New Analysis', 'Configure a stock, agents, role models and estimated report costs.'),
  validateSearch: (search: Record<string,unknown>) => ({ ticker: typeof search['ticker'] === 'string' ? search['ticker'] : '' }),
  component: AnalysisWizard,
});
function AnalysisWizard() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const submit = useServerFn(createAnalysis);
  const [step,setStep] = useState(1);
  const [ticker,setTicker] = useState(search['ticker']);
  const [date,setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [depth,setDepth] = useState('standard');
  const [agents,setAgents] = useState<string[]>(AGENTS.map(a => a.id));
  const [roles,setRoles] = useState<Record<string,RoleModel>>(() => Object.fromEntries(AGENTS.map(a => [a.id,{...DEFAULT_MODEL}])));
  const [preset,setPreset] = useState('Institutional Consensus');
  const demo = useQuery({ queryKey:['demo-setting'],queryFn:() => getDemoSetting() });
  const keys = useQuery({ queryKey:['my-api-keys'],queryFn:() => listMyApiKeys() });
  const missing = [...new Set(agents.map(a => roles[a]?.provider ?? 'openai'))].filter(p => !keys.data?.some(k => k.provider === p));
  const estimate = estimateUsage(depth,agents.map(a => roles[a] ?? DEFAULT_MODEL));
  const mutation = useMutation({ mutationFn:() => submit({ data:{ ticker:resolveTicker(ticker),date,depth: depth === 'deep' ? 'deep' : depth === 'quick' ? 'quick' : 'standard',agents,roles } }), onSuccess:r => { void nav({ to:'/analysis/$id',params:{ id:r.id } }); },onError:(e:Error) => toast.error(e.message) });
  function updateRole(id:string,field:keyof RoleModel,value:string|number) { setRoles(prev => ({...prev,[id]:{...(prev[id] ?? DEFAULT_MODEL),[field]:value}})); }
  return <div className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-lg font-semibold">New Analysis</h1><p className="mt-1 text-xs text-muted-foreground">{preset} · {demo.data ? 'Demo simulation · no API charges' : 'Your own API keys'}</p></div><span className="font-mono text-xs text-muted-foreground">0{step} / 03</span></header>
    <nav className="grid grid-cols-3 border-b border-border">{['Stock & strategy','Agent customization','Models & cost'].map((s,i) => <Button key={s} variant="ghost" className={step===i+1 ? 'rounded-none border-b-2 border-primary text-primary' : 'rounded-none text-muted-foreground'} onClick={() => { if(i===0 || ticker.trim()) setStep(i+1); }}>{i+1}. {s}</Button>)}</nav>
    {step===1 && <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]"><div className="space-y-2"><Label>Stock symbol</Label><CompanyPicker value={ticker} onChange={setTicker} /></div><div className="space-y-2"><Label htmlFor="analysis-date">Analysis date</Label><Input id="analysis-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div></div>
      <h2 className="text-xs uppercase text-muted-foreground">Quick presets</h2><div className="grid gap-3 sm:grid-cols-3">{PRESETS.map(p => <Button key={p.name} variant={preset===p.name?'secondary':'outline'} className="h-24 flex-col items-start whitespace-normal" onClick={() => { setPreset(p.name);setDepth(p.depth);setAgents([...p.agents]); }}><span className="font-semibold">{p.name}</span><span className="text-xs text-muted-foreground">{p.agents.length} agents · {p.depth}</span></Button>)}</div>
    </div>}
    {step===2 && <div className="grid gap-0 sm:grid-cols-2">{AGENTS.map(a => <div key={a.id} className="flex items-center justify-between gap-4 border-b border-border px-2 py-5"><Label htmlFor={`agent-${a.id}`} className="cursor-pointer"><span className="block text-sm">{a.name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{a.detail}</span></Label><Switch id={`agent-${a.id}`} checked={agents.includes(a.id)} onCheckedChange={enabled => { setPreset('Custom');setAgents(prev => enabled ? [...prev,a.id] : prev.filter(id => id!==a.id)); }} /></div>)}</div>}
    {step===3 && <div className="space-y-4">
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left text-muted-foreground">{['Role','Model','Provider','Input $ / 1M','Output $ / 1M'].map(h => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead><tbody>{agents.map(id => { const r=roles[id] ?? DEFAULT_MODEL; return <tr key={id} className="border-b border-border"><td className="p-2">{AGENTS.find(a => a.id===id)?.name}</td><td className="min-w-44 p-2"><Input aria-label={`${id} model`} list="model-options" value={r.model} onChange={e => { const known=MODEL_OPTIONS.find(m => m.model===e.target.value); if(known) setRoles(prev => ({...prev,[id]:{...known}})); else updateRole(id,'model',e.target.value); }} /></td><td className="p-2"><select aria-label={`${id} provider`} className="h-9 rounded-md border border-input bg-background px-2" value={r.provider} onChange={e => updateRole(id,'provider',e.target.value)}>{['openai','anthropic','google','groq','xai','deepseek'].map(p => <option key={p}>{p}</option>)}</select></td><td className="min-w-24 p-2"><Input aria-label={`${id} input rate`} type="number" min="0" step="0.1" value={r.inputRate} onChange={e => updateRole(id,'inputRate',Number(e.target.value))} /></td><td className="min-w-24 p-2"><Input aria-label={`${id} output rate`} type="number" min="0" step="0.1" value={r.outputRate} onChange={e => updateRole(id,'outputRate',Number(e.target.value))} /></td></tr>; })}</tbody></table></div>
      <datalist id="model-options">{MODEL_OPTIONS.map(m => <option key={m.model} value={m.model} />)}</datalist>
      <div><h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pre-run estimate</h2><UsageMetrics input={estimate.input} output={estimate.output} cost={estimate.cost} demo={demo.data===true} /><p className="mt-2 text-xs text-muted-foreground">Estimated token budget; editable USD rates are assumptions, not live provider pricing. Actual usage may differ.</p></div>
      {!demo.data && missing.length>0 && <p className="text-xs text-warning">Add your own {missing.join(', ')} key in <Link to="/settings" className="underline">Settings</Link> before starting.</p>}
    </div>}
    <footer className="flex justify-between border-t border-border pt-4"><Button variant="ghost" disabled={step===1} onClick={() => setStep(s => s-1)}><ArrowLeft className="h-4 w-4" />Back</Button>{step<3 ? <Button disabled={!ticker.trim() || !date || (step===2 && agents.length===0)} onClick={() => { setTicker(resolveTicker(ticker));setStep(s => s+1); }}>Continue<ArrowRight className="h-4 w-4" /></Button> : <Button disabled={mutation.isPending || demo.isPending || (!demo.data && (keys.isPending || missing.length>0)) || !agents.length} onClick={() => mutation.mutate()}><Play className="h-4 w-4" />{mutation.isPending?'Creating…':demo.data?'Start demo run':'Start research'}</Button>}</footer>
  </div>;
}