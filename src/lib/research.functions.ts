import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { AGENTS,MODEL_OPTIONS } from '@/lib/research-config';
import { assertCanRunResearch, normalizeProvider, validateTicker } from '@/lib/access-rules';
import { resolveTicker } from '@/lib/companies';

const roleSchema = z.object({ provider: z.string(), model: z.string().min(1).max(100), inputRate: z.number().min(0).max(1000), outputRate: z.number().min(0).max(1000) });
const requestSchema = z.object({ ticker: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), depth: z.enum(['quick','standard','deep','exhaustive']), lookback:z.union([z.literal(30),z.literal(90),z.literal(365)]).default(90), preset:z.string().max(100).default('Custom'), agents: z.array(z.string()).min(1).max(6), roles: z.record(z.string(),roleSchema) });
export const createAnalysis = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(input => requestSchema.parse(input)).handler(async ({ data, context }) => {
  const ticker = validateTicker(resolveTicker(data.ticker));
  if (new Date(`${data.date}T00:00:00Z`).toISOString().slice(0,10) !== data.date) throw new Error('Invalid analysis date.');
  if (new Set(data.agents).size !== data.agents.length || data.agents.some(id => !AGENTS.some(a => a.id === id))) throw new Error('Invalid agent selection.');
  const { data: settings, error: settingsError } = await context.supabase.from('user_settings').select('simulate_demo_run').eq('user_id',context.userId).maybeSingle();
  if (settingsError) throw settingsError;
  const demo = settings?.simulate_demo_run === true;
  const providers = new Set<string>();
  for(const agent of [...data.agents,...(data.roles['synthesis']?['synthesis']:[])]) {
    const role = data.roles[agent];
    if(!role) throw new Error('Choose a model for every selected agent.');
    const known=MODEL_OPTIONS.find(m=>m.model===role.model);if(known&&known.provider!==role.provider&&role.provider!=='lovable')throw new Error('Model and provider do not match.');
    if(role.provider==='lovable') {
      const {data:admin,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
      if(error||!admin) throw new Error('Built-in Lovable AI is reserved for the primary/admin account. Bring your own provider key.');
    } else providers.add(normalizeProvider(role.provider));
  }
  if (!demo) {
    const { data: keys, error } = await context.supabase.from('user_api_keys').select('provider').eq('user_id',context.userId);
    if(error) throw error;
    for(const provider of providers) assertCanRunResearch({ provider: normalizeProvider(provider), hasOwnApiKey: (keys ?? []).some(k => k.provider === provider) });
  }
  const { data: run, error } = await context.supabase.from('research_runs').insert({ user_id: context.userId, ticker, analysis_date: data.date, status: 'pending', research_depth: data.depth,lookback_days:data.lookback, selected_agents: data.agents, model_config: { roles: data.roles,preset:data.preset, pricing_source: 'user_configured_usd_per_million' }, lovable_credits:demo?0:null,credit_basis:demo?'demo':null,is_demo: demo }).select('id').single();
  if(error) throw error;
  return { id: run.id };
});
export const getDemoSetting = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('user_settings').select('simulate_demo_run').eq('user_id',context.userId).maybeSingle();
  if(error) throw error;
  return data?.simulate_demo_run ?? false;
});
export const setDemoSetting = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: { enabled: boolean }) => z.object({ enabled:z.boolean() }).parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from('user_settings').upsert({ user_id:context.userId, simulate_demo_run:data.enabled },{ onConflict:'user_id' });
  if(error) throw error;
  return data.enabled;
});
export const getExecution = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: { id:string }) => z.object({ id:z.string().uuid() }).parse(input)).handler(async ({ data,context }) => {
  const { data:run,error } = await context.supabase.from('research_runs').select('*').eq('id',data.id).eq('user_id',context.userId).single();
  if(error) throw new Error('Run not found or unavailable to this account.');
  const [events,outputs,reports] = await Promise.all([
    context.supabase.from('research_events').select('*').eq('run_id',run.id).order('created_at').limit(500),
    context.supabase.from('agent_outputs').select('agent_id,status,model_used,input_tokens,output_tokens,cost_usd').eq('run_id',run.id),
    context.supabase.from('research_reports').select('*').eq('run_id',run.id).order('created_at',{ascending:false}),
  ]);
  if(events.error) throw events.error;
  if(outputs.error) throw outputs.error;
  if(reports.error) throw reports.error;
  return { run, events:events.data ?? [], outputs:outputs.data ?? [], reports:reports.data ?? [] };
});
export const advanceDemo = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: { id:string }) => z.object({ id:z.string().uuid() }).parse(input)).handler(async ({ data,context }) => {
  const { error } = await context.supabase.rpc('advance_demo_run',{ _run_id:data.id });
  if(error) throw error;
  return { ok:true };
});
export const cancelAnalysis = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: { id:string }) => z.object({ id:z.string().uuid() }).parse(input)).handler(async ({ data,context }) => {
  const { data:run,error } = await context.supabase.from('research_runs').update({ status:'cancelled', completed_at:new Date().toISOString() }).eq('id',data.id).eq('user_id',context.userId).in('status',['pending','running']).select('id').maybeSingle();
  if(error) throw error;
  if(run) {
    const { error: logError } = await context.supabase.from('research_events').insert({ run_id:run.id,event_type:'cancelled',message:'Run cancelled by its owner.' });
    if(logError) throw logError;
  }
  return { cancelled:Boolean(run) };
});