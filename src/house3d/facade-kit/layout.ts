import type {Direction,Plan} from '../../types';
import type {HouseLayout} from '../layout';
import {FLOOR_HEIGHT,WALL_HEIGHT} from '../../building-dimensions';
export type Rect={u:number;v:number;w:number;h:number};
export type Opening=Rect&{id:string;kind:'door'|'window'|'balcony'|'portico'};
export type FacadeContext={plan:Plan;layout:HouseLayout;facing:Direction;length:number;depth:number;angle:number;openings:Opening[];walls:Rect[];at:(u:number,v:number,out?:number)=>[number,number,number];u:(x:number,z:number)=>number};
export const intersects=(a:Rect,b:Rect)=>a.u<b.u+b.w-1e-5&&a.u+a.w>b.u+1e-5&&a.v<b.v+b.h-1e-5&&a.v+a.h>b.v+1e-5;
export function intersection(a:Rect,b:Rect):Rect|null{
 const u=Math.max(a.u,b.u),v=Math.max(a.v,b.v),w=Math.min(a.u+a.w,b.u+b.w)-u,h=Math.min(a.v+a.h,b.v+b.h)-v;return w>.025&&h>.025?{u,v,w,h}:null;
}
export function subtract(rect:Rect,cuts:Rect[]):Rect[]{
 let result=[rect];
 for(const cut of cuts)result=result.flatMap(r=>{
  const i=intersection(r,cut);if(!i)return [r];
  return [{u:r.u,v:r.v,w:r.w,h:i.v-r.v},{u:r.u,v:i.v+i.h,w:r.w,h:r.v+r.h-i.v-i.h},{u:r.u,v:i.v,w:i.u-r.u,h:i.h},{u:i.u+i.w,v:i.v,w:r.u+r.w-i.u-i.w,h:i.h}].filter(a=>a.w>.025&&a.h>.025);
 });return result;
}
export function faceContext(plan:Plan,layout:HouseLayout,facing:Direction=plan.roadSide):FacadeContext{
 const length=['north','south'].includes(facing)?plan.width:plan.depth,depth=['north','south'].includes(facing)?plan.depth:plan.width,angle={north:0,east:-Math.PI/2,south:Math.PI,west:Math.PI/2}[facing];
 const u=(x:number,z:number)=>facing==='north'?x:facing==='east'?z:facing==='south'?plan.width-x:plan.depth-z;
 const inside=(x:number,z:number)=>facing==='north'?z:facing==='east'?plan.width-x:facing==='south'?plan.depth-z:x;
 const at=(a:number,v:number,out=0):[number,number,number]=>facing==='north'?[a,v,-out]:facing==='east'?[plan.width+out,v,a]:facing==='south'?[plan.width-a,v,plan.depth+out]:[-out,v,plan.depth-a];
 const openings:Opening[]=[];
 for(const d of layout.doors){const x=d.x+(d.axis==='x'?d.width/2:0),z=d.z+(d.axis==='z'?d.width/2:0);if(Math.abs(inside(x,z))<.32)openings.push({id:d.id,kind:'door',u:u(x,z)-d.width/2,v:d.floor*FLOOR_HEIGHT,w:d.width,h:7});}
 for(const a of layout.windows){const x=a.x+(a.axis==='x'?a.width/2:0),z=a.z+(a.axis==='z'?a.width/2:0);if(Math.abs(inside(x,z))<.32)openings.push({id:a.id,kind:'window',u:u(x,z)-a.width/2,v:a.floor*FLOOR_HEIGHT+(a.sill??3),w:a.width,h:a.height??3.4});}
 for(const r of plan.rooms.filter(r=>['terrace','portico'].includes(r.kind))){
  const points=[[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]];
  if(points.some(([x,z])=>Math.abs(inside(x,z))<.32)){const us=points.map(([x,z])=>u(x,z));openings.push({id:r.id,kind:r.kind==='terrace'?'balcony':'portico',u:Math.min(...us),v:r.floor*FLOOR_HEIGHT,w:Math.max(...us)-Math.min(...us),h:WALL_HEIGHT});}
 }
 const walls=layout.walls.filter(w=>w.exterior&&Math.abs(inside(w.x+w.w/2,w.z+w.d/2))<.32).map(w=>{const a=u(w.x,w.z),b=u(w.x+w.w,w.z+w.d);return {u:Math.min(a,b),v:w.floor*FLOOR_HEIGHT+w.bottom,w:Math.abs(b-a),h:w.height};});
 return {plan,layout,facing,length,depth,angle,at,u,openings,walls};
}
export const expandedOpenings=(c:FacadeContext,clearance=.12)=>c.openings.filter(o=>!['balcony','portico'].includes(o.kind)).map(o=>({u:o.u-clearance,v:o.v-clearance,w:o.w+2*clearance,h:o.h+2*clearance}));
export function safeRects(c:FacadeContext,r:Rect,solidOnly=true,clearance=.12):Rect[]{
 const candidates=solidOnly?c.walls.flatMap(w=>{const i=intersection(w,r);return i?[i]:[];}):[r];
 return candidates.flatMap(p=>subtract(p,expandedOpenings(c,clearance)));
}
export function frontBalconies(c:FacadeContext){return c.openings.filter(o=>o.kind==='balcony');}
