import {getProvider} from './integrations';
import {sql} from './db';

export type ReferencePhoto={id:number;source:string;preview:string;author:string;tags:string;width:number;height:number};
export type ReferenceResults={query:string;photos:ReferencePhoto[];total:number;cached:boolean;expiresAt:string};
export function referenceQuery(value:string){const query=value.trim().replace(/\s+/g,' ');if(query.length<2||query.length>100)throw Object.assign(new Error('Use a search between 2 and 100 characters.'),{statusCode:400});return query;}
function approvedUrl(value:unknown,page=false){try{const u=new URL(String(value));return u.protocol==='https:'&&(page?u.hostname==='pixabay.com':['pixabay.com','cdn.pixabay.com'].includes(u.hostname))&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function referencePhotos(data:any):ReferencePhoto[]{return (Array.isArray(data?.hits)?data.hits:[]).slice(0,12).map((h:any)=>({id:Number(h.id),source:approvedUrl(h.pageURL,true),preview:approvedUrl(h.webformatURL),author:String(h.user||'Pixabay contributor').slice(0,100),tags:String(h.tags||'').slice(0,300),width:Number(h.webformatWidth)||640,height:Number(h.webformatHeight)||400})).filter((h:ReferencePhoto)=>Number.isSafeInteger(h.id)&&h.id>0&&h.source&&h.preview);}
export async function fetchReferencePhotos(query:string,key:string,request:typeof fetch=fetch){
 const url=new URL('https://pixabay.com/api/');url.search=new URLSearchParams({key,q:query,image_type:'photo',safesearch:'true',per_page:'12',category:'buildings'}).toString();
 let response:Response;try{response=await request(url,{headers:{'User-Agent':'HouseConceptStudio/1.0'},signal:AbortSignal.timeout(20000)});}catch{throw Object.assign(new Error('Pixabay could not be reached. Try again later.'),{statusCode:502});}
 if(!response.ok)throw Object.assign(new Error(response.status===429?'Pixabay request limit reached. Try again later.':'Pixabay rejected the search. Check the saved API key.'),{statusCode:response.status===429?429:502});
 try{const data=await response.json();return {photos:referencePhotos(data),total:Math.max(0,Number(data.total)||0)};}catch{throw Object.assign(new Error('Pixabay returned an unreadable response.'),{statusCode:502});}
}
const recent:number[]=[];
export async function searchReferences(value:string):Promise<ReferenceResults>{
 const query=referenceQuery(value),cacheKey=query.toLocaleLowerCase('en');
 const cached=await sql("SELECT data,expires_at FROM reference_cache WHERE query=$1 AND expires_at>now()",[cacheKey]);
 if(cached.rowCount)return {...cached.rows[0].data,query,cached:true,expiresAt:new Date(cached.rows[0].expires_at).toISOString()};
 const config=await getProvider('pixabay');if(!config)throw Object.assign(new Error('Add the Pixabay key in Settings → Connections first.'),{statusCode:400});
 const now=Date.now();while(recent.length&&recent[0]<now-60000)recent.shift();if(recent.length>=20)throw Object.assign(new Error('Please wait a minute before making more reference searches.'),{statusCode:429});recent.push(now);
 const result=await fetchReferencePhotos(query,config.apiKey),expiresAt=new Date(now+86400000).toISOString();
 await sql("DELETE FROM reference_cache WHERE expires_at<=now()");
 await sql("INSERT INTO reference_cache(query,data,expires_at) VALUES($1,$2,$3) ON CONFLICT(query) DO UPDATE SET data=$2,expires_at=$3",[cacheKey,JSON.stringify(result),expiresAt]);
 // Bound retained search metadata; photos are temporary search previews, never saved or hotlinked as permanent project assets.
 await sql("DELETE FROM reference_cache WHERE query IN (SELECT query FROM reference_cache ORDER BY expires_at DESC OFFSET 256)");
 return {...result,query,cached:false,expiresAt};
}

