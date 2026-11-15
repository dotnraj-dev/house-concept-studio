import {searchReferences} from './pixabay';
import {registerRenders} from './renders';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { initializeDatabase, sql, checkPassword, hashPassword, pool } from './db';
import { can, clearSessionCookie, createSession, currentUser, digest, readToken, requireFeature, requireUser, setSessionCookie } from './auth';
import { DEFAULT_RATIOS, FEATURES, normalizeRequirements, designOf, type Feature } from '../src/types';
import { requirementsSchema } from '../src/schemas';
import { localExtract } from '../src/intake';
import { generatePlan } from '../src/plan';
import { getProvider, saveProvider, providerStatus, type Provider } from './integrations';
import {workerBaseUrl,workerHealth} from './gpu-worker';
import {storagePaths,validateHostingEnvironment,validRequestOrigin,buildIdentifier} from './runtime';
import {getStoredFile,putStoredFile} from './files';

const app = Fastify({ logger: true, bodyLimit: 2 * 1024 * 1024 });
const uploadDir = storagePaths().uploads;
const isProduction = process.env.NODE_ENV === 'production';
const loginAttempts = new Map<string, { count: number; until: number }>();

const reqSchema = requirementsSchema;
const ratiosSchema = z.object({ front: z.number().min(.25).max(.42), middle: z.number().min(.22).max(.36), livingShare: z.number().min(.38).max(.68), kitchenShare: z.number().min(.40).max(.60) });
const projectSchema = z.object({ title: z.string().min(1).max(180), requirements: reqSchema, paragraph: z.string().max(10000), transcript: z.string().max(20000), selectedVariant: z.number().int().min(0).max(2), ratios: ratiosSchema, status: z.enum(['concept','review','approved']) });
const userSchema = z.object({ name: z.string().min(1).max(120), email: z.email().max(200), password: z.string().min(12).max(200), permissions: z.array(z.enum(FEATURES)).max(FEATURES.length) });
const settingsSchema = z.object({ companyName: z.string().min(1).max(160), costPerSqft: z.number().min(0).max(100000), sideSetback: z.number().min(0).max(100), frontSetback: z.number().min(0).max(100), rearSetback: z.number().min(0).max(100), currency: z.literal('INR') });
const assetFields = z.object({ name: z.string().min(1).max(120), category: z.string().min(1).max(80), width: z.coerce.number().positive().max(100), depth: z.coerce.number().positive().max(100), height: z.coerce.number().positive().max(100), license: z.string().min(1).max(200), source: z.string().max(500) });

function projectRow(row: any) { return { id: row.id, ownerId: row.owner_id, title: row.title, requirements: normalizeRequirements(row.requirements),
  paragraph: row.paragraph, transcript: row.transcript, selectedVariant: row.selected_variant, ratios: row.ratios,
  status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function assetRow(row: any) { return { id: row.id, name: row.name, category: row.category, width: row.width, depth: row.depth,
  height: row.height, license: row.license, source: row.source, fileUrl: `/api/assets/${row.id}/file`, createdAt: row.created_at }; }

app.addHook('onRequest', async (request, reply) => {
  if (isProduction && ['POST','PATCH','PUT','DELETE'].includes(request.method)) {
    const origin = request.headers.origin;
    const host = request.headers.host;
    if (!validRequestOrigin(origin,host)) return reply.code(403).send({ error: 'Invalid request origin.' });
  }
});
app.addHook('onSend',async(_request,reply,payload)=>{
  reply.header('X-Content-Type-Options','nosniff').header('X-Frame-Options','DENY').header('Referrer-Policy','same-origin');
  return payload;
});
app.setErrorHandler((error, _request, reply) => {
  if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Please check the entered values.', details: error.flatten() });
  app.log.error(error);
  return reply.code((error as any).statusCode || 500).send({ error: (error as any).statusCode ? (error as Error).message : 'Something went wrong.' });
});

app.post('/api/login', async (request, reply) => {
  const body = z.object({ email: z.email(), password: z.string() }).parse(request.body);
  const ip = request.ip;
  const recent = loginAttempts.get(ip);
  if (recent && recent.until > Date.now() && recent.count >= 8) return reply.code(429).send({ error: 'Too many attempts. Try again later.' });
  const result = await sql('SELECT * FROM users WHERE email=$1 AND active=true', [body.email.toLowerCase()]);
  const user = result.rows[0];
  if (!user || !checkPassword(body.password, user.password_hash)) {
    loginAttempts.set(ip, { count: (recent?.until ?? 0) > Date.now() ? recent!.count + 1 : 1, until: Date.now() + 15 * 60_000 });
    return reply.code(401).send({ error: 'Incorrect email or password.' });
  }
  loginAttempts.delete(ip);
  setSessionCookie(reply, await createSession(user.id));
  return { user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, permissions: user.permissions } };
});
app.post('/api/logout', async (request, reply) => {
  const token = readToken(request);
  if (token) await sql('DELETE FROM sessions WHERE token_hash=$1', [digest(token)]);
  clearSessionCookie(reply);
  return { ok: true };
});
app.get('/api/me', async (request, reply) => ({ user: await currentUser(request) || (reply.code(401), null) }));
app.post('/api/me/password', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  const data = z.object({ currentPassword:z.string(), newPassword:z.string().min(12).max(200) }).parse(request.body);
  const result = await sql('SELECT password_hash FROM users WHERE id=$1', [user.id]);
  if (!checkPassword(data.currentPassword,result.rows[0].password_hash)) return reply.code(400).send({ error:'Current password is incorrect.' });
  await sql('UPDATE users SET password_hash=$2 WHERE id=$1', [user.id,hashPassword(data.newPassword)]);
  await sql('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2', [user.id,digest(readToken(request) || '')]);
  return { ok:true };
});

app.get('/api/projects', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || !requireFeature(user, 'projects.view', reply)) return;
  const result = await sql('SELECT * FROM projects ORDER BY updated_at DESC LIMIT 200');
  return { projects: result.rows.map(projectRow) };
});
app.post('/api/projects', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || !requireFeature(user, 'projects.create', reply)) return;
  const data = projectSchema.parse(request.body);
  const d=designOf(data.requirements);
  if((d.services.length||d.pipeSide!=='east'||d.maintenanceWidth!==2.5||!d.sewerAvailable)&&!requireFeature(user,'services.edit',reply))return;
  if((d.quoteOverride||d.quoteRate||d.quoteExtras.length||d.quoteTax||d.quoteDiscount||d.porticoFactor!==.5||d.quoteValidity!==30||d.balconyFactor!==1||d.includeInteriors)&&!requireFeature(user,'quotes.edit',reply))return;
  if(data.selectedVariant!==0&&!requireFeature(user,'plans.generate',reply))return;
  if(Object.entries(data.ratios).some(([k,v])=>DEFAULT_RATIOS[k as keyof typeof DEFAULT_RATIOS]!==v)&&!requireFeature(user,'plans.edit',reply))return;
  if(data.status!=='concept'&&!requireFeature(user,'plans.edit',reply))return;
  if(data.status==='approved'){
    const settings=await sql('SELECT data FROM settings WHERE id=1'),plan=generatePlan(data.requirements,settings.rows[0].data,data.selectedVariant,data.ratios);
    if(!plan.valid||plan.checks?.some(c=>c.status==='conflict'))return reply.code(400).send({error:'Resolve design conflicts before marking the concept reviewed.'});
  }
  const id = randomUUID();
  const result = await sql(`INSERT INTO projects(id,owner_id,title,requirements,paragraph,transcript,selected_variant,ratios,status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [id,user.id,data.title,data.requirements,data.paragraph,data.transcript,data.selectedVariant,data.ratios,data.status]);
  return reply.code(201).send({ project: projectRow(result.rows[0]) });
});
app.patch('/api/projects/:id', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || !requireFeature(user, 'projects.edit', reply)) return;
  const id = z.uuid().parse((request.params as any).id);
  const data = projectSchema.parse(request.body);
  const before = await sql('SELECT selected_variant,ratios,requirements FROM projects WHERE id=$1', [id]);
  if (!before.rowCount) return reply.code(404).send({ error: 'Project not found.' });
  if(data.status!== 'concept'&&!requireFeature(user,'plans.edit',reply))return;
  if(data.status==='approved'){
    const settings=await sql('SELECT data FROM settings WHERE id=1'),plan=generatePlan(data.requirements,settings.rows[0].data,data.selectedVariant,data.ratios);
    if(!plan.valid||plan.checks?.some(c=>c.status==='conflict'))return reply.code(400).send({error:'Resolve the design conflicts before marking this concept reviewed.'});
  }
  const oldDesign=designOf(before.rows[0].requirements),newDesign=designOf(data.requirements);
  if(JSON.stringify([oldDesign.services,oldDesign.pipeSide,oldDesign.maintenanceWidth,oldDesign.sewerAvailable])!==JSON.stringify([newDesign.services,newDesign.pipeSide,newDesign.maintenanceWidth,newDesign.sewerAvailable])&&!requireFeature(user,'services.edit',reply))return;
  if(JSON.stringify([oldDesign.quoteRate,oldDesign.quoteOverride,oldDesign.quoteExtras,oldDesign.includeInteriors,oldDesign.quoteTax,oldDesign.quoteDiscount,oldDesign.porticoFactor,oldDesign.quoteValidity,oldDesign.balconyFactor])!==JSON.stringify([newDesign.quoteRate,newDesign.quoteOverride,newDesign.quoteExtras,newDesign.includeInteriors,newDesign.quoteTax,newDesign.quoteDiscount,newDesign.porticoFactor,newDesign.quoteValidity,newDesign.balconyFactor])&&!requireFeature(user,'quotes.edit',reply))return;
  if (before.rows[0].selected_variant !== data.selectedVariant && !requireFeature(user,'plans.generate',reply)) return;
  if (Object.entries(data.ratios).some(([key,value]) => before.rows[0].ratios[key] !== value) && !requireFeature(user,'plans.edit',reply)) return;
  const result = await sql(`UPDATE projects SET title=$2,requirements=$3,paragraph=$4,transcript=$5,selected_variant=$6,ratios=$7,status=$8,updated_at=now()
    WHERE id=$1 RETURNING *`, [id,data.title,data.requirements,data.paragraph,data.transcript,data.selectedVariant,data.ratios,data.status]);
  if (!result.rowCount) return reply.code(404).send({ error: 'Project not found.' });
  return { project: projectRow(result.rows[0]) };
});

app.get('/api/users', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || user.role !== 'admin') return reply.code(403).send({ error:'Only an admin can manage employees.' });
  const result = await sql('SELECT id,name,email,role,active,permissions FROM users ORDER BY created_at DESC');
  return { users: result.rows };
});
app.post('/api/users', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || user.role !== 'admin') return reply.code(403).send({ error:'Only an admin can manage employees.' });
  const data = userSchema.parse(request.body);
  const result = await sql(`INSERT INTO users(id,name,email,password_hash,role,permissions) VALUES ($1,$2,$3,$4,'employee',$5) RETURNING id,name,email,role,active,permissions`,
    [randomUUID(),data.name,data.email.toLowerCase(),hashPassword(data.password),JSON.stringify(data.permissions)]);
  return reply.code(201).send({ user: result.rows[0] });
});
app.patch('/api/users/:id', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || user.role !== 'admin') return reply.code(403).send({ error:'Only an admin can manage employees.' });
  const id = z.uuid().parse((request.params as any).id);
  const data = z.object({ name: z.string().min(1).max(120), active: z.boolean(), permissions: z.array(z.enum(FEATURES)), password: z.string().min(12).max(200).optional() }).parse(request.body);
  const result = await sql(`UPDATE users SET name=$2,active=$3,permissions=$4,password_hash=COALESCE($5,password_hash)
    WHERE id=$1 AND role='employee' RETURNING id,name,email,role,active,permissions`, [id,data.name,data.active,JSON.stringify(data.permissions),data.password ? hashPassword(data.password) : null]);
  if (!result.rowCount) return reply.code(404).send({ error: 'Employee not found.' });
  if (!data.active) await sql('DELETE FROM sessions WHERE user_id=$1', [id]);
  return { user: result.rows[0] };
});

app.get('/api/settings', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  const result = await sql('SELECT data FROM settings WHERE id=1'); return { settings: result.rows[0].data };
});
app.patch('/api/settings', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || !requireFeature(user, 'settings.manage', reply)) return;
  const data = settingsSchema.parse(request.body);
  await sql('UPDATE settings SET data=$1 WHERE id=1', [data]); return { settings: data };
});

app.get('/api/assets', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  const result = await sql('SELECT * FROM assets ORDER BY created_at DESC'); return { assets: result.rows.map(assetRow) };
});
app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
app.post('/api/assets', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || !requireFeature(user, 'assets.manage', reply)) return;
  const parts = request.parts(); const fields: Record<string,string> = {}; let data: Buffer | null = null;
  for await (const part of parts) {
    if (part.type === 'file') {
      if (part.fieldname !== 'file' || !part.filename.toLowerCase().endsWith('.glb')) return reply.code(400).send({ error: 'Upload a GLB model.' });
      data = await part.toBuffer();
    } else fields[part.fieldname] = String(part.value);
  }
  const parsed = assetFields.parse(fields);
  if (!data || data.length < 12 || data.toString('utf8',0,4) !== 'glTF' || data.readUInt32LE(8) !== data.length) return reply.code(400).send({ error: 'Invalid GLB file.' });
  const id = randomUUID(); const filePath = await putStoredFile(`assets/${id}.glb`,data);
  const result = await sql(`INSERT INTO assets(id,name,category,width,depth,height,license,source,file_path)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [id,parsed.name,parsed.category,parsed.width,parsed.depth,parsed.height,parsed.license,parsed.source,filePath]);
  return reply.code(201).send({ asset: assetRow(result.rows[0]) });
});
app.get('/api/assets/:id/file', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user) return;
  const id = z.uuid().parse((request.params as any).id);
  const result = await sql('SELECT file_path FROM assets WHERE id=$1', [id]);
  if (!result.rowCount) return reply.code(404).send({ error: 'Asset not found.' });
  reply.header('Content-Type', 'model/gltf-binary').header('Cache-Control','private, max-age=3600');
  return reply.send(await getStoredFile(`assets/${id}.glb`,result.rows[0].file_path));
});

app.post('/api/transcribe', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || !requireFeature(user, 'intake.voice', reply)) return;
  const provider=await getProvider('openai');
  if(!provider)return reply.code(503).send({error:'Configure speech transcription in Settings. Recording and manual transcripts work without a key.'});
  const file = await request.file();
  if (!file || !/^(audio|video)\//.test(file.mimetype)) return reply.code(400).send({ error: 'Upload an audio recording.' });
  const data = await file.toBuffer();
  const form = new FormData(); form.append('model',provider.speechModel||'gpt-transcribe'); form.append('file',new Blob([new Uint8Array(data)],{type:file.mimetype}),file.filename || 'answer.webm');
  form.append('prompt','A discussion about an Indian residential house: plot dimensions, portico, bedrooms, kitchen, bathrooms, Vastu, pooja room, terrace, stairs and construction budget.');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method:'POST', headers:{Authorization:`Bearer ${provider.apiKey}`}, body:form,signal:AbortSignal.timeout(120000) });
  if (!response.ok) { app.log.error(`Transcription failed: ${response.status}`); return reply.code(502).send({ error: 'Transcription service is unavailable.' }); }
  const output = await response.json() as { text?: string; languages?: {code:string}[] };
  return { text: output.text || '', languages: output.languages || [] };
});

app.post('/api/extract', async (request, reply) => {
  const user = await requireUser(request, reply); if (!user || !requireFeature(user, 'intake.ai', reply)) return;
  const {text,useAI}=z.object({text:z.string().min(3).max(10000),useAI:z.boolean().default(false)}).parse(request.body);
  if(!useAI)return localExtract(text);
  const provider=await getProvider('openai');
  if(!provider)return reply.code(503).send({error:'Configure an AI provider in Settings or use local extraction.'});
  const schema = { type:'object', additionalProperties:false, properties: {
    fields:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ key:{type:'string',enum:[...Object.keys(reqSchema.shape).filter(k=>!['design','requestedSizes'].includes(k)), 'design.mainDoorFacing','design.houseFacing','design.outerFacing','design.twoDoors','design.vastuMode','design.style','design.roof','design.roomRequests']}, value:{type:'string'} }, required:['key','value'] } },
    questions:{ type:'array',items:{type:'string'} }, summary:{type:'string'}
  }, required:['fields','questions','summary'] };
  const response = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{Authorization:`Bearer ${provider.apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({ model:provider.textModel || 'gpt-6.1-sol', max_output_tokens:4000, reasoning:{effort:'low'},
      instructions:'Extract only house requirements explicitly stated in the text. Use plotWidth/plotDepth in feet, budgetLakhs in INR lakhs, booleans as true/false, floors as a positive total level count (G+3 means 4), and exact enum values when clear. Do not guess missing values. Preserve names and notes. Ask at most three important follow-up questions. Output short values as strings.',
      input:text, text:{format:{type:'json_schema',name:'house_requirements',strict:true,schema}} }) });
  if (!response.ok) { app.log.error(`Extraction failed: ${response.status}`); return reply.code(502).send({ error: 'AI service is unavailable.' }); }
  const output = await response.json() as any;
  const content = output.output?.flatMap((item:any) => item.content || []).find((part:any) => part.type === 'output_text')?.text;
  if (!content) return reply.code(502).send({ error: 'AI returned no structured result.' });
  const parsed = JSON.parse(content);
  return { ...parsed, usage:output.usage };
});

app.get('/api/references/search',async(request,reply)=>{const user=await requireUser(request,reply);if(!user||!requireFeature(user,'assets.manage',reply))return;const {q}=z.object({q:z.string().min(2).max(100)}).parse(request.query);return searchReferences(q);});
app.get('/api/integrations/status',async(request,reply)=>{const user=await requireUser(request,reply);if(!user)return;return providerStatus();});
app.patch('/api/integrations/:provider',async(request,reply)=>{
 const user=await requireUser(request,reply);if(!user)return;if(user.role!=='admin')return reply.code(403).send({error:'Only the administrator can configure provider credentials.'});
 const provider=z.enum(['openai','runpod','gpu-worker','pixabay']).parse((request.params as any).provider);
 const data=z.object({apiKey:z.string().trim().max(2000).default(''),textModel:z.string().trim().min(1).max(100).optional(),speechModel:z.string().trim().min(1).max(100).optional(),endpointId:z.string().regex(/^[a-zA-Z0-9_-]*$/).max(120).optional(),publicBaseUrl:z.union([z.literal(''),z.url().refine(v=>v.startsWith('https://'),'Use an HTTPS application URL.')]).optional(),workerUrl:z.string().max(500).refine(v=>{try{workerBaseUrl(v);return true;}catch{return false;}},'Use a public HTTPS worker origin or http://127.0.0.1:8787.').transform(workerBaseUrl).optional(),hourlyRateInr:z.number().finite().min(0).max(10000).optional()}).parse(request.body);
 if(provider==='gpu-worker'&&(!data.workerUrl||data.apiKey&&data.apiKey.length<32))return reply.code(400).send({error:'Enter the worker URL and a worker token of at least 32 characters (or leave the token blank to retain it).'});
 await saveProvider(provider,data);return {ok:true,status:await providerStatus()};
});
app.delete('/api/integrations/:provider',async(request,reply)=>{
 const user=await requireUser(request,reply);if(!user)return;if(user.role!=='admin')return reply.code(403).send({error:'Only the administrator can remove credentials.'});
 const provider=z.enum(['openai','runpod','gpu-worker','pixabay']).parse((request.params as any).provider);await sql('DELETE FROM provider_credentials WHERE provider=$1',[provider]);return {ok:true,status:await providerStatus()};
});
app.post('/api/integrations/:provider/test',async(request,reply)=>{
 const user=await requireUser(request,reply);if(!user)return;if(user.role!=='admin')return reply.code(403).send({error:'Only the administrator can test provider connections.'});
 const name=z.enum(['openai','runpod','gpu-worker','pixabay']).parse((request.params as any).provider),config=await getProvider(name);
 if(!config)return reply.code(400).send({error:'Save the provider configuration first.'});
 if(name==='pixabay'){const result=await searchReferences('living room');return {ok:true,message:'Pixabay connected. Reference searches are cached for 24 hours.',count:result.photos.length};}
 if(name==='gpu-worker'){try{return await workerHealth(config);}catch(e){return reply.code(502).send({error:(e as Error).message});}}
 if(name==='runpod'&&!config.endpointId)return reply.code(400).send({error:'Enter the ID of your deployed Blender worker endpoint.'});
 const urls=name==='openai'?[config.textModel||'gpt-6.1-sol',config.speechModel||'gpt-transcribe'].map(model=>`https://api.openai.com/v1/models/${encodeURIComponent(model)}`):[`https://api.runpod.ai/v2/${config.endpointId}/health`];
 try{for(const url of urls){const response=await fetch(url,{headers:{Authorization:`Bearer ${config.apiKey}`},signal:AbortSignal.timeout(15000)});if(!response.ok)return reply.code(502).send({error:`Connection or selected model check failed (${response.status}). Check the key, model access or endpoint.`});}return {ok:true,message:name==='openai'?'Key and both selected model IDs are accessible. No generation was requested.':'Connection succeeded. No render was requested.'};}catch{return reply.code(502).send({error:'The provider could not be reached.'});}
});
app.get('/api/health', async (_request,reply) => {
  try{await sql('SELECT 1');return {ok:true,build:buildIdentifier()};}
  catch{return reply.code(503).send({ok:false,error:'Database unavailable.'});}
});
if (isProduction) {
  app.register(fastifyStatic, { root:path.resolve('dist'), prefix:'/', wildcard:false });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) return reply.code(404).send({ error:'Not found.' });
    return reply.sendFile('index.html');
  });
}

async function start() {
  validateHostingEnvironment();
  await mkdir(uploadDir,{recursive:true});
  await initializeDatabase();
  await registerRenders(app);
  if (isProduction) await app.ready();
  await app.listen({ port:Number(process.env.PORT || 3001), host:isProduction?'0.0.0.0':'127.0.0.1' });
}
let shuttingDown=false;
async function shutdown(){if(shuttingDown)return;shuttingDown=true;await app.close();await pool.end();}
process.once('SIGTERM',()=>{void shutdown();});
process.once('SIGINT',()=>{void shutdown();});
start().catch(error => { app.log.error(error); process.exit(1); });
