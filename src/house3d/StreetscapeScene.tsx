import {useMemo,useEffect,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group,Vector3} from 'three';
import type {Plan} from '../types';
import {CEILING_LEVEL,FLOOR_HEIGHT} from '../building-dimensions';
import {buildStreetscape} from './streetscape';
import {faceContext} from './facade-kit/layout';
import {makeHouseLayout} from './layout';
import {LibraryModel} from './Assets';
export function Streetscape({plan,wetRoad=false}:{plan:Plan;wetRoad?:boolean}){
 const model=useMemo(()=>buildStreetscape(plan,wetRoad),[plan,wetRoad]);
 const face=useMemo(()=>faceContext(plan,makeHouseLayout(plan)),[plan]);
 const group=useRef<Group>(null),direction=useMemo(()=>new Vector3(),[]);
 useFrame(({camera})=>{if(!group.current)return;
  const x=camera.position.x+plan.width/2,z=camera.position.z+plan.depth/2;
  const inside=x>0&&x<plan.width&&z>0&&z<plan.depth&&camera.position.y>0&&camera.position.y<(plan.levels||1)*FLOOR_HEIGHT+CEILING_LEVEL;
  camera.getWorldDirection(direction);
  const towardWindow=(x<9&&direction.x<-.12)||(x>plan.width-9&&direction.x>.12)||(z<9&&direction.z<-.12)||(z>plan.depth-9&&direction.z>.12);
  group.current.visible=!inside||towardWindow;
 });
 useEffect(()=>()=>model.dispose(),[model]);
 const lamp=face.at(-8,0,-7),left=face.at(1.3,0,1.5),right=face.at(face.length-1.3,0,1.5);
 return <group ref={group} userData={{noBatch:true,runtimeVisibilityGate:true}}><primitive object={model.root}/>
  <LibraryModel file="streetlamp/street_lamp_01.glb" position={[lamp[0],lamp[1],lamp[2]]} size={[2.8,17,2.8]} solid={false}/>
  <LibraryModel file="shrub/shrub_01.glb" position={[left[0],left[1],left[2]]} size={[2.6,2.4,2.6]} solid={false}/>
  <LibraryModel file="shrub/shrub_02.glb" position={[right[0],right[1],right[2]]} size={[2.8,2.8,2.8]} solid={false}/>
 </group>;
}
