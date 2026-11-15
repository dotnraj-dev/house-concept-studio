import {GROUND_LEVEL} from '../building-dimensions';
import {FLOOR_HEIGHT} from '../building-dimensions';
import {Block} from './HouseScene';
import {AssetModel} from './Assets';
import {entrancePose,type HouseLayout} from './layout';
import type {Asset,Plan,Direction} from '../types';
import {pointInPolygon} from '../geometry';
import {palette} from '../regions';
function frame(plan:Plan){
 const facing=plan.design?.twoDoors?plan.design.outerFacing:plan.design?.houseFacing||plan.roadSide;
 const turn={north:0,east:-Math.PI/2,south:Math.PI,west:Math.PI/2}[facing],length=['north','south'].includes(facing)?plan.width:plan.depth;
 const at=(u:number,y:number,b:number):[number,number,number]=>facing==='north'?[u,y,b]:facing==='east'?[plan.width-b,y,u]:facing==='south'?[plan.width-u,y,plan.depth-b]:[b,y,plan.depth-u];
 const u=(x:number,z:number)=>facing==='north'?x:facing==='east'?z:facing==='south'?plan.width-x:plan.depth-z;
 return {facing,turn,length,at,u};
}
export function Architecture({plan,layout,assets}:{plan:Plan;layout:HouseLayout;assets:Asset[]}){
 const f=frame(plan),finish=palette(plan.design?.style),pitched=plan.design?.roof&&plan.design.roof!=='flat';
 const front=layout.walls.filter(w=>w.exterior&&((f.facing==='north'||f.facing==='south')?w.w>w.d:w.d>w.w)&&(f.facing==='north'?w.z<.3:f.facing==='south'?w.z+w.d>plan.depth-.3:f.facing==='east'?w.x+w.w>plan.width-.3:w.x<.3));
 const n=({north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]} as const)[f.facing];
 const light=(u:number,y:number,b:number,id:string)=><group key={id} position={f.at(u,y,b)} rotation={[0,f.turn,0]}><Block position={[0,0,0]} size={[.42,.72,.19]} color="#3d4038"/><Block position={[0,-.08,-.11]} size={[.29,.38,.035]} color="#ffe2b3" emissive="#ffc473"/><pointLight position={[0,.15,-.55]} intensity={12} distance={10} decay={2} color="#ffd3a0"/></group>;
 const entry=layout.doors.find(d=>d.main),entryU=entry?f.u(entry.x+(entry.axis==='x'?entry.width/2:0),entry.z+(entry.axis==='z'?entry.width/2:0)):f.length*.55;
 return <group name="Architectural detailing">
 {front.filter(w=>f.u(w.x+w.w/2,w.z+w.d/2)<f.length*.45&&w.height>1).map(w=><Block key={'accent-'+w.id} position={[w.x+w.w/2+n[0]*.17,w.floor*FLOOR_HEIGHT+w.bottom+w.height/2,w.z+w.d/2+n[1]*.17]} size={[w.w+(w.w<.4?.045:0),w.height,w.d+(w.d<.4?.045:0)]} color="#fff5e4" surface="stackstone"/>)}
 {layout.windows.filter(w=>w.outward[0]===n[0]&&w.outward[1]===n[1]).map(w=>{const u=f.u(w.x+(w.axis==='x'?w.width/2:0),w.z+(w.axis==='z'?w.width/2:0)),y=w.floor*FLOOR_HEIGHT+(w.sill??3)+(w.height||3.4)/2,h=w.height||3.4;
 return <group key={w.id} position={f.at(u,y,-.18)} rotation={[0,f.turn,0]}>{[-1,1].map(s=><Block key={'a'+s} position={[s*(w.width/2+.12),0,0]} size={[.21,h+.4,.42]} color="#45463d"/>)}{[-1,1].map(s=><Block key={'b'+s} position={[0,s*(h/2+.1),0]} size={[w.width+.44,.2,.42]} color="#45463d"/>)}</group>;})}
 {plan.rooms.filter(r=>r.kind==='terrace'&&r.floor>0).map(r=>{
 const a=f.u(r.x,r.y),b=f.u(r.x+r.w,r.y+r.h),u=(a+b)/2,w=Math.abs(b-a),base=r.floor*FLOOR_HEIGHT;
 return <group key={r.id} position={f.at(u,base,0)} rotation={[0,f.turn,0]}>
 <Block position={[0,-.17,0]} size={[w+.38,.34,.7]} color="#eee7da" surface="limestone"/>
 {[-1,1].map(s=><Block key={s} position={[s*(w/2-.2),4.2,.27]} size={[.36,8.4,.6]} color="#e9e4d7" surface="paint"/>)}
 <Block position={[0,8.23,1.65]} size={[w,.4,3.8]} color="#71563c" surface="timber"/>
 {Array.from({length:Math.max(2,Math.floor(w/1.1))},(_,i)=><Block key={'rib'+i} position={[-w/2+.5+i*1.1,8,1.65]} size={[.1,.18,3.5]} color="#aa8255" surface="timber"/>)}
 {[-.3,.3].map(t=><group key={t}><mesh position={[w*t,7.85,1.8]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[.17,18]}/><meshStandardMaterial color="#fff3d1" emissive="#ffd69c" emissiveIntensity={2}/></mesh>{r.floor<5&&<pointLight position={[w*t,7.4,1.8]} color="#ffe0b4" intensity={24} distance={10} decay={2}/>}</group>)}
 <Block position={[-w*.32,.38,1.1]} size={[Math.min(3,w*.2),.65,.75]} color="#aaa290" surface="stone"/>
 <AssetModel category="plant" assets={assets} position={[-w*.32,.74,1.1]} size={[1.3,2.2,1.1]}/>
 </group>;})}
 {!pitched&&<group position={f.at(f.length*.5,(plan.levels||1)*FLOOR_HEIGHT+.45,-.1)} rotation={[0,f.turn,0]}><Block position={[0,0,0]} size={[f.length+.7,.68,.7]} color="#e8e3d8"/><Block position={[0,-.39,-.06]} size={[f.length,.1,.72]} color="#585c53"/></group>}
 {entry&&[entryU-entry.width*.75,entryU+entry.width*.75].map((u,i)=>light(u,5.6,-.25,'entry-'+i))}
 </group>;
}
export function EntryGarden({plan,layout,assets}:{plan:Plan;layout:HouseLayout;assets:Asset[]}){
 const e=entrancePose(plan,layout),poly=plan.site?.polygon;
 if(!poly)return null;
 let distance=0;for(let d=.2;d<40;d+=.2){if(!pointInPolygon({x:e.x+plan.offsetX+e.n[0]*d,y:e.z+plan.offsetY+e.n[1]*d},poly))break;distance=d;}
 if(distance<1)return null;
 const angle=Math.atan2(e.n[0],e.n[1]),roadFacing=plan.design?.twoDoors?plan.design.outerFacing:plan.design?.houseFacing||plan.roadSide;
 const roadEdge=poly.findIndex(p=>p.road);const a=poly[roadEdge],b=poly[(roadEdge+1)%poly.length];
 const path=<group position={[e.x,GROUND_LEVEL,e.z]} rotation={[0,angle,0]}>{[0,1,2].map(i=>{const top=1.5-i*.5;return <Block key={i} position={[0,top/2,(i+.5)*.9]} size={[3.9,top,.9]} color="#d8d4c8" surface="limestone"/>;})}<Block position={[0,-.005,distance/2]} size={[3.9,.1,distance]} color="#f2eee4" surface="pavers"/>{[-1,1].filter(()=>distance>3).map(s=><group key={s} position={[s*2.9,0,Math.min(distance/2,2.4)]}><Block position={[0,.35,0]} size={[.85,.7,Math.min(3,distance-1)]} color="#b6aea0" surface="stackstone"/><AssetModel category="plant" assets={assets} position={[0,.7,0]} size={[.8,1.9,.8]}/></group>)}</group>;
 if(!a||roadFacing!==plan.roadSide)return path;
 const dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
 const along=(x:number,z:number)=>(x+plan.offsetX-a.x)*ux+(z+plan.offsetY-a.y)*uz;
 const parking=plan.rooms.find(r=>r.kind==='portico'&&r.floor===0),openings:[[number,number],...Array<[number,number]>]=[[Math.max(0,along(e.x,e.z)-2.2),Math.min(len,along(e.x,e.z)+2.2)]];
 if(parking){const u=along(parking.x+parking.w/2,parking.y+parking.h/2);openings.push([Math.max(0,u-4.2),Math.min(len,u+4.2)]);}
 const spans=openings.sort((a,b)=>a[0]-b[0]),merged:Array<[number,number]>=[];for(const s of spans){const last=merged.at(-1);if(last&&s[0]<=last[1])last[1]=Math.max(last[1],s[1]);else merged.push([...s]);}
 const solids:Array<[number,number]>=[];let start=0;for(const [u,v] of merged){if(u>start+.1)solids.push([start,u]);start=v;}if(start<len)solids.push([start,len]);
 return <group>{path}<group position={[a.x-plan.offsetX,GROUND_LEVEL,a.y-plan.offsetY]} rotation={[0,-Math.atan2(dz,dx),0]}>
 {solids.map(([u,v],i)=><group key={i}><Block position={[(u+v)/2,1.5,0]} size={[v-u,3,.4]} color="#e0d9c9" surface="paint"/><Block position={[(u+v)/2,3.08,0]} size={[v-u+.1,.16,.65]} color="#8b8d81" surface="stone"/></group>)}
 {merged.flat().map((u,i)=><Block key={i} position={[u,1.95,0]} size={[.62,3.9,.7]} color="#c2ae91" surface="stackstone"/>)}
 {merged.flat().map((u,i)=><group key={'gate'+i} position={[u,1.55,(i%2?1:-1)*.1]} rotation={[0,(i%2?-1:1)*Math.PI*.48,0]}>{Array.from({length:7},(_,j)=><Block key={j} position={[(i%2?-1:1)*j*.15,0,0]} size={[.07,2.8,.08]} color="#4c514c" metalness={.65}/>)}</group>)}
 </group></group>;
}
