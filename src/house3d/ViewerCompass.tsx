import {useRef,type RefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Vector3} from 'three';
import {headingDegrees,facingLabel,compassRotation} from './compass';
export function ViewerCompass({target}:{target:RefObject<HTMLDivElement|null>}){
 const direction=useRef(new Vector3()),last=useRef(0);
 useFrame(({camera})=>{
  const now=performance.now();if(!target.current||now-last.current<60)return;last.current=now;
  camera.getWorldDirection(direction.current);const h=headingDegrees(direction.current.x,direction.current.z);
  const ring=target.current.querySelector<SVGGElement>('.compass-ring'),label=target.current.querySelector('.compass-heading');
  ring?.setAttribute('transform','rotate('+compassRotation(h)+' 50 50)');
  if(label)label.textContent='Facing '+facingLabel(h);
  target.current.dataset.heading=h.toFixed(1);
 });return null;
}
