import {FLOOR_HEIGHT} from '../building-dimensions';
import {useEffect,useMemo,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {PlaneGeometry,type ShaderMaterial,type Object3D,type WebGLRenderer,type Scene,type Camera} from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {bathroomFixtures} from './bathroom';
import type {HouseLayout} from './layout';
import type {Plan,Room} from '../types';

/** At most one floor and one vanity reflection, confined to the occupied room. */
function ReflectedPlane({position,rotation,width,height,floor=false}:{position:[number,number,number];rotation:[number,number,number];width:number;height:number;floor?:boolean}){
 const plane=useMemo(()=>{
  const baseShader=(Reflector as unknown as {ReflectorShader:{uniforms:Record<string,{value:unknown}>;vertexShader:string;fragmentShader:string}}).ReflectorShader;
  const shader={...baseShader,uniforms:{...baseShader.uniforms},
   vertexShader:baseShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 hcsWorld;').replace('vUv = textureMatrix','hcsWorld=(modelMatrix*vec4(position,1.)).xyz; vUv = textureMatrix'),
   fragmentShader:baseShader.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 hcsWorld;').replace('vec4 base = texture2DProj( tDiffuse, vUv );',floor?`vec2 uv=vUv.xy/vUv.w; vec2 d=vec2(.0018); vec4 base=texture2D(tDiffuse,uv)*.4;
    base+=(texture2D(tDiffuse,uv+vec2(d.x,0.))+texture2D(tDiffuse,uv-vec2(d.x,0.))+texture2D(tDiffuse,uv+vec2(0.,d.y))+texture2D(tDiffuse,uv-vec2(0.,d.y)))*.15;`:'vec4 base = texture2DProj( tDiffuse, vUv );')
   .replace('vec4( blendOverlay( base.rgb, color ), 1.0 )',floor?'vec4(base.rgb, .24*(1.-step(.491,max(abs(fract(hcsWorld.x/2.5)-.5),abs(fract(hcsWorld.z/2.5)-.5)))))':'vec4(base.rgb, 1.0)')};
  const mirror=new Reflector(new PlaneGeometry(width,height),{textureWidth:floor?512:768,textureHeight:floor?512:768,clipBias:.003,multisample:0,shader});
  mirror.name=floor?'Local polished floor reflection':'Live vanity mirror';mirror.userData.runtimeOnly=true;
  (mirror.material as ShaderMaterial).transparent=floor;(mirror.material as ShaderMaterial).depthWrite=!floor;
  const render=mirror.onBeforeRender.bind(mirror);
  mirror.onBeforeRender=(renderer:WebGLRenderer,scene:Scene,camera:Camera,...args:any[])=>{
   if(scene.overrideMaterial)return;
   const hidden:Object3D[]=[];scene.traverse(o=>{if(o!==mirror&&o.visible&&(o.userData.interactionId||o.userData.runtimeOnly&&(o as any).isMesh)){hidden.push(o);o.visible=false;}});
   const update=renderer.shadowMap.needsUpdate;renderer.shadowMap.needsUpdate=false;
   try{(render as any)(renderer,scene,camera,...args);}finally{renderer.shadowMap.needsUpdate=update;hidden.forEach(o=>o.visible=true);}
  };
  return mirror;
 },[width,height,floor]);
 useEffect(()=>()=>{plane.geometry.dispose();plane.dispose();},[plane]);
 return <primitive object={plane} position={position} rotation={rotation}/>;
}
export function InteriorReflections({plan,layout,enabled}:{plan:Plan;layout:HouseLayout;enabled:boolean}){
 const [room,setRoom]=useState<Room|null>(null);
 useEffect(()=>setRoom(null),[plan]);
 useFrame(({camera})=>{
  if(!enabled){if(room)setRoom(null);return;}
  const x=camera.position.x+plan.width/2,z=camera.position.z+plan.depth/2,floor=Math.max(0,Math.floor((camera.position.y-.1)/FLOOR_HEIGHT));
  const next=plan.rooms.find(r=>r.floor===floor&&x>r.x+.1&&x<r.x+r.w-.1&&z>r.y+.1&&z<r.y+r.h-.1&&!['stairs','terrace','portico'].includes(r.kind))||null;
  if(next?.id!==room?.id)setRoom(next);
 });
 if(!enabled||!room)return null;
 const basin=room.kind==='bathroom'?bathroomFixtures(room,layout).find(f=>f.kind==='basin'):null;
 const shiny=room.kind!=='bathroom'&&plan.design?.floorFinish!=='woodfloor';
 return <group position={[-plan.width/2,room.floor*FLOOR_HEIGHT,-plan.depth/2]}>
  {shiny&&<ReflectedPlane position={[room.x+room.w/2,.073,room.y+room.h/2]} rotation={[-Math.PI/2,0,0]} width={room.w-.06} height={room.h-.06} floor/>}
  {basin&&<group position={[basin.x,.08,basin.z]} rotation={[0,basin.angle,0]}><ReflectedPlane position={[0,4.65,-basin.depth/2+.26]} rotation={[0,0,0]} width={1.58} height={1.96}/></group>}
 </group>;
}

