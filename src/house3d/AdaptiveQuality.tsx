import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {QUALITY,nextQuality,type QualityChoice,type QualityLevel} from './viewer-quality';
import type {Light,Object3D} from 'three';
/** Samples actual rendered frame intervals, excluding loading, warmup and background tabs.
 * Demand-rendered idle time is never counted as bad performance. No geometry is rebuilt.
 */
export function AdaptiveQuality({sceneVersion,moving,stamp,choice,level,ready,onSample,onLevel}:{sceneVersion:object;moving:boolean;stamp:string;choice:QualityChoice;level:QualityLevel;ready:boolean;onSample:(fps:number)=>void;onLevel:(level:QualityLevel)=>void}){
 const {gl,scene,invalidate}=useThree(),shadowUntil=useRef(0),sample=useRef({start:0,last:0,count:0,sum:0,windows:0,slow:0}),began=useRef(0),active=useRef(true);
 useEffect(()=>{sample.current={start:0,last:0,count:0,sum:0,windows:0,slow:0};began.current=0;active.current=true;invalidate();},[choice,ready,level,stamp,sceneVersion]);
 useEffect(()=>{const restore: Array<[Object3D,boolean]>=[];scene.traverse(o=>{if(o.name.startsWith('Distant ')){restore.push([o,o.visible]);o.visible=QUALITY[level].distant;}
 const l=o as Light & {shadow?:{mapSize:{width:number;height:number;set:(x:number,y:number)=>void};map?:{dispose:()=>void}|null;needsUpdate:boolean}};
 if(l.isLight&&l.shadow){const size=o.type==='DirectionalLight'?QUALITY[level].shadow:Math.min(1024,QUALITY[level].shadow);if(l.shadow.mapSize.width!==size){l.shadow.map?.dispose();l.shadow.map=null;l.shadow.mapSize.set(size,size);l.shadow.needsUpdate=true;}}});
 gl.shadowMap.needsUpdate=true;invalidate();return()=>restore.forEach(([o,v])=>o.visible=v);
 },[level,scene,gl,ready,stamp,sceneVersion]);
 useEffect(()=>{shadowUntil.current=performance.now()+1900;gl.shadowMap.needsUpdate=true;return()=>{gl.shadowMap.autoUpdate=true;};},[level,moving,stamp,ready,gl,sceneVersion]);
 useFrame(()=>{
  // Static overview shadows are reused after animations settle. High and walk/tour
  // retain live maps. This changes render scheduling, never the house or export.
  // Sun and building geometry are static between edits. Reuse their shadow map while walking.
  gl.shadowMap.autoUpdate=performance.now()<shadowUntil.current;
  if(!ready||!active.current||document.hidden)return;
  const now=performance.now();if(!began.current)began.current=now;
  invalidate();if(now-began.current<1600){sample.current.last=now;return;}
  const s=sample.current;if(!s.start)s.start=now;
  if(s.last){s.sum+=now-s.last;s.count++;}s.last=now;
  if(now-s.start<2400)return;
  const fps=Math.round(s.count*1000/Math.max(1,s.sum)*10)/10;onSample(fps);
  s.windows++;s.slow=fps<40?s.slow+1:0;s.start=now;s.count=0;s.sum=0;
  // Two sustained windows below target before stepping down; never raise automatically.
  const next=nextQuality(level,fps);
  if(choice==='auto'&&next!==level&&s.slow>=2){onLevel(next);return;}
  if(s.windows>=2)active.current=false;
 });return null;
}
