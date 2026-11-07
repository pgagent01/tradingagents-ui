import { failureDiagnostic, type ResearchProgress } from '@/lib/research-diagnostics';
import { createFileRoute } from '@tanstack/react-router';
export const Route=createFileRoute('/api/research-execute')({server:{handlers:{POST:async({request})=>{
  const {createClient}=await import('@supabase/supabase-js');
  const {executeResearch,safeAiFailure}=await import('@/lib/ai/execution.server');
  const url=process.env['SUPABASE_URL'],publishable=process.env['SUPABASE_PUBLISHABLE_KEY'];
  if(!url||!publishable) return Response.json({error:'Research service is not configured.'},{status:503});
  const auth=request.headers.get('Authorization');if(!auth?.startsWith('Bearer ')) return Response.json({error:'Sign in to run research.'},{status:401});
  const sb=createClient<import('@/integrations/supabase/types').Database>(url,publishable,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:auth},fetch:(input,init)=>{const h=new Headers(init?.headers);h.set('apikey',publishable);return fetch(input,{...init,headers:h});}}});
  const {data:user,error:authError}=await sb.auth.getUser(auth.slice(7));if(authError||!user.user) return Response.json({error:'Sign in to run research.'},{status:401});
  let id:unknown;try{id=(await request.json()).id;}catch{return Response.json({error:'Invalid request.'},{status:400});}
  if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({error:'Invalid run.'},{status:400});
  const {data:run,error}=await sb.from('research_runs').select('*').eq('id',id).eq('user_id',user.user.id).single();if(error) return Response.json({error:'Run not available.'},{status:404});
  if(run.is_demo) return Response.json({error:'Demo runs do not call AI.'},{status:400});
  const {AGENTS,validExecutionRoles}=await import('@/lib/research-config');const team=Array.isArray(run.selected_agents)?run.selected_agents:[];if(team.length===0||team.some(a=>typeof a!=='string'||!AGENTS.some(v=>v.id===a)))return Response.json({error:'Invalid analyst selection.'},{status:400});
  const roleConfig=(run.model_config as {roles?:Record<string,unknown>})?.roles??{};
  if(!validExecutionRoles(team.filter((a):a is string=>typeof a==='string'),roleConfig)||('synthesis' in roleConfig&&!validExecutionRoles(['synthesis'],roleConfig)))return Response.json({error:'Every analyst needs a supported provider and valid model configuration.'},{status:400});
  const roles=Object.values((run.model_config as {roles?:Record<string,{provider?:string}>})?.roles??{});
  if(roles.some(r=>!r.provider||!['lovable','openai','anthropic','google','groq','openrouter','xai','deepseek','nvidia'].includes(r.provider)))return Response.json({error:'Invalid execution provider.'},{status:400});
  const built=roles.some(r=>r.provider==='lovable');
  if(built){const {data:admin}=await sb.rpc('has_role',{_user_id:user.user.id,_role:'admin'});if(!admin) return Response.json({error:'Built-in AI is reserved for the primary/admin account.'},{status:403});}
  const {data:paused,error:pauseReadError}=await sb.from('ai_access_state').select('paused,reason').eq('user_id',user.user.id).maybeSingle();if(pauseReadError)return Response.json({error:'AI access cannot be verified.'},{status:503});if(paused?.paused) return Response.json({error:paused.reason??'AI access is paused. Restore access before a fresh request.'},{status:403});
  const {data:claimed,error:claimError}=await sb.rpc('claim_research_execution',{_run_id:run.id});if(claimError||!claimed) return Response.json({error:'This run is already executing or finished.'},{status:409});
  const abort=new AbortController();request.signal.addEventListener('abort',()=>abort.abort(),{once:true});
  const encoder=new TextEncoder();
  const progress:ResearchProgress={stage:'initialization',agent:null};
  const stream=new ReadableStream({async start(controller){
    const emit=(v:unknown)=>{controller.enqueue(encoder.encode(`${JSON.stringify(v)}\n`));};
    try{emit({type:'started'});await executeResearch(sb,user.user.id,run,process.env['LOVABLE_API_KEY'],process.env['API_KEY_ENCRYPTION_SECRET'],abort.signal,emit,progress);}
    catch(e){const cancelled=abort.signal.aborted||(e instanceof Error&&e.name==='AbortError');const safe=safeAiFailure(e);const diagnostic=failureDiagnostic(run.id,progress,safe.status,cancelled);console.error('research-execute failure',JSON.stringify(diagnostic));
      if(!cancelled&&(safe.status===402||safe.status===403)) {const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const {error:pauseError}=await supabaseAdmin.from('ai_access_state').upsert({user_id:user.user.id,paused:true,reason:safe.message});if(pauseError){console.error('Unable to persist AI access pause.');}}
      const stopped=await sb.from('research_runs').update({status:cancelled?'cancelled':'failed',error_message:cancelled?null:safe.message,completed_at:new Date().toISOString(),execution_lease_until:null}).eq('id',run.id).eq('user_id',user.user.id).in('status',['pending','running']);
      const stoppedOutputs=await sb.from('agent_outputs').update({status:cancelled?'cancelled':'failed'}).eq('run_id',run.id).eq('status','running');
      const stoppedEvent=await sb.from('research_events').insert({run_id:run.id,event_type:cancelled?'cancelled':'failed',agent_id:progress.agent,data:diagnostic,message:cancelled?'Run cancelled by its owner.':safe.message});
      if(stopped.error||stoppedOutputs.error||stoppedEvent.error)console.error('Execution cleanup could not be fully persisted.');
      try{emit({type:'error',status:cancelled?499:safe.status,message:cancelled?'Run cancelled.':safe.message,diagnostic});}catch{}
    }finally{try{controller.close();}catch{}}
  },cancel(){abort.abort();}});
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-store'}});
}}}});