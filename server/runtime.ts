import path from 'node:path';

type Environment=Record<string,string|undefined>;
export function storagePaths(env:Environment=process.env){
  const data=env.DATA_DIR?path.resolve(env.DATA_DIR):null;
  return {
    uploads:path.resolve(env.UPLOAD_DIR||(data?path.join(data,'uploads'):'uploads')),
    renders:path.resolve(env.RENDER_DIR||(data?path.join(data,'renders'):'render-output')),
    credentials:path.resolve(env.CREDENTIAL_DIR||(data?path.join(data,'secrets'):'.secrets')),
  };
}

/** Accept Render-generated hex or an existing base64 key without changing old keys. */
export function credentialKey(value:string):Buffer{
  const key=/^[a-f0-9]{64}$/i.test(value)?Buffer.from(value,'hex'):Buffer.from(value,'base64');
  if(key.length!==32)throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 32 bytes encoded as base64 or 64 hexadecimal characters.');
  return key;
}

export function validateHostingEnvironment(env:Environment=process.env){
  if(env.NODE_ENV!=='production')return;
  if(!env.DATABASE_URL)throw new Error('Production requires DATABASE_URL.');
  if(env.RENDER==='true'&&!env.DATA_DIR&&env.FILE_STORAGE!=='database')throw new Error('Set DATA_DIR to the persistent disk mount or FILE_STORAGE=database before starting on Render.');
  if(!env.CREDENTIAL_ENCRYPTION_KEY)throw new Error('Production requires a stable CREDENTIAL_ENCRYPTION_KEY. Keep the same key across deployments.');
  credentialKey(env.CREDENTIAL_ENCRYPTION_KEY);
}

export function validRequestOrigin(origin:string|undefined,host:string|undefined,env:Environment=process.env){
  if(!origin)return true; // Non-browser API clients authenticate separately.
  try{
    const url=new URL(origin);
    if(!['http:','https:'].includes(url.protocol))return false;
    const configured=env.PUBLIC_BASE_URL||env.RENDER_EXTERNAL_URL;
    return configured?url.origin===new URL(configured).origin:url.host===host;
  }catch{return false;}
}

export const buildIdentifier=(env:Environment=process.env)=>
  (env.RENDER_GIT_COMMIT||env.BUILD_SHA||'local').slice(0,12);

