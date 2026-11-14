import path from 'node:path';
import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {pool,sql} from './db';
import {storagePaths} from './runtime';

const databaseFiles=()=>process.env.FILE_STORAGE==='database';
function location(key:string){
  if(!/^(assets|renders)\/[a-f0-9-]+\.(glb|png)$/.test(key))throw new Error('Invalid storage key.');
  const [kind,file]=key.split('/');return path.join(kind==='assets'?storagePaths().uploads:storagePaths().renders,file);
}
/** Database files allow a small free staging deployment without an ephemeral upload directory. */
export async function putStoredFile(key:string,data:Buffer){
  const file=location(key);
  if(!databaseFiles()){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,data);return file;}
  const client=await pool.connect();
  try{
    await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(88037011)');
    const total=await client.query('SELECT COALESCE(sum(octet_length(content)),0)::bigint AS total FROM stored_files WHERE key<>$1',[key]);
    const configured=Number(process.env.FILE_STORAGE_LIMIT_MB||200),limit=(Number.isFinite(configured)?Math.max(50,Math.min(2000,configured)):200)*1024*1024;
    if(Number(total.rows[0].total)+data.length>limit)throw Object.assign(new Error('Test file storage is full. Remove unused files or upgrade hosting storage before uploading more.'),{statusCode:507});
    await client.query('INSERT INTO stored_files(key,content) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET content=$2',[key,data]);
    await client.query('COMMIT');return 'db:'+key;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function getStoredFile(key:string,legacyPath?:string){
  const file=location(key);
  if(databaseFiles()||legacyPath?.startsWith('db:')){
    const result=await sql('SELECT content FROM stored_files WHERE key=$1',[key]);
    if(result.rowCount)return result.rows[0].content as Buffer;
    if(legacyPath?.startsWith('db:'))throw Object.assign(new Error('File not found.'),{statusCode:404});
  }
  try{return await readFile(legacyPath||file);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;throw Object.assign(new Error('File not found.'),{statusCode:404});}
}
export async function removeStoredFile(key:string){
  await sql('DELETE FROM stored_files WHERE key=$1',[key]);
  try{await unlink(location(key));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
}
