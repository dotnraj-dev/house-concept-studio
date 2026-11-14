import type {FastifyInstance} from 'fastify';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {sql} from './db';
import {requireFeature,requireUser} from './auth';
import {getProvider} from './integrations';
import {workerRequest,workerHealth} from './gpu-worker';
import {renderOptionsSchema} from '../src/rendering';
import {storagePaths} from './runtime';
import {getStoredFile,putStoredFile,removeStoredFile} from './files';
const dir=storagePaths().renders;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const active=['SUBMITTING','IN_QUEUE','IN_PROGRESS','SUBMISSION_UNKNOWN'];
export function validateRenderGlb(buffer:Buffer){
 if(buffer.length<20||buffer.toString('ascii',0,4)!=='glTF'||buffer.readUInt32LE(4)!==2||buffer.readUInt32LE(8)!==buffer.length)throw Object.assign(new Error('The scene must be a complete GLB 2.0 file.'),{statusCode:400});
 const length=buffer.readUInt32LE(12);if(length>buffer.length-20||buffer.toString('ascii',16,20)!=='JSON')throw Object.assign(new Error('Invalid GLB manifest.'),{statusCode:400});
 const manifest=JSON.parse(buffer.toString('utf8',20,20+length));
 if(manifest.asset?.version!=='2.0'||(manifest.nodes?.length||0)>50000)throw Object.assign(new Error('Unsupported scene manifest or complexity.'),{statusCode:400});
 for(const item of [...(manifest.buffers||[]),...(manifest.images||[])])if(item.uri&&!item.uri.startsWith('data:'))throw Object.assign(new Error('Embed every model texture before rendering.'),{statusCode:400});
 return true;
}
function publicJob(r:any){return {id:r.id,status:r.status,message:r.message||'',createdAt:r.created_at,provider:r.provider||'runpod',elapsedSeconds:r.elapsed_seconds??null,hourlyRateInr:r.hourly_rate_inr??null,imageUrl:r.status==='COMPLETED'?`/api/renders/${r.id}/image`:null};}
async function refreshJob(job:any){
 if(!job.remote_id||!active.includes(job.status))return job;
 const provider=job.provider||'runpod',config=await getProvider(provider);if(!config)return job;
 const response=provider==='gpu-worker'?await workerRequest({...config,workerUrl:job.endpoint_id},`/jobs/${job.remote_id}`):await fetch(`https://api.runpod.ai/v2/${encodeURIComponent(job.endpoint_id)}/status/${encodeURIComponent(job.remote_id)}`,{headers:{Authorization:`Bearer ${config.apiKey}`},signal:AbortSignal.timeout(20000)});
 if(!response.ok)return job;
 const result=await response.json() as any;
 let status=['IN_QUEUE','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','TIMED_OUT'].includes(result.status)?result.status:job.status,message=typeof result.message==='string'?result.message.slice(0,500):'';
 if(status==='COMPLETED'){
  const image=result.output?.image_base64;
  if(typeof image!=='string'||image.length>40*1024*1024){status='FAILED';message='Worker did not return a supported image.';}
  else{const bytes=Buffer.from(image,'base64');if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){status='FAILED';message='Worker returned an invalid PNG.';}else await putStoredFile(`renders/${job.id}.png`,bytes);}
 }
 if(['FAILED','TIMED_OUT'].includes(status)&&!message)message='The worker could not finish this render. Check logs and scene size.';
 const elapsed=provider==='gpu-worker'?result.elapsedSeconds:typeof result.executionTime==='number'?result.executionTime/1000:null;
 const seconds=typeof elapsed==='number'&&Number.isFinite(elapsed)?Math.min(86400,Math.max(0,elapsed)):null;
 const updated=await sql('UPDATE render_jobs SET status=$2,message=$3,elapsed_seconds=$4 WHERE id=$1 RETURNING *',[job.id,status,message,seconds]);
 if(['COMPLETED','FAILED','CANCELLED','TIMED_OUT'].includes(status))await removeStoredFile(`renders/${job.id}.glb`).catch(()=>{});
 return updated.rows[0];
}
export async function registerRenders(app:FastifyInstance){
 await mkdir(dir,{recursive:true});let polling=false;
 const timer=setInterval(async()=>{if(polling)return;polling=true;try{const rows=await sql("SELECT * FROM render_jobs WHERE remote_id IS NOT NULL AND status IN ('IN_QUEUE','IN_PROGRESS','SUBMITTING','SUBMISSION_UNKNOWN') ORDER BY created_at LIMIT 20");for(const job of rows.rows)try{await refreshJob(job);}catch{app.log.warn({jobId:job.id},'Render status refresh will retry.');}}catch{app.log.warn('Render queue refresh unavailable.');}finally{polling=false;}},10000);timer.unref();app.addHook('onClose',async()=>clearInterval(timer));
 app.get('/api/projects/:id/renders',async(req,reply)=>{const u=await requireUser(req,reply);if(!u||!requireFeature(u,'renders.create',reply))return;const rows=await sql('SELECT * FROM render_jobs WHERE project_id=$1 ORDER BY created_at DESC LIMIT 30',[z.uuid().parse((req.params as any).id)]);return {jobs:rows.rows.map(publicJob)};});
 app.post('/api/projects/:id/renders',async(req,reply)=>{
  const u=await requireUser(req,reply);if(!u||!requireFeature(u,'renders.create',reply))return;
  const projectId=z.uuid().parse((req.params as any).id),exists=await sql('SELECT id FROM projects WHERE id=$1',[projectId]);if(!exists.rowCount)return reply.code(404).send({error:'Save this project before rendering.'});
  const file=await req.file({limits:{fileSize:50*1024*1024,files:1}});if(!file)return reply.code(400).send({error:'Upload the exported house scene.'});
  const data=await file.toBuffer(),raw=(file.fields.options as any)?.value;if(!raw)return reply.code(400).send({error:'Render options are missing.'});
  const settings=renderOptionsSchema.parse(JSON.parse(raw));validateRenderGlb(data);
  const same=await sql('SELECT * FROM render_jobs WHERE owner_id=$1 AND request_id=$2',[u.id,settings.requestId]);if(same.rowCount)return publicJob(same.rows[0]);
  const config=await getProvider(settings.provider);if(!config?.apiKey)return reply.code(400).send({error:'Configure the selected renderer in Settings first.'});
  const base=config.publicBaseUrl||process.env.PUBLIC_BASE_URL||process.env.RENDER_EXTERNAL_URL;
  if(settings.provider==='runpod'&&(!config.endpointId||!base||!/^https:\/\//.test(base)))return reply.code(400).send({error:'Set the RunPod endpoint and public HTTPS application URL in Settings.'});
  if(settings.provider==='gpu-worker'&&!config.workerUrl)return reply.code(400).send({error:'Set the rented GPU worker URL in Settings.'});
  if(settings.provider==='gpu-worker'){
   try{const health=await workerHealth(config);if(!health.gpuDetected)return reply.code(400).send({error:'The worker has no visible NVIDIA GPU. Check the instance before rendering.'});}
   catch(e){return reply.code(502).send({error:(e as Error).message});}
  }
  const id=randomUUID(),token=randomBytes(32).toString('hex');
  try{await sql("INSERT INTO render_jobs(id,project_id,owner_id,request_id,status,endpoint_id,input_token,input_expires,provider,hourly_rate_inr,remote_id) VALUES($1,$2,$3,$4,'SUBMITTING',$5,$6,now()+interval '2 hours',$7,$8,$9)",[id,projectId,u.id,settings.requestId,settings.provider==='gpu-worker'?config.workerUrl:config.endpointId,hash(token),settings.provider,config.hourlyRateInr??null,settings.provider==='gpu-worker'?id:null]);}catch(e){if((e as any).code==='23505')return reply.code(409).send({error:'This project already has an active render. Refresh its status before submitting another.'});throw e;}
  try{await putStoredFile(`renders/${id}.glb`,data);}catch(error){await sql("UPDATE render_jobs SET status='FAILED',message=$2 WHERE id=$1",[id,'Could not save the scene. Check available file storage.']);throw error;}
  try{
   let response:Response;
   if(settings.provider==='gpu-worker'){
    let environment:string|undefined;try{environment=(await readFile(path.resolve('public/assets/materials/daylight.hdr'))).toString('base64');}catch{}
    response=await workerRequest(config,'/jobs',{method:'POST',body:JSON.stringify({id,scene_base64:data.toString('base64'),options:settings,environment_base64:environment})},90000);
   }else{
    response=await fetch(`https://api.runpod.ai/v2/${encodeURIComponent(config.endpointId!)}/run`,{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({input:{scene_url:`${base!.replace(/\/$/,'')}/api/render-input/${id}`,scene_token:token,camera:settings.camera,samples:settings.samples,width:settings.width,environment_url:`${base!.replace(/\/$/,'')}/assets/materials/daylight.hdr`},policy:{executionTimeout:600000}}),signal:AbortSignal.timeout(30000)});
   }
   if([400,401,403,404,409,413,422,429].includes(response.status)){await sql('UPDATE render_jobs SET status=$2,message=$3 WHERE id=$1',[id,'FAILED',`Renderer rejected this request (${response.status}). Check connection, availability and worker logs.`]);return reply.code(502).send({error:`Renderer rejected the job (${response.status}). No automatic retry was made.`});}
   if(!response.ok)throw new Error('Uncertain provider response');const result=await response.json() as any;if(typeof result.id!=='string'||!result.id)throw new Error('Missing remote job ID');
   const updated=await sql("UPDATE render_jobs SET remote_id=$2,status='IN_QUEUE' WHERE id=$1 RETURNING *",[id,result.id]);return reply.code(202).send(publicJob(updated.rows[0]));
  }catch{await sql('UPDATE render_jobs SET status=$2,message=$3 WHERE id=$1',[id,'SUBMISSION_UNKNOWN','Connection ended before acceptance was confirmed. Refresh and check the worker/provider before submitting again.']);return reply.code(502).send({error:'Submission could not be confirmed. Refresh jobs; do not submit a duplicate.'});}
 });
 app.get('/api/render-input/:id',async(req,reply)=>{const id=z.uuid().parse((req.params as any).id),token=req.headers.authorization?.replace(/^Bearer /,'')||'',r=await sql('SELECT id FROM render_jobs WHERE id=$1 AND input_token=$2 AND input_expires>now()',[id,hash(token)]);if(!r.rowCount)return reply.code(403).send({error:'Scene access expired.'});return reply.type('model/gltf-binary').send(await getStoredFile(`renders/${id}.glb`));});
 app.get('/api/renders/:id',async(req,reply)=>{const u=await requireUser(req,reply);if(!u||!requireFeature(u,'renders.create',reply))return;const r=await sql('SELECT * FROM render_jobs WHERE id=$1',[z.uuid().parse((req.params as any).id)]);if(!r.rowCount)return reply.code(404).send({error:'Render not found.'});try{return publicJob(await refreshJob(r.rows[0]));}catch{return publicJob({...r.rows[0],message:'Worker is unreachable. Last known status is shown; refresh when connected.'});}});
 app.post('/api/renders/:id/cancel',async(req,reply)=>{
  const u=await requireUser(req,reply);if(!u||!requireFeature(u,'renders.create',reply))return;const id=z.uuid().parse((req.params as any).id),r=await sql('SELECT * FROM render_jobs WHERE id=$1',[id]);if(!r.rowCount)return reply.code(404).send({error:'Render not found.'});
  const j=r.rows[0],provider=j.provider||'runpod',c=await getProvider(provider);if(!active.includes(j.status))return {ok:true};if(!j.remote_id||!c)return reply.code(409).send({error:'Check the provider or worker before resolving this submission.'});
  const res=provider==='gpu-worker'?await workerRequest({...c,workerUrl:j.endpoint_id},`/jobs/${j.remote_id}/cancel`,{method:'POST'}):await fetch(`https://api.runpod.ai/v2/${encodeURIComponent(j.endpoint_id)}/cancel/${encodeURIComponent(j.remote_id)}`,{method:'POST',headers:{Authorization:`Bearer ${c.apiKey}`},signal:AbortSignal.timeout(15000)});
  if(!res.ok)return reply.code(502).send({error:'Cancellation was not confirmed. Check the worker before retrying.'});await sql("UPDATE render_jobs SET status='CANCELLED',message=$2 WHERE id=$1",[id,provider==='gpu-worker'?'Render cancelled. Stop the rented GPU separately to end rental charges.':'Cancellation requested. Provider billing can include work already performed.']);return {ok:true};
 });
 app.post('/api/renders/:id/resolve',async(req,reply)=>{const u=await requireUser(req,reply);if(!u)return;if(u.role!=='admin')return reply.code(403).send({error:'Only the admin can resolve an uncertain submission.'});const id=z.uuid().parse((req.params as any).id);z.object({confirmedStopped:z.literal(true)}).parse(req.body);await sql("UPDATE render_jobs SET status='CANCELLED',message='Admin confirmed this submission is stopped in the provider dashboard or worker.' WHERE id=$1 AND status='SUBMISSION_UNKNOWN'",[id]);return {ok:true};});
 app.get('/api/renders/:id/image',async(req,reply)=>{const u=await requireUser(req,reply);if(!u||!requireFeature(u,'renders.create',reply))return;const id=z.uuid().parse((req.params as any).id),r=await sql("SELECT id FROM render_jobs WHERE id=$1 AND status='COMPLETED'",[id]);if(!r.rowCount)return reply.code(404).send({error:'Image not ready.'});return reply.header('Cache-Control','private, max-age=3600').type('image/png').send(await getStoredFile(`renders/${id}.png`));});
}
