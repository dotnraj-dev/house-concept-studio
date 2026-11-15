import {FLOOR_HEIGHT} from '../building-dimensions';
import type {Direction,Plan} from '../types';
import type {HouseLayout,WindowSpec} from './layout';
export type V3=[number,number,number];
const rad=Math.PI/180;
// NOAA fractional-year approximation. Scene axes: +X east, -Z north. Input time is IST.
export function sunPosition(date:string,hour:number,lat:number,lon:number){
 const stamp=new Date(date+'T00:00:00Z'),yr=stamp.getUTCFullYear(),day=(stamp.getTime()-Date.UTC(yr,0,1))/86400000+1,days=(Date.UTC(yr+1,0,1)-Date.UTC(yr,0,1))/86400000;
 const g=2*Math.PI/days*(day-1+(hour-12)/24),eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
 const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
 const ha=((hour*60+eq+4*lon-330)/4-180)*rad,l=lat*rad;
 const up=Math.sin(l)*Math.sin(dec)+Math.cos(l)*Math.cos(dec)*Math.cos(ha),east=-Math.cos(dec)*Math.sin(ha),north=Math.cos(l)*Math.sin(dec)-Math.sin(l)*Math.cos(dec)*Math.cos(ha);
 return {direction:[east,up,-north] as V3,elevation:Math.asin(Math.max(-1,Math.min(1,up)))/rad,daylight:up>0};
}
export const windowCentre=(w:WindowSpec):V3=>[w.x+(w.axis==='x'?w.width*.5:0),w.floor*FLOOR_HEIGHT+(w.sill??3)+(w.height??3.4)/2,w.z+(w.axis==='z'?w.width*.5:0)];
// Qualitative connectivity: only traverse arches or doors the viewer has actually opened.
// Each room is rectangular: segments from its centre to its own openings stay within the room.
export function windPaths(plan:Plan,layout:HouseLayout,from:Direction,floor:number,open:ReadonlySet<string>){
 const n={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]}[from],windows=layout.windows.filter(w=>w.floor===floor),rooms=new Map(plan.rooms.filter(r=>r.floor===floor).map(r=>[r.id,r]));
 const outlets=windows.filter(w=>w.outward[0]*n[0]+w.outward[1]*n[1]<-.5),paths:V3[][]=[];
 const adjacency=new Map<string,{id:string;pt:V3}[]>();for(const d of layout.doors){if(d.floor!==floor||(!d.arch&&!open.has(d.id))||d.rooms?.length!==2)continue;const [a,b]=d.rooms,pt:V3=[d.x+(d.axis==='x'?d.width/2:0),floor*FLOOR_HEIGHT+4,d.z+(d.axis==='z'?d.width/2:0)];for(const [u,v] of [[a,b],[b,a]])adjacency.set(u,[...(adjacency.get(u)||[]),{id:v,pt}]);}
 for(const w of windows.filter(w=>w.outward[0]*n[0]+w.outward[1]*n[1]>.5)){
 const start=windowCentre(w),queue=[{id:w.roomId,pts:[start]}],seen=new Set([w.roomId]);while(queue.length){const {id,pts}=queue.shift()!,room=rooms.get(id);if(!room)continue;
 const mid:V3=[room.x+room.w/2,floor*FLOOR_HEIGHT+4,room.y+room.h/2],exit=outlets.find(o=>o.roomId===id);if(exit){paths.push([...pts,mid,windowCentre(exit)]);break;}
 for(const hop of adjacency.get(id)||[]){if(seen.has(hop.id))continue;seen.add(hop.id);queue.push({id:hop.id,pts:[...pts,mid,hop.pt]});}}
 }return paths;
}
