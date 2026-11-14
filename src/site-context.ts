import type {Plan,PlotVertex} from './types';
import {pointInPolygon} from './geometry';
export type EdgeUse='house'|'building'|'trees'|'open'|'road';
export type EdgeContext={edge:string;use:EdgeUse;gap:number;width:number;depth:number;height:number;along:number};
export type SiteContext={latitude:number;longitude:number;edges:EdgeContext[]};
export const defaultSite:SiteContext={latitude:13.08,longitude:80.27,edges:[]};
export function plotEdges(plan:Plan):PlotVertex[]{return plan.site?.polygon||[{id:'A',x:0,y:0,road:plan.roadSide==='north',setback:0},{id:'B',x:plan.plotWidth,y:0,road:plan.roadSide==='east',setback:0},{id:'C',x:plan.plotWidth,y:plan.plotDepth,road:plan.roadSide==='south',setback:0},{id:'D',x:0,y:plan.plotDepth,road:plan.roadSide==='west',setback:0}];}
export function edgeDefaults(p:PlotVertex,i:number,len:number):EdgeContext {return {edge:p.id,use:p.road?'road':(['house','trees','building','house'] as const)[i%4],gap:p.road?0:5,width:Math.max(1,Math.min(26,len*.75)),depth:p.road?18:16,height:i%3===0?19:10,along:.5};}
type Vec=[number,number];
const cross=(a:Vec,b:Vec,c:Vec)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const intersects=(a:Vec,b:Vec,c:Vec,d:Vec)=>cross(a,b,c)*cross(a,b,d)<-1e-7&&cross(c,d,a)*cross(c,d,b)<-1e-7;
export function outsideLot(corners:Vec[],polygon:PlotVertex[]){
 const points=polygon.map(p=>[p.x,p.y] as Vec);
 return !corners.some(([x,y])=>pointInPolygon({x,y},polygon))&&!polygon.some(p=>pointInPolygon(p,corners.map(([x,y])=>({x,y}))))&&!corners.some((a,i)=>points.some((c,j)=>intersects(a,corners[(i+1)%4],c,points[(j+1)%points.length])));
}
export function surroundings(plan:Plan){
 const poly=plotEdges(plan),signed=poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a.x*b.y-b.x*a.y;},0),sign=Math.sign(signed)||1;
 return poly.map((a,i)=>{const b=poly[(i+1)%poly.length],len=Math.hypot(b.x-a.x,b.y-a.y)||1,ux=(b.x-a.x)/len,uz=(b.y-a.y)/len,nx=uz*sign,nz=-ux*sign;
 const observation=plan.design?.siteContext?.edges.find(e=>e.edge===a.id),spec=observation||edgeDefaults(a,i,len),road=spec.use==='road',width=road?len:spec.width,depth=spec.depth,along=road?.5:spec.along;
 const offset=spec.gap+depth/2+.05,x=a.x+along*len*ux+offset*nx,z=a.y+along*len*uz+offset*nz;
 const corners=([[-1,-1],[1,-1],[1,1],[-1,1]] as Vec[]).map(([u,v])=>[x+ux*u*width/2+nx*v*depth/2,z+uz*u*width/2+nz*v*depth/2] as Vec);
 return {...spec,observed:!!observation,width,depth,x:x-plan.offsetX,z:z-plan.offsetY,angle:-Math.atan2(uz,ux),blocked:!outsideLot(corners,poly),len,end:b.id};});
}
