import {localExtract} from './intake';
import {normalizeRequirements} from './types';
import { DEFAULT_SETTINGS, type Asset, type Project, type Settings, type User } from './types';

const admin:User={id:'00000000-0000-4000-8000-000000000001',name:'Studio Admin',email:'admin@demo.local',role:'admin',active:true,permissions:[]};
const key=(name:string)=>`hcs_demo_${name}`;
function read<T>(name:string,fallback:T):T {try{return JSON.parse(localStorage.getItem(key(name))||'null')||fallback;}catch{return fallback;}}
function write(name:string,value:unknown){localStorage.setItem(key(name),JSON.stringify(value));}
function json(options:RequestInit){return JSON.parse(String(options.body||'{}'));}
function requireLogin(){if(!read('logged',false))throw new Error('Sign in to continue.');}
export async function demoApi<T>(url:string,options:RequestInit):Promise<T>{
  const method=options.method||'GET';
  if(url==='/login'&&method==='POST'){const body=json(options);if(body.email!==admin.email||body.password!=='DemoPassword123!')throw new Error('Incorrect demo email or password.');write('logged',true);return {user:admin} as T;}
  if(url==='/me'){requireLogin();return {user:admin} as T;}
  if(url==='/logout'){write('logged',false);return {ok:true} as T;}
  requireLogin();
  if(url==='/projects'&&method==='GET')return {projects:read<Project[]>('projects',[]).map(p=>({...p,requirements:normalizeRequirements(p.requirements)}))} as T;
  if(url==='/projects'&&method==='POST'){const data=json(options);const projects=read<Project[]>('projects',[]);const now=new Date().toISOString();const project={...data,id:crypto.randomUUID(),ownerId:admin.id,createdAt:now,updatedAt:now};write('projects',[project,...projects]);return {project} as T;}
  if(url.startsWith('/projects/')&&method==='PATCH'){const id=url.split('/')[2];const projects=read<Project[]>('projects',[]);const project={...json(options),id,updatedAt:new Date().toISOString()};write('projects',projects.map(p=>p.id===id?project:p));return {project} as T;}
  if(url==='/users'&&method==='GET')return {users:[admin,...read<User[]>('users',[])]} as T;
  if(url==='/users'&&method==='POST'){const body=json(options);const user:User={id:crypto.randomUUID(),name:body.name,email:body.email,role:'employee',active:true,permissions:body.permissions};write('users',[user,...read<User[]>('users',[])]);return {user} as T;}
  if(url.startsWith('/users/')&&method==='PATCH'){const id=url.split('/')[2];const users=read<User[]>('users',[]);const user={...users.find(u=>u.id===id),...json(options),id};write('users',users.map(u=>u.id===id?user:u));return {user} as T;}
  if(url==='/settings'&&method==='GET')return {settings:read<Settings>('settings',DEFAULT_SETTINGS)} as T;
  if(url==='/settings'&&method==='PATCH'){const settings=json(options);write('settings',settings);return {settings} as T;}
  if(url==='/assets'&&method==='GET')return {assets:read<Asset[]>('assets',[])} as T;
  if(url==='/assets'&&method==='POST'){const form=options.body as FormData;const asset:Asset={id:crypto.randomUUID(),name:String(form.get('name')),category:String(form.get('category')),width:Number(form.get('width')),depth:Number(form.get('depth')),height:Number(form.get('height')),license:String(form.get('license')),source:String(form.get('source')),fileUrl:'',createdAt:new Date().toISOString()};write('assets',[asset,...read<Asset[]>('assets',[])]);return {asset} as T;}
  if(url==='/extract'&&!json(options).useAI)return localExtract(json(options).text) as T;
  if(url==='/integrations/status')return {openai:{configured:false,textModel:'gpt-6.1-sol',speechModel:'gpt-transcribe'},runpod:{configured:false,endpointId:''},'gpu-worker':{configured:false,workerUrl:'http://127.0.0.1:8787',hourlyRateInr:59.32}} as T;
  if(url.startsWith('/integrations/'))throw new Error('Provider credentials are available only on the full server.');
  if(url==='/extract'||url==='/transcribe')throw new Error('AI and voice require an API key on the VPS. Demo mode does not call external services.');
  if(url==='/me/password')return {ok:true} as T;
  throw new Error(`Unknown demo request: ${method} ${url}`);
}
