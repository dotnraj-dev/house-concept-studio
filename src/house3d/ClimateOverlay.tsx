import {useFrame} from '@react-three/fiber';
import {useMemo,useRef} from 'react';
import {CatmullRomCurve3,Vector3,type Mesh} from 'three';
import type {V3} from './climate';
function Path({points}:{points:V3[]}){
 const bead=useRef<Mesh>(null),curve=useMemo(()=>new CatmullRomCurve3(points.map(p=>new Vector3(...p)),false,'catmullrom',0),[points]);
 useFrame(({clock})=>{if(bead.current)curve.getPointAt((clock.elapsedTime*.16)%1,bead.current.position);});
 return <group><mesh><tubeGeometry args={[curve,Math.max(12,points.length*7),.075,5,false]}/><meshBasicMaterial color="#14889b" transparent opacity={.8}/></mesh><mesh ref={bead}><sphereGeometry args={[.22,8,6]}/><meshBasicMaterial color="#7bf9ff"/></mesh></group>;
}
export function ClimateOverlay({paths,shift}:{paths:V3[][];shift:V3}){return <group position={shift}>{paths.map((p,i)=><Path points={p} key={i}/>)}</group>;}
