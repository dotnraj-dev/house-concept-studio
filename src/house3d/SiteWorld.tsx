import {Streetscape} from './StreetscapeScene';
import {useMemo,useEffect,Suspense} from 'react';
import {BufferGeometry,Float32BufferAttribute,DoubleSide,RepeatWrapping,SRGBColorSpace} from 'three';
import {useTexture} from '@react-three/drei';
import {surroundings} from '../site-context';
import type {Plan} from '../types';
import {StreetTree} from './StreetTree';
type Vec=[number,number,number];
export function SiteFinish({type,repeat,color='#ffffff'}:{type:string;repeat:[number,number];color?:string}){
 const [src,norm]=useTexture(['/assets/materials/'+type+'-color.jpg','/assets/materials/'+type+'-normal.jpg']);
 const maps=useMemo(()=>[src,norm].map((s,i)=>{const m=s.clone();m.wrapS=m.wrapT=RepeatWrapping;m.repeat.set(...repeat);if(!i)m.colorSpace=SRGBColorSpace;m.anisotropy=4;m.needsUpdate=true;return m;}),[src,norm,...repeat]);
 useEffect(()=>()=>maps.forEach(m=>m.dispose()),[maps]);return <meshStandardMaterial color={color} map={maps[0]} normalMap={maps[1]} roughness={.85} side={DoubleSide}/>;
}
function Box({at,size,color,surface}:{at:Vec;size:Vec;color:string;surface?:string}){return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/>{surface?<Suspense fallback={<meshStandardMaterial color={color}/>}><SiteFinish type={surface} repeat={[size[0]/5,Math.max(size[1],size[2])/5]} color={color}/></Suspense>:<meshStandardMaterial color={color} roughness={.77}/>}</mesh>;}
/** Closed hipped roof with world-scale UVs and a real ridge above the outer eaves. */
export function HipRoof({w,d,base,pitch,eave,color}:{w:number;d:number;base:number;pitch:number;eave:number;color:string}){
 const geo=useMemo(()=>{const a=w/2+eave,b=d/2+eave,h=Math.min(a,b)*pitch,rx=Math.max(0,a-b),rz=Math.max(0,b-a);
 const pos:number[]=[],uv:number[]=[];const face=(p:Vec,q:Vec,r:Vec,u:Vec)=>{for(const pt of [p,q,r]){pos.push(...pt);uv.push((pt[0]*u[0]+pt[2]*u[2])/3,pt[1]*Math.hypot(1,pitch)/(pitch*3));}};
 const A:Vec=[-a,0,-b],B:Vec=[a,0,-b],C:Vec=[a,0,b],D:Vec=[-a,0,b],N:Vec=[-rx,h,-rz],S:Vec=[rx,h,rz];
 const edges:[Vec,Vec,Vec,Vec][]=[[A,B,N,rx?S:N],[B,C,rz?N:S,S],[C,D,S,rx?N:S],[D,A,rz?S:N,N]];
 for(const [p,q,r,t] of edges){const l=Math.hypot(q[0]-p[0],q[2]-p[2]),u:Vec=[(q[0]-p[0])/l,0,(q[2]-p[2])/l];face(q,p,r,u);if(r!==t)face(q,r,t,u);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
 },[w,d,pitch,eave]);useEffect(()=>()=>geo.dispose(),[geo]);return <group position={[w/2,base,d/2]}><Box at={[0,0,0]} size={[w+2*eave,.23,d+2*eave]} color="#674f3f"/>{Math.abs(w-d)>.5&&<Box at={[0,Math.min(w/2+eave,d/2+eave)*pitch+.02,0]} size={[Math.max(.24,w-d),.22,Math.max(.24,d-w)]} color="#9d7157"/>}<mesh geometry={geo} castShadow receiveShadow><Suspense fallback={<meshStandardMaterial color={color} side={DoubleSide}/>}><SiteFinish type="clayroof" color={color} repeat={[1,1]}/></Suspense></mesh></group>;
}
function Neighbour({w,d,h,building}:{w:number;d:number;h:number;building:boolean}){
 const floors=Math.max(1,Math.min(6,Math.round(h/10))),cols=Math.max(1,Math.min(4,Math.floor(w/6)));
 return <group><Box at={[0,h/2,0]} size={[w,h,d]} color={building?'#d8d4c9':'#dfcdb5'}/>
 {Array.from({length:floors},(_,f)=><group key={f}><Box at={[0,(f+1)*h/floors-.16,0]} size={[w+.55,.32,d+.55]} color="#c6bca7"/>
 {[-1,1].map(sign=><group key={sign}>{Array.from({length:cols},(_,i)=><group key={i} position={[w*((i+.5)/cols-.5),(f+.55)*h/floors,sign*(d*.5+.075)]}><Box at={[0,0,0]} size={[Math.min(3,w*.6),Math.min(3.8,h*.42),.17]} color="#665e53"/><Box at={[0,0,sign*.1]} size={[Math.min(2.7,w*.5),Math.min(3.4,h*.34),.08]} color="#93a8a5"/><Box at={[0,Math.min(2.1,h*.23),0]} size={[Math.min(4,w*.78),.16,.9]} color="#b4a793"/></group>)}</group>)}</group>)}
 {!building&&<group position={[-w/2,0,-d/2]}><HipRoof w={w} d={d} base={h+.15} pitch={.36} eave={.65} color="#cda287"/></group>}</group>;
}
export function SiteWorld({plan}:{plan:Plan}){return <Streetscape plan={plan}/>;}
