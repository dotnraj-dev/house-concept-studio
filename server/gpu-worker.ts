import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import type {ProviderConfig} from './integrations';

export function workerBaseUrl(value:string){
  const url=new URL(value);
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Use the worker origin without a path, credentials or query.');
  const tunnel=url.protocol==='http:'&&url.hostname==='127.0.0.1'&&url.port==='8787';
  if(!tunnel&&url.protocol!=='https:')throw new Error('Use HTTPS, or http://127.0.0.1:8787 for an SSH tunnel.');
  if(!tunnel&&isPrivateAddress(url.hostname.replace(/^\[|\]$/g,'')))throw new Error('Use a public HTTPS worker or the documented SSH tunnel.');
  return url.origin;
}
export function isPrivateAddress(value:string){
  const ip=value.toLowerCase();
  if(ip==='localhost'||ip.endsWith('.localhost')||ip.endsWith('.local')||ip==='::'||ip==='::1'||ip.startsWith('::ffff:')||/^(fc|fd|fe[89ab])/.test(ip)&&ip.includes(':'))return true;
  if(isIP(ip)===4){const [a,b]=ip.split('.').map(Number);return a===0||a===10||a===127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a>=224;}
  return false;
}
export async function workerRequest(config:ProviderConfig,pathname:string,init:RequestInit={},timeout=20000){
  if(!config.workerUrl)throw new Error('Configure the rented GPU worker URL in Settings.');
  const base=workerBaseUrl(config.workerUrl);
  // Only the deliberate local SSH tunnel may target private addresses.
  if(base!=='http://127.0.0.1:8787'){
    const addresses=await lookup(new URL(base).hostname.replace(/^\[|\]$/g,''),{all:true});
    if(!addresses.length||addresses.some(x=>isPrivateAddress(x.address)))throw new Error('The worker must resolve to a public address.');
  }
  if(!/^\/(health|jobs(?:\/[a-f0-9-]+(?:\/cancel)?)?)$/.test(pathname))throw new Error('Invalid worker route.');
  return fetch(base+pathname,{...init,redirect:'error',headers:{...init.headers,Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(timeout)});
}
export async function workerHealth(config:ProviderConfig){
  const response=await workerRequest(config,'/health');
  if(!response.ok)throw new Error(`Worker rejected the connection (${response.status}).`);
  const data=await response.json() as {service?:string;blender?:boolean;gpu?:string;busy?:boolean};
  if(data.service!=='house-concept-render-worker')throw new Error('This URL is not running the supplied house-render worker.');
  if(!data.blender)throw new Error('Worker connected, but Blender is not installed or BLENDER_BIN is incorrect.');
  return {ok:true,message:`Worker connected. ${data.gpu||'GPU not detected; GPU rendering will be refused.'}${data.busy?' A render is currently running.':''}`,gpuDetected:!!data.gpu};
}
