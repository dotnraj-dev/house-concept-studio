import {CEILING_LEVEL} from '../building-dimensions';
import {FLOOR_HEIGHT} from '../building-dimensions';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Object3D,type PointLight,type SpotLight} from 'three';
import type {Plan} from '../types';
/** One high resolution interior shadow map follows the occupied room, independent of floor count. */
export function InteriorLighting({plan}:{plan:Plan}){
 const light=useRef<SpotLight>(null),fill=useRef<PointLight>(null),target=useMemo(()=>new Object3D(),[]);
 useFrame(({camera})=>{
  if(!light.current)return;
  const x=camera.position.x+plan.width/2,z=camera.position.z+plan.depth/2;
  const r=plan.rooms.find(r=>camera.position.y>r.floor*FLOOR_HEIGHT&&camera.position.y<r.floor*FLOOR_HEIGHT+CEILING_LEVEL&&x>r.x&&x<r.x+r.w&&z>r.y&&z<r.y+r.h&&!['stairs','portico','terrace'].includes(r.kind));
  light.current.intensity=r?(r.kind==='bathroom'?32:52):0;
  if(fill.current)fill.current.intensity=r?8:0;
  if(!r)return;
  const cx=r.x+r.w/2-plan.width/2,cz=r.y+r.h/2-plan.depth/2;
  light.current.position.set(cx,r.floor*FLOOR_HEIGHT+CEILING_LEVEL-.4,cz);fill.current?.position.set(cx,r.floor*FLOOR_HEIGHT+5.9,cz);target.position.set(cx,r.floor*FLOOR_HEIGHT+.15,cz);target.updateMatrixWorld();
 });
 return <group userData={{runtimeOnly:true}}><primitive object={target}/><pointLight ref={fill} color="#fff4e6" intensity={0} decay={2} distance={24}/><spotLight ref={light} target={target} color="#fff0da" intensity={0} angle={1.35} penumbra={.92} distance={28} decay={2} castShadow={false}/></group>;
}

