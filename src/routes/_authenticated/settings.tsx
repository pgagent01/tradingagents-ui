import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createInviteCode,
  deleteMyApiKey,
  getMyRole,
  listInviteCodes,
  listMyApiKeys,
  revokeInviteCode,
  saveMyApiKey,
} from "@/lib/access.functions";
import { Switch } from "@/components/ui/switch";
import { getDemoSetting, setDemoSetting } from "@/lib/research.functions";
import { pingMyModel, testMyApiKey } from '@/lib/credential-test.functions';
import { MODEL_OPTIONS } from '@/lib/research-config';
import { resumeMyAiAccess } from '@/lib/ai-access.functions';
import { analyticsQuery } from '@/lib/analytics-query';
import { getActiveProvider, setActiveProvider } from '@/lib/provider-settings.functions';
import { PROVIDERS,DATA_PROVIDERS } from "@/lib/access-rules";
import { getNvidiaKeys, updateNvidiaKeys } from '@/lib/nvidia-credentials.functions';

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Settings — TradingAgents AI" },
      { name: "description", content: "Your own LLM API keys, invite codes and research defaults." },
      { property: "og:title", content: "Settings — TradingAgents AI" },
      { property: "og:description", content: "Bring-your-own API keys and admin invite codes." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold tracking-tight">Settings</h1>
      <DemoPanel />
      <ActiveProviderPanel />
      <ApiKeysPanel />
      <NvidiaKeysPanel />
      <ModelPingPanel />
      <ApiKeysPanel dataOnly />
      <InviteCodesPanel />
      <AiResumePanel />
      <CreditSummary />
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-secondary">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function ApiKeysPanel({dataOnly=false}:{dataOnly?:boolean}) {
  const qc = useQueryClient();
  const save = useServerFn(saveMyApiKey);
  const remove = useServerFn(deleteMyApiKey);
  const test=useServerFn(testMyApiKey);
  const [validation,setValidation]=useState<Record<string,string>>({});
  const testMut=useMutation({mutationFn:(p:string)=>test({data:{provider:p}}),onSuccess:r=>setValidation(v=>({...v,[r.provider]:r.message})),onError:(e:Error)=>toast.error(e.message)});
  const [provider, setProvider] = useState<string>(dataOnly?"fred":"openai");
  const [apiKey, setApiKey] = useState("");

  const keys = useQuery({
    queryKey: ["my-api-keys"],
    queryFn: () => listMyApiKeys(),
  });

  const saveMut = useMutation({
    mutationFn: () => save({ data: { provider, apiKey } }),
    onSuccess: (r) => {
      toast.success(`${r.provider} key saved`);
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["my-api-keys"] });
      qc.removeQueries({queryKey:['stock-data']});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (p: string) => remove({ data: { provider: p } }),
    onSuccess: () => {
      toast.success("Key removed");
      qc.invalidateQueries({ queryKey: ["my-api-keys"] });
      qc.removeQueries({queryKey:['stock-data']});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel
      title={dataOnly?"Data & Credentials — FRED / FMP":"AI & Credentials — bring your own"}
      description={dataOnly?"Optional · encrypted for your account only. FRED macroeconomic evidence and Financial Modeling Prep stock data.":"Each account stores its own keys, encrypted and visible only to you. BYOK providers require your own key; built-in Lovable AI is reserved for admins."}
    >
      {dataOnly?<p className="mb-3 text-xs text-muted-foreground"><a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noopener noreferrer" className="text-primary underline">Get a FRED API key</a> · <a href="https://financialmodelingprep.com/developer/docs" target="_blank" rel="noopener noreferrer" className="text-primary underline">Get an FMP API key</a> · FMP endpoint access depends on your plan. Without FMP, stocks use Yahoo and SEC. Missing macro data stays unavailable; Polymarket requires no key.</p>:<p className="mb-3 text-xs text-muted-foreground">OpenAI requires an API key from platform.openai.com. Consumer ChatGPT Plus/Pro subscriptions do not provide API access or programmatic requests. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenAI Platform API Keys</a></p>}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={dataOnly?'data-provider':'provider'}>Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id={dataOnly?'data-provider':'provider'} className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(dataOnly?DATA_PROVIDERS:PROVIDERS).map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-56 flex-1 space-y-1">
          <Label htmlFor={dataOnly?'fred-apikey':'apikey'}>API key</Label>
          <Input
            id={dataOnly?'fred-apikey':'apikey'}
            type="password"
            autoComplete="off"
            placeholder={dataOnly?`${provider.toUpperCase()} API key`:'sk-…'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="h-8 font-mono text-xs"
          />
        </div>
        <Button size="sm" className="h-8" disabled={!apiKey.trim() || saveMut.isPending} onClick={() => saveMut.mutate()}>
          <KeyRound className="h-3.5 w-3.5" />
          Save key
        </Button>
      </div>

      <div className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
        {keys.isPending && <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>}
        {keys.data?.filter(k=>(k.provider==='fred'||k.provider==='fmp')===dataOnly).length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {dataOnly?'No optional data keys configured. Yahoo and SEC remain available without FMP.':<>No keys yet. Add your own key to run research — <Link to="/new-analysis" className="text-primary hover:underline">New Analysis</Link> will ask for one.</>}
          </div>
        )}
        {keys.data?.filter(k=>(k.provider==='fred'||k.provider==='fmp')===dataOnly).map((k) => (
          <div key={k.provider} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono font-semibold uppercase">{k.provider}</span>
              <span className="font-mono text-muted-foreground">{k.hint}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2"><span className="max-w-72 text-[10px] text-muted-foreground">{validation[k.provider]}</span><Button variant="outline" size="sm" disabled={testMut.isPending} onClick={()=>testMut.mutate(k.provider)}>Test key</Button><Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px] text-negative"
              onClick={() => removeMut.mutate(k.provider)}
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </Button></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function InviteCodesPanel() {
  const qc = useQueryClient();
  const role = useQuery({ queryKey: ["my-role"], queryFn: () => getMyRole() });
  const make = useServerFn(createInviteCode);
  const list = useServerFn(listInviteCodes);
  const revoke = useServerFn(revokeInviteCode);
  const [note, setNote] = useState("");

  const codes = useQuery({
    queryKey: ["invite-codes"],
    queryFn: () => list(),
    enabled: role.data?.isAdmin === true,
  });

  const makeMut = useMutation({
    mutationFn: () => make({ data: { note: note.trim() || undefined } }),
    onSuccess: (r) => {
      toast.success("Invite code created");
      setNote("");
      qc.invalidateQueries({ queryKey: ["invite-codes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Invite code revoked");
      qc.invalidateQueries({ queryKey: ["invite-codes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role.isPending) return null;
  if (!role.data?.isAdmin) {
    return (
      <Panel title="Invite codes" description="Only admins can create invite codes. Ask an admin for one to sign up.">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          You are signed in as a standard user.
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Invite codes — admin"
      description="New accounts need a valid, unused code. Existing logins are unaffected."
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1 space-y-1">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            placeholder="e.g. beta tester"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <Button size="sm" className="h-8" disabled={makeMut.isPending} onClick={() => makeMut.mutate()}>
          <Plus className="h-3.5 w-3.5" />
          Generate code
        </Button>
      </div>

      <div className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
        {codes.isPending && <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>}
        {codes.data?.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">No invite codes yet.</div>
        )}
        {codes.data?.map((c: any) => {
          const state = c.revoked_at ? "revoked" : c.used_at ? "used" : "available";
          return (
            <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
              <div className="flex min-w-0 items-center gap-2 text-xs">
                <span className="font-mono font-semibold">{c.code}</span>
                <span
                  className={
                    state === "available"
                      ? "text-positive"
                      : state === "used"
                        ? "text-muted-foreground"
                        : "text-negative"
                  }
                >
                  {state}
                </span>
                {c.note && <span className="truncate text-muted-foreground">· {c.note}</span>}
              </div>
              {state === "available" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px] text-negative"
                  onClick={() => revokeMut.mutate(c.id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function DemoPanel() {
  const qc=useQueryClient();
  const save=useServerFn(setDemoSetting);
  const setting=useQuery({queryKey:['demo-setting'],queryFn:() => getDemoSetting()});
  const mutation=useMutation({mutationFn:(enabled:boolean) => save({data:{enabled}}),onSuccess:() => { void qc.invalidateQueries({queryKey:['demo-setting']}); },onError:(e:Error) => toast.error(e.message)});
  return <section className="flex items-center justify-between gap-4 border-y border-border py-4"><div><Label htmlFor="demo-mode">Simulate Demo Run</Label><p className="mt-1 text-xs text-muted-foreground">Mock events only · no API key needed · no LLM calls or charges.</p></div><Switch id="demo-mode" checked={setting.data ?? false} disabled={setting.isPending||mutation.isPending} onCheckedChange={enabled => mutation.mutate(enabled)} /></section>;
}

function AiResumePanel(){const resume=useServerFn(resumeMyAiAccess);const m=useMutation({mutationFn:()=>resume(),onSuccess:()=>toast.success('AI access resumed. Start a fresh run.'),onError:(e:Error)=>toast.error(e.message)});return <section className="border-t border-border pt-4"><p className="mb-2 text-xs text-muted-foreground">After restoring credits or provider access, explicitly resume AI.</p><Button size="sm" variant="outline" disabled={m.isPending} onClick={()=>m.mutate()}>Resume AI after access restored</Button></section>;}

function CreditSummary(){const {data}=useQuery(analyticsQuery);return <section className="border-t border-border pt-4"><h2 className="text-sm font-semibold">Cumulative Lovable Credits Used</h2><p className="mt-2 font-mono text-lg text-primary">{data?`${data.credits.toFixed(4)} calculated credits`:'Loading…'}</p><p className="mt-1 text-xs text-muted-foreground">{data?.unknown??0} runs with unrecorded usage · demo runs excluded. Not verified billed deductions. <Link to="/analytics" className="text-primary underline">Usage analytics</Link></p></section>;}

function ActiveProviderPanel(){const qc=useQueryClient();const active=useQuery({queryKey:['active-provider'],queryFn:()=>getActiveProvider()});const role=useQuery({queryKey:['my-role'],queryFn:()=>getMyRole()});const save=useServerFn(setActiveProvider);const mutation=useMutation({mutationFn:(provider:string)=>save({data:{provider}}),onSuccess:()=>{void qc.invalidateQueries({queryKey:['active-provider']});toast.success('Active provider saved.');},onError:(e:Error)=>toast.error(e.message)});return <section className="border-b border-border py-4"><Label htmlFor="active-provider">Active execution provider</Label><Select value={active.data??'openai'} onValueChange={p=>mutation.mutate(p)} disabled={active.isPending||mutation.isPending}><SelectTrigger id="active-provider" className="mt-2 w-64"><SelectValue/></SelectTrigger><SelectContent>{[...(role.data?.isAdmin?['lovable']:[]),...PROVIDERS].map(p=><SelectItem key={p} value={p}>{p==='lovable'?'Lovable AI · Built-in':p}</SelectItem>)}</SelectContent></Select><p className="mt-2 text-xs text-muted-foreground">New analyses use this provider; existing runs keep their saved configuration.</p></section>;}

function NvidiaKeysPanel() {
  const qc=useQueryClient();
  const pool=useQuery({queryKey:['nvidia-keys'],queryFn:()=>getNvidiaKeys()});
  const update=useServerFn(updateNvidiaKeys),ping=useServerFn(pingMyModel);
  const [apiKey,setApiKey]=useState('');
  const [results,setResults]=useState<Record<number,string>>({});
  const mutation=useMutation({mutationFn:(data:{apiKey?:string;active?:number})=>update({data}),onSuccess:()=>{setApiKey('');void qc.invalidateQueries({queryKey:['nvidia-keys']});void qc.invalidateQueries({queryKey:['my-api-keys']});toast.success('NVIDIA keys updated.');},onError:(e:Error)=>toast.error(e.message)});
  const test=useMutation({mutationFn:(keySlot:number)=>ping({data:{provider:'nvidia',model:'nvidia/nemotron-3.5-super-vl-120b-a12b',keySlot}}),onSuccess:(r,slot)=>setResults(v=>({...v,[slot]:`${r.ok?'Working':'Failed'} · ${r.message}`})),onError:(e:Error)=>toast.error(e.message)});
  return <section className="space-y-3 border-y border-border py-4"><h2 className="text-sm font-semibold">NVIDIA backup keys & model failover</h2><p className="text-xs text-muted-foreground">Models switch only during temporary server outages, before any output. Quota limits, rejected keys and denied access stop execution. Keys never rotate automatically to bypass quota.</p><p className="text-xs text-muted-foreground"><a className="text-primary underline" href="https://docs.api.nvidia.com/nim/docs/deployment" target="_blank" rel="noopener noreferrer">NVIDIA API guidance</a> · Backup order: selected model, then remaining NVIDIA models in the model list.</p><div className="flex flex-wrap items-end gap-2"><div className="min-w-48 flex-1 space-y-1"><Label htmlFor="nvidia-backup-key">Additional NVIDIA key</Label><Input id="nvidia-backup-key" type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} /></div><Button size="sm" disabled={!apiKey.trim()||mutation.isPending||(pool.data?.count??0)>=3} onClick={()=>mutation.mutate({apiKey})}><Plus className="h-3.5 w-3.5"/>Add key</Button></div><div className="divide-y divide-border">{Array.from({length:pool.data?.count??0},(_,slot)=><div key={slot} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"><span>Key {slot+1} · {pool.data?.active===slot?'Active':'Standby'} · configured</span><div className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">{results[slot]}</span><Button variant="outline" size="sm" disabled={test.isPending} onClick={()=>test.mutate(slot)}>Test key {slot+1}</Button><Button variant="ghost" size="sm" disabled={pool.data?.active===slot||mutation.isPending} onClick={()=>mutation.mutate({active:slot})}>Use key {slot+1}</Button></div></div>)}</div></section>;
}

type PingResult={ok:boolean;latencyMs:number;message:string;terminal?:boolean};
function ModelPingPanel() {
  const keys=useQuery({queryKey:["my-api-keys"],queryFn:()=>listMyApiKeys()});
  const ping=useServerFn(pingMyModel);
  const [results,setResults]=useState<Record<string,PingResult|'pending'>>({});
  const saved=new Set<string>(keys.data?.map(k=>k.provider)??[]);
  const models=MODEL_OPTIONS.filter(m=>saved.has(m.provider));
  const run=async(provider:string,model:string)=>{
    const id=`${provider}:${model}`;setResults(r=>({...r,[id]:'pending'}));
    try{const res=await ping({data:{provider,model}});setResults(r=>({...r,[id]:res}));return res;}
    catch(e){setResults(r=>({...r,[id]:{ok:false,latencyMs:0,message:(e as Error).message}}));return {ok:false,terminal:true};}
  };
  return (
    <Panel title="Model Ping" description="Send one tiny test message to each model using your own saved keys. Each ping uses a few tokens from your provider account.">
      {models.length===0?<p className="text-xs text-muted-foreground">Save a provider key above to ping its models.</p>:<>
        <Button size="sm" variant="outline" className="mb-2 h-7 text-xs" disabled={Object.values(results).includes('pending')} onClick={async()=>{for(const m of models){const result=await run(m.provider,m.model);if(result?.terminal)break;}}}>Ping all</Button>
        <div className="divide-y divide-border rounded-md border border-border bg-card">
          {models.map(m=>{const id=`${m.provider}:${m.model}`;const r=results[id];return (
            <div key={id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs">
              <span className="font-mono"><span className="uppercase text-muted-foreground">{m.provider}</span> · {m.model}</span>
              <div className="flex items-center gap-2">
                {r==='pending'?<span className="text-muted-foreground">Pinging…</span>:r?<span className={r.ok?'text-positive':'text-negative'}>{r.ok?'● Working':'● Failed'} · {r.message}{r.latencyMs?` · ${(r.latencyMs/1000).toFixed(1)}s`:''}</span>:null}
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" disabled={r==='pending'} onClick={()=>run(m.provider,m.model)}>Ping</Button>
              </div>
            </div>);})}
        </div></>}
    </Panel>
  );
}
