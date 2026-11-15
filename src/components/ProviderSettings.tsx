import {useEffect,useState} from 'react';
import {api} from '../api';
type Name='openai'|'runpod'|'gpu-worker'|'pixabay';
type Status={pixabay?:{configured:boolean};openai:{configured:boolean;textModel:string;speechModel:string};runpod:{configured:boolean;endpointId:string;publicBaseUrl?:string};'gpu-worker':{configured:boolean;workerUrl:string;hourlyRateInr:number}};
const names:Record<Name,string>={pixabay:'Photo references',openai:'AI & voice','gpu-worker':'Rented GPU',runpod:'RunPod serverless'};
export function ProviderSettings({admin}:{admin:boolean}){
 const [status,setStatus]=useState<Status|null>(null),[provider,setProvider]=useState<Name>('gpu-worker'),[key,setKey]=useState(''),[textModel,setText]=useState(''),[speechModel,setSpeech]=useState(''),[baseUrl,setBaseUrl]=useState(''),[endpoint,setEndpoint]=useState(''),[workerUrl,setWorkerUrl]=useState('http://127.0.0.1:8787'),[hourlyRate,setHourlyRate]=useState(59.32),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 async function load(){const s=await api<Status>('/integrations/status');setStatus(s);setText(s.openai.textModel);setSpeech(s.openai.speechModel);setEndpoint(s.runpod.endpointId);setBaseUrl(s.runpod.publicBaseUrl||'');setWorkerUrl(s['gpu-worker']?.workerUrl||'http://127.0.0.1:8787');setHourlyRate(s['gpu-worker']?.hourlyRateInr??59.32);}
 useEffect(()=>{load().catch(e=>{setError(true);setMessage(e.message);});},[]);
 function choose(name:Name){setProvider(name);setKey('');setMessage('');setError(false);}
 async function run(action:'save'|'test'|'delete'){
  setBusy(true);setMessage('');setError(false);
  try{
   if(action==='save')await api(`/integrations/${provider}`,{method:'PATCH',body:JSON.stringify({apiKey:key,...(provider==='openai'?{textModel,speechModel}:provider==='runpod'?{endpointId:endpoint,publicBaseUrl:baseUrl} :provider==='pixabay'?{}:{workerUrl,hourlyRateInr:hourlyRate})})});
   else if(action==='delete')await api(`/integrations/${provider}`,{method:'DELETE'});
   else{const r=await api<{message:string;gpuDetected?:boolean}>(`/integrations/${provider}/test`,{method:'POST'});setMessage(r.message);if(r.gpuDetected===false)setError(true);}
   setKey('');await load();if(action!=='test')setMessage(action==='save'?'Connection saved. Use Test connection to check access.':'Stored connection removed.');
  }catch(e){setError(true);setMessage((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="card provider-settings">
  <span className="eyebrow">Connections</span><h2>AI, voice, rendering & references</h2>
  <p>Build plans, explore the house and prepare quotes without keys. Add your own connections when you are ready.</p>
  <div className="connection-tabs" role="group" aria-label="Connection type">{(['gpu-worker','openai','runpod','pixabay'] as Name[]).map(name=><button key={name} disabled={busy} aria-pressed={provider===name} className={provider===name?'selected':''} onClick={()=>choose(name)}><strong>{names[name]}</strong><span>{status?.[name]?.configured?'Saved':'Not configured'}</span></button>)}</div>
  {admin?<>
   {provider==='gpu-worker'&&<div className="connection-guide"><h3>Connect the GPU you rent</h3><ol><li>Run the supplied Blender worker on the GPU machine.</li><li>Open its SSH tunnel on this computer.</li><li>Save the worker URL and its secret token below, then test the connection.</li></ol><p>The local application sends the scene directly. A public VPS is not required for this connection. Setup instructions are in <strong>GPU-SETUP.md</strong> inside the project.</p></div>}
   <label className="full-label">{provider==='gpu-worker'?'Worker secret token':'API key'}<input autoComplete="off" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder={status?.[provider]?.configured?'Leave blank to keep the stored secret':provider==='gpu-worker'?'Same token as GPU_WORKER_TOKEN on the worker':'Enter the provider key'}/></label>
   {provider==='openai'?<><div className="form-grid"><label>Text model ID<input value={textModel} onChange={e=>setText(e.target.value)}/></label><label>Transcription model ID<input value={speechModel} onChange={e=>setSpeech(e.target.value)}/></label></div><p className="hint">AI reads customer requirements; Blender renders the house. Testing checks access to the selected model IDs without requesting generation.</p></>:provider==='runpod'?<><label className="full-label">Public application URL<input type="url" value={baseUrl} placeholder="https://studio.yourcompany.in" onChange={e=>setBaseUrl(e.target.value)}/></label><label className="full-label">Serverless endpoint ID<input value={endpoint} onChange={e=>setEndpoint(e.target.value)}/><small>Use an endpoint running the supplied Blender queue worker.</small></label></>:provider==='pixabay'?<p className="hint">Search architecture and interior photos in the Asset library. Previews come from Pixabay; results are cached for 24 hours. Regional labels in stock-photo tags need your review.</p>:<div className="form-grid"><label>Worker URL<input type="url" value={workerUrl} onChange={e=>setWorkerUrl(e.target.value)}/><small>For the supplied SSH tunnel: http://127.0.0.1:8787</small></label><label>Your rental rate (₹/hour)<input type="number" min="0" max="10000" step="0.01" value={hourlyRate} onChange={e=>setHourlyRate(+e.target.value)}/><small>Enter the checkout rate including storage and tax. Used for estimates only.</small></label></div>}
   <div className="inline-actions"><button className="button primary" disabled={busy} onClick={()=>run('save')}>{busy?'Working…':'Save connection'}</button><button className="button secondary" disabled={busy||!status?.[provider]?.configured} onClick={()=>run('test')}>Test connection</button><button className="text-link" disabled={busy||!status?.[provider]?.configured} onClick={()=>run('delete')}>Remove connection</button></div>
   <p className="hint">Secrets are encrypted on the server and never returned to the browser. The rental provider bills while its GPU instance is running, including idle time.</p>
  </>:<p>Only the company admin can change connections.</p>}
  {message&&<p role={error?'alert':'status'} className={`connection-message ${error?'error':'success'}`}>{message}</p>}
 </section>;
}
