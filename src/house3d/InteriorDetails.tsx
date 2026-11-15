import {kitchenCounter} from './furniture';
import {FLOOR_HEIGHT} from '../building-dimensions';
import {useEffect,useMemo,useRef} from 'react';
import {useTexture} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {type Group,LatheGeometry,RepeatWrapping,SRGBColorSpace,Vector2} from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {Block} from './Surface';
import {showerZone,tvJoinery} from './interior-layout';
import type {Room} from '../types';
import type {HouseLayout} from './layout';
type V=[number,number,number];
function Soft({size,position,color='#e8e2d4',metal=0,rough=.42}:{size:V;position:V;color?:string;metal?:number;rough?:number}){
 const g=useMemo(()=>new RoundedBoxGeometry(...size,2,Math.min(.045,...size.map(v=>v/4))),[...size]);useEffect(()=>()=>g.dispose(),[g]);
 return <mesh geometry={g} position={position} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={rough} metalness={metal} clearcoat={metal?0:.22} clearcoatRoughness={.2}/></mesh>;
}
function Tube({position,radius=.035,height=.4,rotation=[0,0,0],color='#dce0df',metal=1}:{position:V;radius?:number;height?:number;rotation?:V;color?:string;metal?:number}){
 return <mesh position={position} rotation={rotation} castShadow receiveShadow><cylinderGeometry args={[radius,radius,height,20]}/><meshPhysicalMaterial color={color} roughness={metal?.14:.4} metalness={metal} clearcoat={.25}/></mesh>;
}
function Vessel({position,scale=1,color='#d6c5ab',profile='vase'}:{position:V;scale?:number;color?:string;profile?:'vase'|'bowl'|'cup'}){
 const g=useMemo(()=>new LatheGeometry((profile==='bowl'?[[0,0],[.18,0],[.28,.08],[.38,.2],[.36,.23],[.29,.13],[.14,.05],[0,.05]]:profile==='cup'?[[0,0],[.16,0],[.19,.32],[.16,.34],[.14,.05],[0,.05]]:[[0,0],[.16,0],[.24,.18],[.23,.38],[.13,.57],[.13,.65],[.1,.65],[.1,.55],[.18,.35],[.16,.09],[0,.07]]).map(p=>new Vector2(...p as [number,number])),32),[profile]);
 useEffect(()=>()=>g.dispose(),[g]);
 return <mesh geometry={g} position={position} scale={scale} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={.26} clearcoat={.35}/></mesh>;
}
function Books({position}:{position:V}){return <group position={position}>{['#7b8274','#d3b588','#e5dbcc','#554a3e'].map((c,i)=><Soft key={c} position={[-.24+i*.15,.28,0]} size={[.12,.5+i%2*.09,.32]} color={c} rough={.86}/>)}</group>;}
export function TVJoinery({room}:{room:Room}){
 const j=tvJoinery(room),base=room.floor*FLOOR_HEIGHT,z=room.y+.5,w=j.width;
 return <group name="TV storage and showcase" position={[j.x,base,z]}>
  <Block position={[0,3.45,-.25]} size={[w,6.5,.13]} color="#d8d0bd" surface="quartz"/>
  <Block solid position={[0,.92,.35]} size={[w,1.38,1.12]} color="#84674e" surface="timber"/>
  <Block position={[0,1.66,.35]} size={[w+.08,.13,1.18]} color="#dcd8ca" surface="quartz"/>
  {[0,1,2].map(i=><group key={i}><Block position={[-w/2+(i+.5)*w/3,.95,.935]} size={[w/3-.065,1.2,.07]} color="#b79d7b" surface="timber"/><Soft position={[-w/2+(i+.5)*w/3,1.24,.993]} size={[.6,.025,.04]} color="#574d3e" metal={.8}/></group>)}
  <Block position={[0,.19,.3]} size={[w-.3,.06,.85]} color="#fff0c4" emissive="#ffcd7f"/>
  {!j.showcase&&<group><Block position={[0,5.65,.15]} size={[w,.08,.7]} color="#b79c78" surface="timber"/><Books position={[-.7,5.7,.12]}/><Vessel position={[.8,5.7,.12]} color="#859386"/></group>}
  {j.showcase&&[-1,1].map(side=><group key={side} position={[side*(w/2-.55),0,0]}>
   {[-.5,.5].map(x=><Block key={x} position={[x,4.1,.17]} size={[.075,4.9,.7]} color="#b69c79" surface="timber"/>)}
   {[1.8,3.1,4.45,5.8,6.55].map((y,i)=><group key={y}><Block position={[0,y,.17]} size={[1.08,.075,.72]} color="#b69c79" surface="timber"/>{i<4&&<Block position={[0,y+.06,-.02]} size={[.83,.023,.1]} color="#ffdfaa" emissive="#ffd08b"/>}</group>)}
   <Vessel position={[0,1.86,.13]} scale={1.2} color="#b99472"/><Books position={[0,3.16,.12]}/><Vessel position={[0,4.51,.1]} scale={1.3} color={side<0?'#6c7c70':'#dcd6c9'}/><Vessel profile="bowl" position={[0,5.86,.1]} scale={1.2}/>
  </group>)}
 </group>;
}
export function WovenRug({x,z,w,d,base}:{x:number;z:number;w:number;d:number;base:number}){
 const loaded=useTexture(['/assets/materials/rug-color.jpg','/assets/materials/rug-normal.jpg','/assets/materials/rug-roughness.jpg']);
 const maps=useMemo(()=>loaded.map((t,i)=>{const c=t.clone();c.wrapS=c.wrapT=RepeatWrapping;c.anisotropy=8;if(!i)c.colorSpace=SRGBColorSpace;c.needsUpdate=true;return c;}),[loaded]);useEffect(()=>()=>maps.forEach(t=>t.dispose()),[maps]);
 return <group name="Woven rug" position={[x,base+.085,z]}><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[w,d]}/><meshStandardMaterial map={maps[0]} normalMap={maps[1]} normalScale={new Vector2(.5,.5)} roughnessMap={maps[2]}/></mesh>{[-1,1].map(side=><group key={side}>{Array.from({length:32},(_,i)=><Block key={i} position={[-w/2+(i+.5)*w/32,0,side*(d/2+.045)]} size={[.025,.014,.12]} color="#c7bca7"/>)}</group>)}</group>;
}
export function KitchenDetails({room,hasWindows=false}:{room:Room;hasWindows?:boolean}){
 const q=kitchenCounter(room),cx=q.x,z=q.z,base=room.floor*FLOOR_HEIGHT;
 // Small objects stay in the dry preparation zone to the left of the sink; no objects on the hob.
 const x=q.start+.65;
 return <group name="Kitchen worktop details">
  <Block position={[cx,base+(hasWindows?3.2:4.13),room.y+room.h-.17]} size={[q.w,hasWindows?.2:2,.045]} color="#f2ede1" surface="bathwall"/>
  <Block position={[cx,base+2.9,room.y+room.h-1.69]} size={[q.w-.1,.04,.08]} color="#fff2d2" emissive="#ffd2a1"/>
  {q.w>6.7&&<group position={[x,base+3.09,z]}>
   <Soft position={[0,.025,.1]} size={[.8,.055,.75]} color="#bb986b" rough={.7}/>
   <Tube position={[-.22,.3,-.32]} radius={.19} height={.55} color="#dcd9cc" metal={0}/><Tube position={[-.22,.59,-.32]} radius={.195} height={.055} color="#9c754e" metal={0}/>
   <Tube position={[.3,.24,-.32]} radius={.16} height={.44} color="#ebe6d8" metal={0}/><Tube position={[.3,.48,-.32]} radius={.165} height={.04} color="#9c754e" metal={0}/>
   <Vessel profile="cup" position={[0,.06,.24]} color="#687c75"/>
   <Tube position={[-.35,.52,-.31]} radius={.012} height={.66} rotation={[0,0,-.15]} color="#8e694b" metal={0}/>
  </group>}
  <group position={[q.hobX,base+3.12,z]}><Tube position={[0,.17,0]} radius={.32} height={.34} color="#b7babb"/><Tube position={[0,.36,0]} radius={.33} height={.035}/><Soft position={[.4,.2,0]} size={[.3,.075,.08]} color="#2e3431"/><Soft position={[0,.41,0]} size={[.14,.075,.09]} color="#333936"/></group>
 </group>;
}
export function DiningDetails({x,z,w,d,base}:{x:number;z:number;w:number;d:number;base:number}){
 return <group name="Dining place settings" position={[x,base+2.65,z]}>{[-1,1].flatMap(side=>[-1,1].map(row=><group key={side+'-'+row} position={[side*w*.31,0,row*d*.26]}><Soft size={[.78,.018,.7]} position={[0,0,0]} color="#b5a98f" rough={1}/><Tube radius={.26} height={.026} position={[0,.028,0]} color="#f5f3eb" metal={0}/><Vessel profile="cup" position={[0,.045,-.13]} scale={.55} color="#eee9dd"/></group>))}<Vessel profile="bowl" position={[0,.02,0]} scale={1.2} color="#8a9b88"/></group>;
}
export function BathroomDetails({room,layout}:{room:Room;layout:HouseLayout}){
 const s=showerZone(room,layout);if(!s)return null;const base=room.floor*FLOOR_HEIGHT,bz=-s.depth/2+.15;
 return <group name="Shower bucket and soap holder" position={[s.x,base+.08,s.z]} rotation={[0,s.angle,0]}>
  <Tube position={[0,4.75,bz+.07]} radius={.03} height={4.0}/>
  <Tube position={[0,6.76,bz+.35]} radius={.03} height={.56} rotation={[Math.PI/2,0,0]}/>
  <mesh position={[0,6.69,bz+.65]} castShadow><cylinderGeometry args={[.33,.33,.035,36]}/><meshPhysicalMaterial color="#dfe3df" roughness={.13} metalness={1}/></mesh>
  {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/6)*.22,6.665,bz+.65+Math.sin(i*Math.PI/6)*.22]}><sphereGeometry args={[.018,6,6]}/><meshStandardMaterial color="#263331"/></mesh>)}
  <Soft position={[0,3.2,bz+.08]} size={[.55,.16,.15]} color="#ccd1cd" metal={1} rough={.13}/>
  {[-.19,.19].map(x=><Tube key={x} position={[x,3.23,bz+.2]} height={.17} radius={.065} rotation={[Math.PI/2,0,0]}/>)}
  <Tube position={[0,1.65,bz+.15]} height={.3} radius={.035} rotation={[Math.PI/2,0,0]}/>
  <Soft position={[.65,3.7,bz+.18]} size={[.54,.055,.33]} color="#d8dfdb" metal={1} rough={.15}/>
  <Soft position={[.65,3.76,bz+.19]} size={[.35,.085,.2]} color="#d2ddc2" rough={.55}/>
  <Bucket position={[.48,0,bz+.7]}/>
  <Soft position={[0,.012,.7]} size={[.35,.018,.35]} color="#808e8a" metal={1}/>{[-.1,0,.1].map(x=><Block key={x} position={[x,.025,.7]} size={[.025,.005,.27]} color="#353e39"/>)}
 </group>;
}
function Bucket({position}:{position:V}){
 const g=useMemo(()=>new LatheGeometry([[0,0],[.32,0],[.43,.78],[.4,.8],[.29,.055],[0,.055]].map(v=>new Vector2(...v as [number,number])),40),[]);useEffect(()=>()=>g.dispose(),[g]);
 return <group position={position}><mesh geometry={g} castShadow receiveShadow><meshPhysicalMaterial color="#bdcfca" roughness={.3} clearcoat={.3}/></mesh><mesh position={[0,.78,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.41,.018,8,40]}/><meshStandardMaterial color="#f0f3eb"/></mesh><mesh position={[0,.66,0]}><torusGeometry args={[.41,.018,8,32,Math.PI]}/><meshStandardMaterial color="#919d97" roughness={.25} metalness={.8}/></mesh><Vessel position={[.13,.26,0]} scale={.85} profile="cup" color="#dce4dc"/></group>;
}
export function KitchenSink({position}:{position:V}){
 return <group name="Stainless sink and mixer" position={position}>
  <Soft position={[0,0,0]} size={[2.15,.065,1.4]} color="#bbc2be" metal={1} rough={.21}/>
  <Soft position={[0,.041,0]} size={[1.83,.014,1.12]} color="#343e3b" metal={.85} rough={.26}/>
  <Soft position={[0,.052,0]} size={[1.6,.014,.9]} color="#697770" metal={1} rough={.28}/>
  <Tube position={[0,.065,0]} radius={.075} height={.012}/>
  <Tube position={[.75,.46,-.51]} radius={.032} height={.85}/>
  <mesh position={[.52,.88,-.51]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[.23,.032,10,32,Math.PI]}/><meshPhysicalMaterial color="#d4dcd6" metalness={1} roughness={.12}/></mesh>
  <Tube position={[.29,.83,-.51]} radius={.033} height={.13}/>
  <Soft position={[.79,.39,-.51]} size={[.21,.04,.045]} color="#c7d0c8" metal={1}/>
 </group>;
}
export function VanityDetails({depth}:{depth:number}){
 return <group name="Vanity accessories"><Soft position={[.62,2.36,-depth/2+.4]} size={[.15,.32,.15]} color="#81978b"/><Tube position={[.62,2.55,-depth/2+.4]} radius={.025} height={.08}/><Soft position={[.67,2.6,-depth/2+.4]} size={[.14,.035,.045]} color="#b5bfba" metal={1}/><Soft position={[-.63,2.34,-depth/2+.32]} size={[.29,.06,.2]} color="#e6d7c2"/></group>;
}


export function KitchenStorage({room,open}:{room:Room;open:boolean}){
 const q=kitchenCounter(room),w=q.w,n=Math.max(1,Math.floor(w/2.1)),base=room.floor*FLOOR_HEIGHT,z=room.y+room.h-.85;
 return <group name="Kitchen base cabinets" userData={{solid:true}}>
  <Block position={[q.x,base+.16,z]} size={[w,.16,1.7]} color="#665244" surface="timber"/>
  <Block position={[q.x,base+1.5,z+.78]} size={[w,2.8,.1]} color="#b69b76" surface="timber"/>
  <Block position={[q.x,base+1.45,z]} size={[w,.07,1.6]} color="#c0ae8e" surface="timber"/>
  {Array.from({length:n+1},(_,i)=><Block key={i} position={[q.start+i*w/n,base+1.5,z]} size={[.065,2.8,1.7]} color="#b99f7b" surface="timber"/>)}
  {Array.from({length:n},(_,i)=><KitchenLeaf key={i} position={[q.start+i*w/n,base,z-.87]} width={w/n-.065} open={open}/>)}
 </group>;
}
function KitchenLeaf({position,width,open}:{position:V;width:number;open:boolean}){
 const ref=useRef<Group>(null);useFrame((_,dt)=>{if(ref.current)ref.current.rotation.y+=((open?1.3:0)-ref.current.rotation.y)*Math.min(1,dt*5);});
 return <group ref={ref} position={position}><Block position={[width/2,1.52,0]} size={[width,2.58,.065]} color="#cbb898" surface="timber"/><Soft position={[width*.78,2.52,-.07]} size={[Math.min(.5,width*.4),.04,.1]} color="#5e584c" metal={.8}/></group>;
}
