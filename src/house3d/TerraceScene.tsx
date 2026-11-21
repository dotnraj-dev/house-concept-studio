import {useMemo} from 'react';
import {ExtrudeGeometry,LatheGeometry,Path,Shape,Vector2} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {FLOOR_HEIGHT} from '../building-dimensions';
import type {Plan} from '../types';
import {externalStair,headroom,openTerraceDepth,pitchedRoof,roofTank,terraceLevel,terraceOptions} from '../terrace';
import type {HouseLayout} from './layout';

function Member({size,position,color='#e9e3d8',metalness=0,roughness=.68}:{size:[number,number,number];position:[number,number,number];color?:string;metalness?:number;roughness?:number}){
 const geometry=useMemo(()=>new RoundedBoxGeometry(...size,2,Math.min(.06,...size.map(v=>v/6))),[...size]);
 return <mesh geometry={geometry} position={position} castShadow receiveShadow><meshStandardMaterial color={color} metalness={metalness} roughness={roughness}/></mesh>;
}
export function TerraceScene({plan,layout,includeDeck=true}:{plan:Plan;layout:HouseLayout;includeDeck?:boolean}){
 const level=terraceLevel(plan),roof=level*FLOOR_HEIGHT,options=terraceOptions(plan),room=headroom(plan),stair=externalStair(plan),tank=roofTank(plan);
 const deck=useMemo(()=>{const shape=new Shape();shape.moveTo(-plan.width/2,-plan.depth/2);shape.lineTo(plan.width/2,-plan.depth/2);shape.lineTo(plan.width/2,plan.depth/2);shape.lineTo(-plan.width/2,plan.depth/2);shape.closePath();if(options.stairLocation==='internal'&&plan.rooms.some(r=>r.kind==='stairs')){const hole=new Path(),x=room.x-plan.width/2,z=plan.depth/2-room.y-room.h;hole.moveTo(x,z);hole.lineTo(x+room.w,z);hole.lineTo(x+room.w,z+room.h);hole.lineTo(x,z+room.h);hole.closePath();shape.holes.push(hole);}const g=new ExtrudeGeometry(shape,{depth:.32,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2});g.rotateX(-Math.PI/2);return g;},[plan.width,plan.depth,room.x,room.y,room.w,room.h,options.stairLocation]);
 const tankGeometry=useMemo(()=>new LatheGeometry([[0,0],[1.05,0],[1.25,.22],[1.25,2.8],[1.08,3.1],[.32,3.18],[0,3.18]].map(([x,y])=>new Vector2(x,y)),32),[]);
 const tankX=tank.x-plan.offsetX,tankZ=tank.y-plan.offsetY,tankY=roof+(options.tankMount==='headroom'?8.65:.44);
 const t=.24,door=2.9,h=8.2,cx=room.x+room.w/2,cz=room.y+room.h/2,sideDoor=!!stair&&options.stairLocation==='side',rearDoor=!!stair&&options.stairLocation!=='side',entryZ=Math.max(room.y+door/2+.35,Math.min(room.y+room.h-door/2-.35,(stair?.y||0)-(stair?.h||0)/2+1.8)),pitched=pitchedRoof(plan),rearDepth=pitched?openTerraceDepth(plan):0;
 return <group name="Walkable terrace, headroom and services">
  {includeDeck&&<mesh geometry={deck} position={[plan.width/2,roof+.08,plan.depth/2]} castShadow receiveShadow><meshStandardMaterial color="#dcd7c9" roughness={.83}/></mesh>}
  {pitched&&<><Member size={[.3,1.25,rearDepth]} position={[0,roof+1.05,plan.depth-rearDepth/2]}/><Member size={[.3,1.25,rearDepth]} position={[plan.width,roof+1.05,plan.depth-rearDepth/2]}/><Member size={[plan.width,1.25,.3]} position={[plan.width/2,roof+1.05,plan.depth]}/><Member size={[plan.width,1.25,.3]} position={[plan.width/2,roof+1.05,plan.depth-rearDepth]}/></>}
  <Member size={[room.w+.5,.27,room.h+.5]} position={[cx,roof+h+.12,cz]} color="#e8e1d3"/>
  {rearDoor?<>{[-1,1].map(sign=><Member key={'rear-'+sign} size={[(room.w-door)/2,h,t]} position={[cx+sign*(room.w+door)/4,roof+h/2,room.y+room.h]}/>)}<Member size={[door,h-7,t]} position={[cx,roof+7+(h-7)/2,room.y+room.h]}/></>:<Member size={[room.w,h,t]} position={[cx,roof+h/2,room.y+room.h]} />}
  <Member size={[t,h,room.h]} position={[room.x,roof+h/2,cz]}/>
  {sideDoor?<>{[[room.y,entryZ-door/2],[entryZ+door/2,room.y+room.h]].map(([a,b],i)=><Member key={'side-piece-'+i} size={[t,h,b-a]} position={[room.x+room.w,roof+h/2,(a+b)/2]}/>)}<Member size={[t,h-7,door]} position={[room.x+room.w,roof+7+(h-7)/2,entryZ]}/></>:<Member size={[t,h,room.h]} position={[room.x+room.w,roof+h/2,cz]}/>}
  {[-1,1].map(sign=><Member key={'front-'+sign} size={[(room.w-door)/2,h,t]} position={[cx+sign*(room.w+door)/4,roof+h/2,room.y]}/>)}
  <Member size={[door,h-7,t]} position={[cx,roof+7+(h-7)/2,room.y]}/>
  <group position={[cx-door/2,roof,room.y-.18]} rotation={[0,-Math.PI*.54,0]}><Member size={[door-.08,6.9,.13]} position={[(door-.08)/2,3.45,0]} color="#83694c"/><Member size={[.09,.5,.1]} position={[door-.45,3.3,-.12]} color="#c4ad77" metalness={.8}/></group>
  <Member size={[room.w+.8,.28,.7]} position={[cx,roof+h+.18,room.y-.3]} color="#c6b59d"/>
  {Array.from({length:8},(_,i)=><Member key={'louvre-'+i} size={[.12,.12,room.h-.7]} position={[room.x+.45+i*(room.w-.9)/8,roof+7.55,cz]} color="#8a7459"/>)}
  {Array.from({length:9},(_,i)=><Member key={'slope-'+i} size={[Math.max(.5,plan.width-3),.015,.035]} position={[plan.width/2,roof+.28,2+i*(plan.depth-4)/9]} color="#b8b3a6"/>)}
  <mesh rotation={[-Math.PI/2,0,0]} position={[plan.width-1.35,roof+.3,plan.depth-1.35]}><ringGeometry args={[.25,.42,16]}/><meshStandardMaterial color="#5f7472" metalness={.5} roughness={.38}/></mesh>
  <group name={`${tank.capacity} litre overhead tank`} position={[tankX,tankY,tankZ]}><mesh geometry={tankGeometry} position={[0,1.55,0]} castShadow><meshStandardMaterial color="#344d55" roughness={.56}/></mesh><Member size={[.9,.12,.9]} position={[0,3.22,0]} color="#283a40"/>{Array.from({length:7},(_,i)=><Member key={'ladder-rung-'+i} size={[.72,.065,.065]} position={[1.42,.35+i*.42,0]} color="#a0a6a2" metalness={.72}/>)}{[-.34,.34].map(x=><Member key={'ladder-rail-'+x} size={[.07,3.2,.07]} position={[1.42,1.55,x]} color="#a0a6a2" metalness={.72}/>)}</group>
  {Array.from({length:18},(_,i)=><group key={'screen-'+i}><Member size={[.09,3.8,.14]} position={[tankX-2.1+i*.25,tankY+2,tankZ-2.1]} color="#92775b"/><Member size={[.14,3.8,.09]} position={[tankX-2.1,tankY+2,tankZ-2.1+i*.25]} color="#92775b"/></group>)}
  {stair&&Array.from({length:level},(_,f)=>{const x=stair.x-stair.w/2,z=stair.y-stair.h/2,base=f*FLOOR_HEIGHT,spiral=options.stairType==='spiral';return <group key={f} name={`External ${options.stairType} stair · level ${f}`}>
   {spiral?Array.from({length:18},(_,i)=>{const angle=i*Math.PI*1.8/18,r=stair.w*.32;return <group key={i} position={[stair.x,base+(i+1)*FLOOR_HEIGHT/18,stair.y]} rotation={[0,-angle,0]}><Member size={[r,.16,1.05]} position={[r/2,0,0]} color="#c5b8a0"/></group>;}):<>{Array.from({length:9},(_,i)=><group key={i}><Member size={[stair.w/2-.3,.18,(stair.h-4)/9]} position={[x+stair.w*.25,base+(i+1)*FLOOR_HEIGHT/18,z+2+(i+.5)*(stair.h-4)/9]} color="#c6b8a2"/><Member size={[stair.w/2-.3,.18,(stair.h-4)/9]} position={[x+stair.w*.75,base+FLOOR_HEIGHT/2+(i+1)*FLOOR_HEIGHT/18,z+stair.h-2-(i+.5)*(stair.h-4)/9]} color="#c6b8a2"/></group>)}<Member size={[stair.w,.25,3.8]} position={[stair.x,base+FLOOR_HEIGHT/2,z+stair.h-1.9]} color="#c6b8a2"/></>}
   <Member size={[stair.w,.24,3.6]} position={[stair.x,base+FLOOR_HEIGHT,z+1.8]} color="#c6b8a2"/>
   <Member size={[.08,FLOOR_HEIGHT,stair.h]} position={[x+.1,base+FLOOR_HEIGHT/2,stair.y]} color="#5b625d" metalness={.65}/>
   <Member size={[.08,FLOOR_HEIGHT,stair.h]} position={[x+stair.w-.1,base+FLOOR_HEIGHT/2,stair.y]} color="#5b625d" metalness={.65}/>
  </group>})}
  {stair&&Array.from({length:level},(_,i)=>i+1).map(f=>{const door=layout.doors.find(d=>d.floor===f&&d.unitEntrance),edge=options.stairLocation==='front'?'front':options.stairLocation==='rear'?'rear':'side',y=f*FLOOR_HEIGHT-.08,z=door?(door.axis==='z'?door.z+door.width/2:door.z):stair.y-stair.h/2+1.8;return <group key={'bridge-'+f} name={f===level?'Terrace access landing':`Unit ${f} independent landing`}>{edge==='side'?<><Member size={[Math.max(1,stair.x-stair.w/2-plan.width+1),.24,3.2]} position={[(plan.width+stair.x-stair.w/2)/2,y,z]} color="#c8bba4"/><Member size={[3,.24,Math.abs(z-(stair.y-stair.h/2+1.8))+3]} position={[stair.x-stair.w/2+.8,y,(z+stair.y-stair.h/2+1.8)/2]} color="#c8bba4"/></>:<Member size={[3.2,.24,Math.max(1,edge==='front'?-(stair.y+stair.h/2):stair.y-stair.h/2-plan.depth)+1]} position={[stair.x,y,edge==='front'?(stair.y+stair.h/2)/2:(plan.depth+stair.y-stair.h/2)/2]} color="#c8bba4"/>}</group>;})}
 </group>;
}
