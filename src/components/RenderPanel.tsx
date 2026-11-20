import { Button, Input, Select, Checkbox } from '../ui';
import {useEffect,useState} from 'react';
import {api} from '../api';
import {ACTIVE_RENDER_STATES,RENDER_PROFILES,computeRenderCost,type RenderJob,type RenderProvider} from '../rendering';
type Connections={runpod:{configured:boolean};'gpu-worker':{configured:boolean;hourlyRateInr:number}};
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n);
export function RenderPanel({projectId,createScene,camera}:{projectId:string;createScene:()=>Promise<Blob>;camera:()=>unknown}){
 const [jobs,setJobs]=useState<RenderJob[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[connections,setConnections]=useState<Connections|null>(null),[provider,setProvider]=useState<RenderProvider>('gpu-worker'),[profileId,setProfile]=useState('draft'),[confirmed,setConfirmed]=useState('');
 const profile=RENDER_PROFILES.find(p=>p.id===profileId)||RENDER_PROFILES[0];
 const active=jobs.some(j=>ACTIVE_RENDER_STATES.includes(j.status));
 async function load(){const r=await api<{jobs:RenderJob[]}>(`/projects/${projectId}/renders`);setJobs(r.jobs);}
 async function refresh(){setError('');try{await load();const s=await api<Connections>('/integrations/status');setConnections(s);}catch(e){setError((e as Error).message);}}
 useEffect(()=>{let alive=true;setJobs([]);setError('');Promise.all([api<{jobs:RenderJob[]}>(`/projects/${projectId}/renders`),api<Connections>('/integrations/status')]).then(([r,s])=>{if(!alive)return;setJobs(r.jobs);setConnections(s);setProvider(s['gpu-worker']?.configured?'gpu-worker':s.runpod.configured?'runpod':'gpu-worker');}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[projectId]);
 useEffect(()=>{if(!active)return;let alive=true;const timer=setTimeout(async()=>{try{const next=await Promise.all(jobs.map(j=>ACTIVE_RENDER_STATES.includes(j.status)?api<RenderJob>(`/renders/${j.id}`):Promise.resolve(j)));if(alive)setJobs(next);}catch(e){if(alive){setError((e as Error).message);setJobs([...jobs]);}}},6000);return()=>{alive=false;clearTimeout(timer);};},[jobs,active]);
 async function submit(){
  if(busy||active)return;setBusy(true);setError('');
  try{const pose=camera();if(!pose)throw new Error('Wait for the scene to load.');const blob=await createScene(),form=new FormData();form.append('options',JSON.stringify({requestId:crypto.randomUUID(),provider,camera:pose,samples:profile.samples,width:profile.width}));form.append('file',blob,'house.glb');await api(`/projects/${projectId}/renders`,{method:'POST',body:form});await load();}
  catch(e){setError((e as Error).message);try{await load();}catch{}}
  finally{setBusy(false);}
 }
 async function jobAction(id:string,action:'cancel'|'resolve'){setBusy(true);setError('');try{await api(`/renders/${id}/${action}`,{method:'POST',...(action==='resolve'?{body:JSON.stringify({confirmedStopped:true})}:{})});await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const configured=!!connections?.[provider]?.configured;
 return <details className="render-panel" open>
  <summary>Presentation renders <span>From the same house scene</span></summary>
  <p>Frame your view, choose the output quality and render with Blender. The plan, furniture and camera stay connected to your actual 3D house.</p>
  <div className="render-controls"><label>Render connection<Select value={provider} disabled={busy} onChange={e=>setProvider(e.target.value as RenderProvider)}><option value="gpu-worker">Rented GPU worker</option><option value="runpod">RunPod serverless</option></Select></label><label>Output quality<Select value={profileId} disabled={busy} onChange={e=>setProfile(e.target.value)}>{RENDER_PROFILES.map(p=><option key={p.id} value={p.id}>{p.name} · {p.width}px · {p.samples} samples</option>)}</Select></label></div>
  {provider==='gpu-worker'&&<div className="render-cost-note"><strong>{money(connections?.['gpu-worker']?.hourlyRateInr??59.32)}/hour rental rate</strong><span>Rental charges continue during setup and idle time. Cancelling a render does not stop the rented GPU.</span></div>}
  <div className="inline-actions"><Button className="button primary" disabled={!configured||busy||active} onClick={submit}>{busy?'Preparing…':'Render this view (paid)'}</Button><Button className="button secondary" disabled={busy} onClick={refresh}>Refresh connections & jobs</Button></div>
  {!configured&&<p className="render-empty">Connect {provider==='gpu-worker'?'your rented GPU worker':'a Blender serverless endpoint'} in Settings first. The house viewer and 3D downloads work without a connection.</p>}
  {error&&<p role="alert" className="connection-message error">{error}</p>}
  {!jobs.length&&<p className="hint">No renders yet. Start with a test render to check the camera, materials and GPU before choosing Full HD or 4K.</p>}
  {jobs.map(j=><article className="render-job" key={j.id}>
   <div className="render-job-heading"><strong className={`render-status ${j.status.toLowerCase()}`}>{j.status.replaceAll('_',' ')}</strong><time>{new Date(j.createdAt).toLocaleString('en-IN')}</time></div>
   <p className="render-job-meta">{j.provider==='gpu-worker'?'Rented GPU':'RunPod'}{j.elapsedSeconds!=null&&` · ${Math.round(j.elapsedSeconds)} seconds`}{j.elapsedSeconds!=null&&j.hourlyRateInr!=null&&` · ${money(computeRenderCost(j.elapsedSeconds,j.hourlyRateInr))} active-render estimate`}</p>
   {j.message&&<p role="status">{j.message}</p>}
   {j.status==='SUBMISSION_UNKNOWN'&&<div className="render-uncertain"><p>Check the worker or provider dashboard first. This request may have started; a second submission could duplicate the work.</p><label><Checkbox checked={confirmed===j.id} onChange={e=>setConfirmed(e.target.checked?j.id:'')}/> I checked and confirmed this job is stopped</label><Button className="button secondary" disabled={busy||confirmed!==j.id} onClick={()=>jobAction(j.id,'resolve')}>Resolve submission (admin)</Button></div>}
   {j.imageUrl&&<><img src={j.imageUrl} alt="Blender render of the current house design" loading="lazy"/><a className="button secondary" href={j.imageUrl} download="house-render.png">Download PNG</a></>}
   {['IN_QUEUE','IN_PROGRESS','SUBMISSION_UNKNOWN'].includes(j.status)&&<Button className="text-link" disabled={busy} onClick={()=>jobAction(j.id,'cancel')}>Cancel render</Button>}
  </article>)}
 </details>;
}
