import {useMemo,useEffect} from 'react';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import type {Plan} from '../types';
import {FLOOR_HEIGHT,GROUND_LEVEL} from '../building-dimensions';
import type {Selection} from '../workspace-state';
/** Runtime selection ink and site north mark are excluded from GLB. */
export function SelectionOverlay({plan,selection}:{plan:Plan;selection:Selection}){
 const id=selection?.kind==='room'?selection.id:selection?.kind==='object'?selection.roomId:undefined;
 const rooms=plan.rooms.filter(r=>id?r.id===id:selection?.kind==='floor'&&r.floor===selection.floor);
 const geometry=useMemo(()=>{const p:number[]=[];for(const r of rooms){const x=r.x-plan.width/2,z=r.y-plan.depth/2,y=r.floor*FLOOR_HEIGHT+.11;for(const [a,b,c,d] of [[x,z,x+r.w,z],[x+r.w,z,x+r.w,z+r.h],[x+r.w,z+r.h,x,z+r.h],[x,z+r.h,x,z]])p.push(a,y,b,c,y,d);}return new BufferGeometry().setAttribute('position',new Float32BufferAttribute(p,3));},[plan,id,selection?.kind==='floor'?selection.floor:-1]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group userData={{runtimeOnly:true}} name="Selection and north overlay">
  <lineSegments geometry={geometry} renderOrder={10} raycast={()=>null}><lineBasicMaterial color="#4ba48b" transparent opacity={.68} depthTest={false}/></lineSegments>
  {rooms.filter(r=>r.kind!=='stairs').map(r=><mesh key={r.id} position={[r.x+r.w/2-plan.width/2,r.floor*FLOOR_HEIGHT+.10,r.y+r.h/2-plan.depth/2]} rotation={[-Math.PI/2,0,0]} raycast={()=>null}><planeGeometry args={[r.w-.1,r.h-.1]}/><meshBasicMaterial color="#50ac95" transparent opacity={.12} depthWrite={false}/></mesh>)}
  <group position={[-plan.width/2-plan.offsetX+1.5,GROUND_LEVEL+.08,-plan.depth/2-plan.offsetY+3.2]} rotation={[-Math.PI/2,0,0]}>
   <mesh raycast={()=>null}><shapeGeometry args={[northShape]}/><meshBasicMaterial color="#65736c" transparent opacity={.65} depthWrite={false}/></mesh>
  </group></group>;
}
import {Shape} from 'three';
const northShape=new Shape();northShape.moveTo(0,1.5);northShape.lineTo(-.5,-.2);northShape.lineTo(0,.1);northShape.lineTo(.5,-.2);northShape.closePath();
