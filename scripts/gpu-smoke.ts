import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {sql,pool} from '../server/db';
import {DEFAULT_REQUIREMENTS,DEFAULT_RATIOS} from '../src/types';
const base='http://127.0.0.1:5173/api',secret=randomBytes(32).toString('hex'),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
let project='',before:any[]=[],touched=false,cookie='',gpuVisible=true;const localJobs=new Map<string,any>(),renderIds:string[]=[];
const worker=createServer(async(req,res)=>{res.setHeader('content-type','application/json');if(req.headers.authorization!==`Bearer ${secret}`){res.writeHead(401);res.end('{}');return;}
 if(req.url==='/health'){res.end(JSON.stringify({service:'house-concept-render-worker',blender:true,gpu:gpuVisible?'Simulated GPU for integration test':''}));return;}
 if(req.method==='POST'&&req.url==='/jobs'){let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);assert.equal(Buffer.from(body.scene_base64,'base64').toString('ascii',0,4),'glTF');assert.equal(body.options.camera.fov,52);localJobs.set(body.id,{id:body.id,status:'IN_PROGRESS'});res.writeHead(202);res.end(JSON.stringify({id:body.id}));return;}
 const match=req.url?.match(/^\/jobs\/([a-f0-9-]+)(\/cancel)?$/);if(match&&localJobs.has(match[1])){const job=localJobs.get(match[1]);if(match[2])job.status='CANCELLED';res.end(JSON.stringify(match[2]?{ok:true}:job));return;}
 res.writeHead(404);res.end('{}');
});
async function request(url:string,method='GET',body?:unknown){const response=await fetch(base+url,{method,headers:{cookie,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json(),headers:response.headers};}
function scene(){const b=Buffer.from(JSON.stringify({asset:{version:'2.0'},nodes:[]})),p=Buffer.concat([b,Buffer.alloc((4-b.length%4)%4,32)]),data=Buffer.alloc(20+p.length);data.write('glTF');data.writeUInt32LE(2,4);data.writeUInt32LE(data.length,8);data.writeUInt32LE(p.length,12);data.write('JSON',16);p.copy(data,20);return data;}
async function submit(id=randomUUID()){const form=new FormData();form.append('options',JSON.stringify({requestId:id,provider:'gpu-worker',camera:{position:[0,5,10],quaternion:[0,0,0,1],fov:52},width:1280,samples:128}));form.append('file',new Blob([new Uint8Array(scene())]),'scene.glb');const r=await fetch(`${base}/projects/${project}/renders`,{method:'POST',headers:{cookie},body:form});return {status:r.status,data:await r.json()};}
try{
 await new Promise<void>((resolve,reject)=>{worker.once('error',reject);worker.listen(8787,'127.0.0.1',resolve);});
 const login=await request('/login','POST',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});assert.equal(login.status,200);cookie=login.headers.get('set-cookie')!.split(';')[0];
 before=(await sql("SELECT * FROM provider_credentials WHERE provider='gpu-worker'")).rows;touched=true;
 const saved=await request('/integrations/gpu-worker','PATCH',{apiKey:secret,workerUrl:'http://127.0.0.1:8787',hourlyRateInr:59.32});assert.equal(saved.status,200);assert.equal(JSON.stringify(saved.data).includes(secret),false);
 assert.equal((await request('/integrations/gpu-worker/test','POST')).data.gpuDetected,true);
 const masked=await request('/integrations/status');assert.equal(JSON.stringify(masked.data).includes(secret),false);
 const draft={title:'Temporary GPU integration test',requirements:DEFAULT_REQUIREMENTS,paragraph:'',transcript:'',selectedVariant:0,ratios:DEFAULT_RATIOS,status:'concept'};
 const created=await request('/projects','POST',draft);assert.equal(created.status,201);project=created.data.project.id;
 gpuVisible=false;assert.equal((await submit()).status,400);assert.equal(localJobs.size,0);gpuVisible=true;
 const requestId=randomUUID(),first=await submit(requestId);assert.equal(first.status,202,JSON.stringify(first.data));renderIds.push(first.data.id);
 assert.equal((await submit(requestId)).data.id,first.data.id);assert.equal(localJobs.size,1);
 assert.equal((await submit()).status,409);
 const remote=localJobs.get(first.data.id);remote.status='COMPLETED';remote.elapsedSeconds=120;remote.output={image_base64:png.toString('base64')};
 const complete=await request(`/renders/${first.data.id}`);assert.equal(complete.data.status,'COMPLETED');assert.equal(complete.data.elapsedSeconds,120);assert.equal(complete.data.hourlyRateInr,59.32);
 const image=await fetch('http://127.0.0.1:5173'+complete.data.imageUrl,{headers:{cookie}});assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
 assert.equal((await fetch('http://127.0.0.1:5173'+complete.data.imageUrl)).status,401);
 const second=await submit();assert.equal(second.status,202);renderIds.push(second.data.id);
 assert.equal((await request(`/renders/${second.data.id}/cancel`,'POST')).status,200);assert.equal(localJobs.get(second.data.id).status,'CANCELLED');
 assert.equal((await request(`/renders/${second.data.id}`)).data.status,'CANCELLED');
 console.log('GPU integration passed: encrypted configuration, worker health, scene upload, idempotency, active-job lock, completion, runtime, private PNG download and cancellation. Simulated worker only; no paid calls.');
}finally{
 if(project)await sql('DELETE FROM projects WHERE id=$1',[project]);
 if(touched){await sql("DELETE FROM provider_credentials WHERE provider='gpu-worker'");for(const row of before)await sql('INSERT INTO provider_credentials(provider,encrypted,updated_at) VALUES($1,$2,$3)',[row.provider,row.encrypted,row.updated_at]);}
 for(const id of renderIds)for(const ext of ['glb','png'])await unlink(path.resolve('render-output',id+'.'+ext)).catch(()=>{});
 await new Promise<void>(resolve=>worker.close(()=>resolve()));await pool.end();
}
