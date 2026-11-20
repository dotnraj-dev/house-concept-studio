import type {TouchMotion} from '../components/TouchWalkControls';
import type {MutableRefObject} from 'react';
import {GROUND_LEVEL} from '../building-dimensions';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Raycaster, Vector2, Vector3, type Mesh, type Object3D,type PerspectiveCamera } from 'three';
import type { Plan } from '../types';
import { furnishingFrame, entrancePose, collidesAt, FLOOR_HEIGHT, type HouseLayout, type Interaction, worldX, worldZ } from './layout';
import {bathroomFixtures} from './bathroom';
import { walkingSurface } from './navigation';
import {collectObstacles,obstacleBlocks} from './obstacles';

export type ViewCommand={id:number;position:[number,number,number];look:[number,number,number];floor:number;fov?:number};
export type ViewerMode='overview'|'walk'|'tour';
type Waypoint={position:Vector3;look:Vector3;seconds:number;cut?:boolean};
type Props={active?:boolean;touch?:MutableRefObject<TouchMotion>;plan:Plan;layout:HouseLayout;interactions:Interaction[];mode:ViewerMode;floor:number;command:ViewCommand|null;
  tourId:number;openDoors:Set<string>;doorAngles:ReadonlyMap<string,number>;onInteract:(id:string)=>void;onHover:(label:string)=>void;onTourDone:()=>void;onLockChange:(locked:boolean)=>void};

export function tourPoints(plan:Plan,layout:HouseLayout):Waypoint[]{
 const {x,z,n}=entrancePose(plan,layout),levels=plan.levels||1;
 const at=(distance:number,height:number)=>new Vector3(worldX(plan,x+n[0]*distance),height,worldZ(plan,z+n[1]*distance));
 const points:Waypoint[]=[{position:at(18,9),look:new Vector3(0,levels*4,0),seconds:3},{position:at(4,5.2),look:at(-3,4.6),seconds:3},{position:at(-2,5.2),look:at(-7,4.5),seconds:3}];
 for(let f=0;f<levels;f++)for(const r of plan.rooms.filter(r=>r.floor===f&&!['stairs','portico','passage','foyer'].includes(r.kind))){
  const opening=layout.doors.find(d=>d.rooms?.includes(r.id)),cx=r.x+r.w/2,cz=r.y+r.h/2;
  const ox=opening?opening.x+(opening.axis==='x'?opening.width*.5:0):r.x+.5,oz=opening?opening.z+(opening.axis==='z'?opening.width*.5:0):r.y+.5;
  const px=Math.max(r.x+.65,Math.min(r.x+r.w-.65,ox+(cx-ox)*.17)),pz=Math.max(r.y+.65,Math.min(r.y+r.h-.65,oz+(cz-oz)*.17));
  const frame=furnishingFrame(plan,r),k=frame.local;
  let aim:[number,number]=[cx,cz],eye=5.15,focus=3.1;
  if(r.kind==='bathroom'){const fixtures=bathroomFixtures(r,layout);if(fixtures.length)aim=[fixtures.reduce((v,t)=>v+t.x,0)/fixtures.length,fixtures.reduce((v,t)=>v+t.z,0)/fixtures.length];focus=2.9;}
  if(r.kind==='living'||r.kind==='lounge')aim=frame.transform(k.x+k.w*.55,k.y+k.h*.67);
  if(r.kind==='kitchen')aim=frame.transform(0,k.y+k.h-1.2);
  const cameraAt=(t:number)=>new Vector3(worldX(plan,px+(cx-px)*t),f*FLOOR_HEIGHT+eye,worldZ(plan,pz+(cz-pz)*t)),look=new Vector3(worldX(plan,aim[0]),f*FLOOR_HEIGHT+focus,worldZ(plan,aim[1]));
  points.push({position:cameraAt(0),look,seconds:.65,cut:true},{position:cameraAt(.09),look,seconds:2.8});

 }
 points.push({position:new Vector3(plan.width,Math.max(plan.depth*.8,levels*10),plan.depth),look:new Vector3(0,levels*4,0),seconds:3,cut:true});return points;
}

export function CameraRig({active=true,touch,plan,layout,interactions,mode,floor,command,tourId,openDoors,doorAngles,onInteract,onHover,onTourDone,onLockChange}:Props){
  const {camera,gl,scene,invalidate}=useThree();
  const yaw=useRef(0),pitch=useRef(0),keys=useRef(new Set<string>()),jump=useRef(0),velocity=useRef(0),eye=useRef(5.2);
  const walkingHeight=useRef(floor*FLOOR_HEIGHT),restEye=useRef(5.2);
  const focusId=useRef(''),lastHover=useRef(''),currentFloor=useRef(floor),tourTime=useRef(0);
  const ray=useMemo(()=>new Raycaster(),[]);
  const tour=useMemo(()=>tourPoints(plan,layout),[plan,layout]);
  const solids=useRef<ReturnType<typeof collectObstacles>>([]),solidStamp=useRef(-1);

  const aim=(position:Vector3,look:Vector3)=>{
    camera.position.copy(position);
    const direction=look.clone().sub(position);
    yaw.current=Math.atan2(-direction.x,-direction.z);
    pitch.current=Math.atan2(direction.y,Math.hypot(direction.x,direction.z));
    camera.rotation.order='YXZ';
    camera.rotation.set(pitch.current,yaw.current,0);invalidate();
  };

  useEffect(()=>{
    if(mode==='overview'){const {n}=entrancePose(plan,layout),dist=Math.max(plan.width,plan.depth,(plan.levels||1)*12)*1.3;aim(new Vector3((n[0]+n[1]*.6)*dist,Math.max(6.2,(plan.levels||1)*2.2),(n[1]-n[0]*.6)*dist),new Vector3(0,(plan.levels||1)*4,0));}
    if(mode==='walk'&&!command){
      const {x,z,n}=entrancePose(plan,layout);
      aim(new Vector3(worldX(plan,x+n[0]*1.2),5.2,worldZ(plan,z+n[1]*1.2)),new Vector3(worldX(plan,x-n[0]*5),4.7,worldZ(plan,z-n[1]*5)));
      currentFloor.current=0;
      walkingHeight.current=-.5;restEye.current=5.2;
    }
  },[mode,plan,layout]);

  useEffect(()=>{
    if(!command)return;
    if(command.fov&&(camera as PerspectiveCamera).isPerspectiveCamera){(camera as PerspectiveCamera).fov=command.fov;(camera as PerspectiveCamera).updateProjectionMatrix();}
    currentFloor.current=command.floor;
    walkingHeight.current=command.floor*FLOOR_HEIGHT;
    restEye.current=Math.max(2.8,Math.min(5.2,command.position[1]-walkingHeight.current));
    jump.current=0;velocity.current=0;
    aim(new Vector3(...command.position),new Vector3(...command.look));
  },[command]);

  useEffect(()=>{if(mode==='tour'){tourTime.current=0;aim(tour[0].position,tour[0].look);}},[tourId,mode,tour]);

  useEffect(()=>{
    if(!active){keys.current.clear();return;}
    const onKeyDown=(event:KeyboardEvent)=>{
      if(mode!=='walk')return;
      if(['INPUT','TEXTAREA','SELECT'].includes((event.target as HTMLElement).tagName))return;
      const key=event.key.toLowerCase();
      keys.current.add(key);
      if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))event.preventDefault();
      if(key===' '&&!event.repeat&&jump.current<=.001){velocity.current=8;}
      if(key==='e'&&!event.repeat&&focusId.current)onInteract(focusId.current);
    };
    const onKeyUp=(event:KeyboardEvent)=>keys.current.delete(event.key.toLowerCase());
    const onMouse=(event:MouseEvent)=>{
      if(mode!=='walk'||document.pointerLockElement!==gl.domElement)return;
      yaw.current-=event.movementX*.0023;
      pitch.current=Math.max(-1.36,Math.min(1.36,pitch.current-event.movementY*.0023));
    };
    let drag: {id:number;x:number;y:number}|null=null;
    const down=(event:PointerEvent)=>{if(mode!=='walk'||event.pointerType!=='touch')return;drag={id:event.pointerId,x:event.clientX,y:event.clientY};gl.domElement.setPointerCapture(event.pointerId);};
    const move=(event:PointerEvent)=>{if(!drag||drag.id!==event.pointerId)return;
      yaw.current-=(event.clientX-drag.x)*.005;pitch.current=Math.max(-1.36,Math.min(1.36,pitch.current-(event.clientY-drag.y)*.005));
      drag={id:event.pointerId,x:event.clientX,y:event.clientY};};
    const up=()=>{drag=null;};
    gl.domElement.addEventListener('pointerdown',down);gl.domElement.addEventListener('pointermove',move);gl.domElement.addEventListener('pointerup',up);gl.domElement.addEventListener('pointercancel',up);
    const onLock=()=>onLockChange(document.pointerLockElement===gl.domElement);
    const onBlur=()=>{keys.current.clear();if(touch){touch.current.forward=0;touch.current.side=0;touch.current.crouch=false;}drag=null;};
    const onClick=()=>{if(mode==='walk'&&document.pointerLockElement===gl.domElement&&focusId.current)onInteract(focusId.current);};
    window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);
    window.addEventListener('blur',onBlur);
    document.addEventListener('mousemove',onMouse);document.addEventListener('pointerlockchange',onLock);
    gl.domElement.addEventListener('click',onClick);
    return()=>{window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);
      window.removeEventListener('blur',onBlur);
      document.removeEventListener('mousemove',onMouse);document.removeEventListener('pointerlockchange',onLock);
      gl.domElement.removeEventListener('click',onClick);gl.domElement.removeEventListener('pointerdown',down);gl.domElement.removeEventListener('pointermove',move);gl.domElement.removeEventListener('pointerup',up);gl.domElement.removeEventListener('pointercancel',up);keys.current.clear();};
  },[mode,gl,onInteract,onLockChange,active]);

  useFrame((_,delta)=>{
    if(!active)return;
    if(mode==='tour'){
      tourTime.current+=Math.min(delta,.08);
      let remaining=tourTime.current;
      for(let index=1;index<tour.length;index++){
        const seconds=tour[index].seconds;
        if(remaining<=seconds){
          const t=Math.max(0,Math.min(1,remaining/seconds));
          const smooth=t*t*(3-2*t);
          const position=tour[index].cut?tour[index].position:tour[index-1].position.clone().lerp(tour[index].position,smooth);
          const look=tour[index].cut?tour[index].look:tour[index-1].look.clone().lerp(tour[index].look,smooth);
          camera.position.copy(position);camera.lookAt(look);
          return;
        }
        remaining-=seconds;
      }
      onTourDone();return;
    }
    if(mode!=='walk')return;
    const now=performance.now();
    if(now-solidStamp.current>200){solids.current=collectObstacles(scene);solidStamp.current=now;}
    const step=Math.min(delta,.06);
    if(touch?.current.jump){if(jump.current<=.001)velocity.current=8;touch.current.jump=false;}
    if(touch?.current.interact){if(focusId.current)onInteract(focusId.current);touch.current.interact=false;}
    const desiredEye=keys.current.has('c')||touch?.current.crouch?3.25:restEye.current;
    eye.current+=(desiredEye-eye.current)*Math.min(1,step*9);
    velocity.current-=19*step;
    jump.current=Math.max(0,jump.current+velocity.current*step);
    if(jump.current===0)velocity.current=0;
    const speed=keys.current.has('shift')?10:5.5;
    const forward=(keys.current.has('w')||keys.current.has('arrowup')?1:0)-(keys.current.has('s')||keys.current.has('arrowdown')?1:0)+(touch?.current.forward||0);
    const side=(keys.current.has('d')||keys.current.has('arrowright')?1:0)-(keys.current.has('a')||keys.current.has('arrowleft')?1:0)+(touch?.current.side||0);
    if(forward||side){
      restEye.current=5.2;
      const magnitude=Math.max(1,Math.hypot(forward,side));
      const dx=((-Math.sin(yaw.current)*forward+Math.cos(yaw.current)*side)/magnitude)*speed*step;
      const dz=((-Math.cos(yaw.current)*forward-Math.sin(yaw.current)*side)/magnitude)*speed*step;
      const slices=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.26));
      for(let n=0;n<slices;n++){
        const sx=dx/slices,sz=dz/slices;
        const x=camera.position.x+plan.width/2,z=camera.position.z+plan.depth/2;
        const surfaceAt=(nextX:number,nextZ:number)=>walkingSurface(plan,nextX,nextZ,walkingHeight.current,currentFloor.current);
        const body={x:camera.position.x,z:camera.position.z,bottom:walkingHeight.current+jump.current,height:eye.current+.4,radius:.6};
        const xHeight=surfaceAt(x+sx,z);
        if(xHeight!==null&&!collidesAt(plan,layout,x+sx,z,currentFloor.current,openDoors,.6,doorAngles)&&!obstacleBlocks(solids.current,body,{...body,x:body.x+sx,bottom:xHeight+jump.current})){
          camera.position.x+=sx;walkingHeight.current=xHeight;
        }
        const afterX={...body,x:camera.position.x,bottom:walkingHeight.current+jump.current};
        const zHeight=surfaceAt(camera.position.x+plan.width/2,z+sz);
        if(zHeight!==null&&!collidesAt(plan,layout,camera.position.x+plan.width/2,z+sz,currentFloor.current,openDoors,.6,doorAngles)&&!obstacleBlocks(solids.current,afterX,{...afterX,z:afterX.z+sz,bottom:zHeight+jump.current})){
          camera.position.z+=sz;walkingHeight.current=zHeight;
        }
        const nearest=Math.round(walkingHeight.current/FLOOR_HEIGHT);if(Math.abs(nearest*FLOOR_HEIGHT-walkingHeight.current)<.65)currentFloor.current=Math.max(0,Math.min((plan.levels||1)-1,nearest));
      }
    }
    camera.position.y=walkingHeight.current+eye.current+jump.current;
    camera.rotation.order='YXZ';camera.rotation.set(pitch.current,yaw.current,0);
    camera.updateMatrixWorld();

    ray.setFromCamera(new Vector2(0,0),camera);
    ray.far=7;
    const actionFor=(object:Object3D)=>{for(let node:Object3D|null=object;node;node=node.parent)if(node.userData.interactionId||node.userData.actionId)return {id:node.userData.interactionId||node.userData.actionId,label:node.userData.label};return null;};
    const hit=ray.intersectObjects(scene.children,true).find(entry=>{
      if(actionFor(entry.object))return true;
      const mesh=entry.object as Mesh;
      if(!mesh.isMesh)return false;
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      return materials.some(material=>material.visible&&material.opacity>.15);
    });
    const action=hit? actionFor(hit.object):null;
    const id=action?.id || '';
    focusId.current=id;
    const label=action?.label || '';
    if(label!==lastHover.current){lastHover.current=label;onHover(label);}
  });
  return null;
}
