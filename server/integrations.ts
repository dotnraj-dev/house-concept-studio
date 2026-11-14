import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {sql} from './db';
import {credentialKey,storagePaths} from './runtime';
export type Provider='openai'|'runpod'|'gpu-worker';
export type ProviderConfig={apiKey:string;textModel?:string;speechModel?:string;endpointId?:string;publicBaseUrl?:string;workerUrl?:string;hourlyRateInr?:number};
export function seal(value:string,key:Buffer){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return [iv.toString('base64'),cipher.getAuthTag().toString('base64'),data.toString('base64')].join('.');
}
export function unseal(value:string,key:Buffer){
 const [iv,tag,data]=value.split('.'),decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64'));decipher.setAuthTag(Buffer.from(tag,'base64'));
 return Buffer.concat([decipher.update(Buffer.from(data,'base64')),decipher.final()]).toString('utf8');
}
async function encryptionKey(){
 if(process.env.CREDENTIAL_ENCRYPTION_KEY)return credentialKey(process.env.CREDENTIAL_ENCRYPTION_KEY);
 const dir=storagePaths().credentials,file=path.join(dir,'credentials.key');await mkdir(dir,{recursive:true,mode:0o700});
 try{return await readFile(file);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;const key=randomBytes(32);try{await writeFile(file,key,{flag:'wx',mode:0o600});return key;}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')return readFile(file);throw e;}}
}
export async function getProvider(provider:Provider):Promise<ProviderConfig|null>{
 const result=await sql('SELECT encrypted FROM provider_credentials WHERE provider=$1',[provider]);
 if(result.rowCount)return JSON.parse(unseal(result.rows[0].encrypted,await encryptionKey()));
 if(provider==='openai'&&process.env.OPENAI_API_KEY)return {apiKey:process.env.OPENAI_API_KEY,textModel:process.env.OPENAI_TEXT_MODEL||'gpt-6.1-sol',speechModel:'gpt-transcribe'};
 return null;
}
export async function saveProvider(provider:Provider,config:ProviderConfig){
 const previous=await getProvider(provider);const next={...previous,...config,apiKey:config.apiKey||previous?.apiKey||''};
 if(!next.apiKey)throw Object.assign(new Error('Enter an API key to configure this provider.'),{statusCode:400});
 await sql('INSERT INTO provider_credentials(provider,encrypted) VALUES($1,$2) ON CONFLICT(provider) DO UPDATE SET encrypted=$2,updated_at=now()',[provider,seal(JSON.stringify(next),await encryptionKey())]);
}
export async function providerStatus(){
 const [openai,runpod,worker]=await Promise.all([getProvider('openai'),getProvider('runpod'),getProvider('gpu-worker')]);
 return {openai:{configured:!!openai,textModel:openai?.textModel||'gpt-6.1-sol',speechModel:openai?.speechModel||'gpt-transcribe'},runpod:{configured:!!runpod,endpointId:runpod?.endpointId||'',publicBaseUrl:runpod?.publicBaseUrl||process.env.PUBLIC_BASE_URL||process.env.RENDER_EXTERNAL_URL||''},'gpu-worker':{configured:!!worker,workerUrl:worker?.workerUrl||'http://127.0.0.1:8787',hourlyRateInr:worker?.hourlyRateInr??59.32}};
}

