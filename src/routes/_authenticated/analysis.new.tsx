import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
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
import { RankedModelSelect } from '@/components/ranked-model-select';
import { AGENTS, AGENT_GROUPS, PRESETS, DEPTHS, LOOKBACKS, MODEL_OPTIONS, DEFAULT_MODEL, providerDefault, estimateUsage, blendedTokenCost, catalogBlendedCost, type RoleModel } from '@/lib/research-config';
import { createAnalysis, getDemoSetting } from '@/lib/research.functions';
import { listMyApiKeys } from '@/lib/access.functions';
import { pageHead } from '@/lib/page-head';
import { getAiCatalog } from '@/lib/ai-catalog.functions';
import { calculateCredits } from '@/lib/credit-rules';
import { tokenBudget } from '@/lib/research-config';
import { getActiveProvider } from '@/lib/provider-settings.functions';
import { PROVIDERS } from '@/lib/access-rules';
import { resolveTicker } from '@/lib/companies';
import { CREDENTIAL_HELP, missingResearchProviders } from '@/lib/credential-guidance';

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
  const [roles,setRoles] = useState<Record<string,RoleModel>>(() => Object.fromEntries([...AGENTS.map(a=>a.id),'synthesis'].map(id => [id,{...DEFAULT_MODEL}])));
  const [preset,setPreset] = useState('Standard Due Diligence');
  const [lookback,setLookback]=useState<30|90|365>(90);
  const catalog=useQuery({queryKey:['ai-catalog'],queryFn:()=>getAiCatalog()});
  const activeProvider=useQuery({queryKey:['active-provider'],queryFn:()=>getActiveProvider()});
  const initialized=useRef(false);
  useEffect(()=>{if(initialized.current||!activeProvider.data||!catalog.data)return;initialized.current=true;const p=activeProvider.data==='lovable'&&!catalog.data.allowed?'openai':activeProvider.data;setRoles(Object.fromEntries([...AGENTS.map(a=>a.id),'synthesis'].map(id=>[id,providerDefault(p)])));},[activeProvider.data,catalog.data]);
  const demo = useQuery({ queryKey:['demo-setting'],queryFn:() => getDemoSetting() });
  const keys = useQuery({ queryKey:['my-api-keys'],queryFn:() => listMyApiKeys() });
  const roleIds=[...agents,'synthesis'];
  const missing = missingResearchProviders(roleIds.map(a => roles[a]?.provider ?? 'openai'), keys.data?.map(k => k.provider) ?? [], demo.data === true);
  const estimate = estimateUsage(depth,roleIds.map(a => roles[a] ?? DEFAULT_MODEL));
  const budget=tokenBudget(depth);const builtCredits=roleIds.filter(a=>roles[a]?.provider==='lovable').map(a=>{const m=catalog.data?.models.find(m=>m.id===roles[a]?.model);return m?calculateCredits(m.rates,budget.input,budget.output):null;});const estimatedCredits=builtCredits.some(v=>v===null)?null:builtCredits.reduce<number>((n,v)=>n+(v??0),0);
  const mutation = useMutation({ mutationFn:() => submit({ data:{ ticker:resolveTicker(ticker),date,depth:depth as 'quick'|'standard'|'deep'|'exhaustive',lookback,preset,agents,roles } }), onSuccess:r => { if(!demo.data)sessionStorage.setItem('research-execution-intent',r.id);void nav({ to:'/analysis/$id',params:{ id:r.id },search:{execution:false} }); },onError:(e:Error) => toast.error(e.message) });
  function updateRole(id:string,field:keyof RoleModel,value:string|number) { setRoles(prev => ({...prev,[id]:{...(prev[id] ?? DEFAULT_MODEL),[field]:value}})); }
  return <div className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-lg font-semibold">New Analysis</h1><p className="mt-1 text-xs text-muted-foreground">{preset} · {demo.data ? 'Demo simulation · no API charges' : 'Your own API keys'}</p></div><span className="font-mono text-xs text-muted-foreground">0{step} / 03</span></header>
    <nav className="grid grid-cols-3 border-b border-border">{['Stock & strategy','Agent customization','Models & cost'].map((s,i) => <Button key={s} variant="ghost" className={step===i+1 ? 'rounded-none border-b-2 border-primary text-primary' : 'rounded-none text-muted-foreground'} onClick={() => { if(i===0 || ticker.trim()) setStep(i+1); }}>{i+1}. {s}</Button>)}</nav>
    {!demo.data && (keys.isError || activeProvider.isError || catalog.isError || demo.isError) ? <div role="alert" className="space-y-2 border-l-2 border-negative pl-3 text-xs"><p className="text-negative">Research settings or saved keys could not be checked. This does not mean your key was rejected.</p><Button size="sm" variant="outline" onClick={() => { void keys.refetch(); void activeProvider.refetch(); void catalog.refetch(); void demo.refetch(); }}>Check again</Button></div> : !keys.isPending && initialized.current && missing.length > 0 && <div role="alert" className="space-y-2 border-l-2 border-warning pl-3 text-xs"><p className="font-medium text-warning">API key needed: {missing.map(p => CREDENTIAL_HELP[p]?.name ?? p).join(', ')}</p><p className="text-muted-foreground">In Settings → AI & Credentials, select the provider, paste your own key, Save key, then Test key. For NVIDIA, use its dedicated key section. Return here when saved; or select a provider you already configured in Models & cost.</p><Button asChild size="sm" variant="outline"><Link to="/settings">Add or update keys</Link></Button><p className="text-muted-foreground">FRED and FMP are optional data keys, not AI keys. Other users must add their own keys; yours are never shared.</p></div>}
    {step===1 && <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]"><div className="space-y-2"><Label>Stock symbol</Label><CompanyPicker value={ticker} onChange={setTicker} /></div><div className="space-y-2"><Label htmlFor="analysis-date">Analysis date</Label><Input id="analysis-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="depth">Research depth</Label><select id="depth" className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={depth} onChange={e=>{setDepth(e.target.value);setPreset('Custom');}}>{DEPTHS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">{DEPTHS.find(d=>d.id===depth)?.detail}</p><p className="mt-1 text-[10px] text-muted-foreground">Planned scope; source access depends on the selected provider.</p></div><div><Label htmlFor="lookback">Lookback window</Label><select id="lookback" className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={lookback} onChange={e=>setLookback(Number(e.target.value) as 30|90|365)}>{LOOKBACKS.map(l=><option key={l.days} value={l.days}>{l.label}</option>)}</select></div></div>
      <h2 className="text-xs uppercase text-muted-foreground">Quick presets</h2><div className="grid gap-3 sm:grid-cols-3">{PRESETS.map(p => <Button key={p.name} variant={preset===p.name?'secondary':'outline'} className="h-24 flex-col items-start whitespace-normal" onClick={() => { setPreset(p.name);setDepth(p.depth);setAgents([...p.agents]); }}><span className="font-semibold">{p.name}</span><span className="text-xs text-muted-foreground">{p.agents.length} agents · {p.depth}</span></Button>)}</div>
    </div>}
    {step===2 && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{AGENT_GROUPS.map(g=><div key={g.name} className="flex items-center justify-between gap-3 border-b border-border py-3"><Label htmlFor={`group-${g.agents[0]}`}>{g.name}</Label><Switch id={`group-${g.agents[0]}`} checked={g.agents.every(a=>agents.includes(a))} onCheckedChange={enabled=>{setPreset('Custom');setAgents(prev=>enabled?[...new Set([...prev,...g.agents])]:prev.filter(a=>!g.agents.some(id=>id===a)));}}/></div>)}</div><div className="grid gap-0 sm:grid-cols-2">{AGENTS.map(a => <div key={a.id} className="flex items-center justify-between gap-4 border-b border-border px-2 py-5"><Label htmlFor={`agent-${a.id}`} className="cursor-pointer"><span className="block text-sm">{a.name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{a.detail}</span></Label><Switch id={`agent-${a.id}`} checked={agents.includes(a.id)} onCheckedChange={enabled => { setPreset('Custom');setAgents(prev => enabled ? [...prev,a.id] : prev.filter(id => id!==a.id)); }} /></div>)}</div></div>}
    {step===3 && <div className="space-y-4">
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left text-muted-foreground">{['Role','Model','Provider','Input $ / 1M','Output $ / 1M'].map(h => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead><tbody>{roleIds.map(id => { const r=roles[id] ?? DEFAULT_MODEL; return <tr key={id} className="border-b border-border"><td className="p-2">{AGENTS.find(a => a.id===id)?.name??'Final Synthesis'}</td><td className="min-w-44 p-2"><RankedModelSelect label={`${id} model choices`} value={r.model} models={r.provider==='lovable'?(catalog.data?.models??[]).map(m=>({model:m.id,blendedCost:catalogBlendedCost(m.rates)})):MODEL_OPTIONS.filter(m=>m.provider===r.provider).map(m=>({model:m.model,blendedCost:blendedTokenCost(m.inputRate,m.outputRate)}))} onChange={model=>{const known=MODEL_OPTIONS.find(m=>m.model===model&&m.provider===r.provider);if(known)setRoles(prev=>({...prev,[id]:{...known}}));else updateRole(id,'model',model);}} /><Input aria-label={`${id} model`} value={r.model} onChange={e=>updateRole(id,'model',e.target.value)} /></td><td className="p-2"><select aria-label={`${id} provider`} className="h-9 rounded-md border border-input bg-background px-2" value={r.provider} onChange={e => {const p=e.target.value;setRoles(prev=>({...prev,[id]:providerDefault(p)}));}}>{[...(catalog.data?.allowed?['lovable']:[]),...PROVIDERS].map(p => <option key={p} value={p}>{p==='lovable'?'Lovable AI · Built-in':p}</option>)}</select></td><td className="min-w-24 p-2"><Input aria-label={`${id} input rate`} type="number" min="0" step="0.1" value={r.inputRate} onChange={e => updateRole(id,'inputRate',Number(e.target.value))} /></td><td className="min-w-24 p-2"><Input aria-label={`${id} output rate`} type="number" min="0" step="0.1" value={r.outputRate} onChange={e => updateRole(id,'outputRate',Number(e.target.value))} /></td></tr>; })}</tbody></table></div>

      <div className="flex flex-wrap gap-3 text-xs">{[...new Set(roleIds.map(a=>roles[a]?.provider))].filter(Boolean).map(p=><span key={p} className={p==='lovable'||keys.data?.some(k=>k.provider===p)?'text-positive':'text-warning'}>{p==='lovable'?'Lovable AI · admin access · no key required':`${p} · ${keys.data?.some(k=>k.provider===p)?'Key configured':'Key missing'}`}</span>)}</div><p className="text-[10px] text-muted-foreground">Model availability depends on your provider account. Claude 3-era examples are legacy; use current models or a provider-supported custom ID.</p>
      <div><h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pre-run estimate</h2><UsageMetrics input={estimate.input} output={estimate.output} cost={estimate.cost} demo={demo.data===true} /><p className="mt-2 text-xs text-muted-foreground">Estimated token budget; editable USD rates are assumptions, not live provider pricing. Actual usage includes final synthesis and may differ.</p><p className="mt-2 font-mono text-xs text-primary">Lovable Credits estimate: {estimatedCredits===null?'Unavailable':estimatedCredits.toFixed(4)} · {catalog.data?.publicRates?'public catalog rates':'catalog rates'} · includes synthesis; search fees additional</p></div>
    </div>}
    <footer className="flex justify-between border-t border-border pt-4"><Button variant="ghost" disabled={step===1} onClick={() => setStep(s => s-1)}><ArrowLeft className="h-4 w-4" />Back</Button>{step<3 ? <Button disabled={!ticker.trim() || !date || (step===2 && agents.length===0)} onClick={() => { setTicker(resolveTicker(ticker));setStep(s => s+1); }}>Continue<ArrowRight className="h-4 w-4" /></Button> : <Button disabled={mutation.isPending || demo.isPending || demo.isError || activeProvider.isPending || (!demo.data && (keys.isPending || keys.isError || activeProvider.isError || catalog.isError || missing.length>0)) || !agents.length || roleIds.some(a=>!roles[a]?.model.trim())} onClick={() => mutation.mutate()}><Play className="h-4 w-4" />{mutation.isPending?'Creating…':demo.data?'Start demo run':'Start research'}</Button>}</footer>
  </div>;
}