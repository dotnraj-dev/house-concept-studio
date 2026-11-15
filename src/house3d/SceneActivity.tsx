import {useEffect} from 'react';
import {useThree} from '@react-three/fiber';
/** Briefly render settling/closing animations, then stop spending GPU time on a static overview. */
export function SceneActivity({stamp}:{stamp:string}){
 const {invalidate}=useThree();
 useEffect(()=>{
  let frame=0;const until=performance.now()+1800;
  const tick=()=>{invalidate();if(performance.now()<until)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[invalidate,stamp]);
 return null;
}
