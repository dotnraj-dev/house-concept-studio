import { Button, Input, Select, Checkbox } from '../ui';
import {createPortal} from 'react-dom';
import {useImperativeHandle,type Ref} from 'react';
import {Compass} from './Compass';
import {ViewerCompass} from '../house3d/ViewerCompass';
import {SelectionOverlay} from '../house3d/SelectionOverlay';
import {AdaptiveQuality} from '../house3d/AdaptiveQuality';
import {QUALITY,qualityChoice,type QualityChoice,type QualityLevel} from '../house3d/viewer-quality';
import {readDevice,saveDevice,type Selection,type DockTab} from '../workspace-state';
import {TouchWalkControls,emptyMotion} from './TouchWalkControls';
import {useDevice,useTouch} from './useDevice';
import {Camera,Sun,Layers,MoreHorizontal,Move,Footprints,Play,Maximize} from 'lucide-react';
export type ViewerHandle={exportScene:()=>Promise<Blob>;camera:()=>unknown;downloadModel:()=>void;downloadCamera:()=>void;front:()=>void};
import {ExteriorLightRig} from '../house3d/ExteriorLightRig';
import {SceneActivity} from '../house3d/SceneActivity';
import {exteriorLighting} from '../house3d/exterior-lighting';
import {frontElevationPose} from '../house3d/camera-presets';
import {roomFitments} from '../house3d/fitout-layout';
import {GROUND_LEVEL} from '../building-dimensions';
import {showerZone} from '../house3d/interior-layout';
import {presentationPose} from '../house3d/room-view';
import {InteriorLighting} from '../house3d/InteriorLighting';
import {InteriorReflections} from '../house3d/InteriorReflections';
import {PresentationEffects} from '../house3d/PresentationEffects';
import {sunPosition,windPaths} from '../house3d/climate';
import {ClimateOverlay} from '../house3d/ClimateOverlay';
import {defaultSite} from '../site-context';
import {bathroomFixtures} from '../house3d/bathroom';
import {ClimatePanel,type Study} from './ClimatePanel';
import {ViewerBoundary} from './ViewerBoundary';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import type {Scene,Camera as ThreeCamera,PerspectiveCamera} from 'three';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useProgress } from '@react-three/drei';
import { ACESFilmicToneMapping, PCFSoftShadowMap, TOUCH } from 'three';
import type { Asset, Plan, Room } from '../types';
import { CameraRig, type ViewCommand, type ViewerMode } from '../house3d/CameraRig';
import { HouseScene } from '../house3d/HouseScene';
import { FLOOR_HEIGHT, entrancePose, furnishingFrame, makeHouseLayout, makeInteractions, worldX, worldZ } from '../house3d/layout';
import {FEET_TO_METRES,prepareExport} from '../house3d/export';

function roomView(plan:Plan,room:Room|undefined,floor:number):ViewCommand{
  const landing=room?.kind==='stairs'?furnishingFrame(plan,room):null;
  const point=landing?landing.transform(0,landing.local.y+2):null;
  const x=point?point[0]:room?room.x+room.w/2:plan.width/2;
  const z=point?point[1]:room?room.y+room.h/2:plan.depth/2;
  return {id:Date.now(),floor,position:[worldX(plan,x),floor*FLOOR_HEIGHT+5.2,worldZ(plan,z)],
    look:[worldX(plan,x),floor*FLOOR_HEIGHT+4.5,worldZ(plan,z-5)]};
}

export function House3D({active=true,plan,floor,assets,projectId,canRender=false,onStyleChange,selection=null,onSelect,present=false,onOpenDock,climateTarget,studyOpen=false,ref}:{active?:boolean;plan:Plan;floor:number;assets:Asset[];projectId?:string;canRender?:boolean;onStyleChange?:(id:string)=>void;selection?:Selection;onSelect?:(v:Selection)=>void;present?:boolean;onOpenDock?:(tab:DockTab)=>void;climateTarget?:HTMLElement|null;studyOpen?:boolean;ref?:Ref<ViewerHandle>}){
  const {active:loading,progress}=useProgress();
  const device=useDevice(),touch=useTouch(),motion=useRef(emptyMotion()),compass=useRef<HTMLDivElement>(null);
  const [quality,setQuality]=useState<QualityChoice>(()=>qualityChoice(readDevice('quality',device,'auto')));
  const [autoLevel,setAutoLevel]=useState<QualityLevel>('high'),[fps,setFps]=useState(0);
  const actualQuality=quality==='auto'?autoLevel:quality,qualityConfig=QUALITY[actualQuality];
  useEffect(()=>{setQuality(qualityChoice(readDevice('quality',device,'auto')));setAutoLevel('high');},[device]);
  const chooseQuality=(value:string)=>{const q=qualityChoice(value);setQuality(q);setAutoLevel('high');setFps(0);saveDevice('quality',device,q);};
  const sampleFps=useCallback((value:number)=>setFps(value),[]);
  const chooseAuto=useCallback((level:QualityLevel)=>{setAutoLevel(level);setFps(0);},[]);

  const [furnished,setFurnished]=useState(plan.design?.furnished!==false),[showServices,setShowServices]=useState(false),[xray,setXray]=useState(false),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  const [reflections,setReflections]=useState(true);
  const [enhanced,setEnhanced]=useState(true),[mood,setMood]=useState<string>('recipe');
  const viewerRef=useRef<HTMLDivElement>(null);
  const sceneRef=useRef<Scene|null>(null),cameraRef=useRef<ThreeCamera|null>(null);
  const exportTask=useRef<Promise<Blob>|null>(null);
  function cameraPose(){const c=cameraRef.current as PerspectiveCamera|null;return c?{position:c.position.toArray().map(value=>value*FEET_TO_METRES),quaternion:c.quaternion.toArray(),fov:c.fov||52,units:'metres'}:null;}
  function downloadCamera(){const camera=cameraPose();if(!camera)return;const blob=new Blob([JSON.stringify({camera,width:1920,samples:256},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='house-render-options.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  useEffect(()=>setFurnished(plan.design?.furnished!==false),[plan.design?.furnished]);
  const displayPlan=useMemo(()=>({...plan,design:plan.design?{...plan.design,furnished}:undefined}),[plan,furnished]);
  async function exportScene(){
    if(exportTask.current)throw new Error('An export is already running. Wait for it to finish before trying again.');
    if(loading)throw new Error('Wait for all materials and furniture to finish loading.');
    const root=sceneRef.current?.getObjectByName('HouseExport');if(!root)throw new Error('The 3D scene is still loading.');
    const prepared=prepareExport(root);
    prepared.root.traverse(o=>{if(o.name.startsWith('Distant '))o.visible=true;});
    const task=new GLTFExporter().parseAsync(prepared.root,{binary:true,onlyVisible:true,maxTextureSize:2048}).then(result=>{
      if(!(result instanceof ArrayBuffer))throw new Error('Unable to export this scene.');
      if(result.byteLength>50*1024*1024)throw new Error('This scene exceeds the 50 MB render limit. Use smaller uploaded textures or fewer custom assets.');
      return new Blob([result],{type:'model/gltf-binary'});
    }).finally(()=>{prepared.dispose();exportTask.current=null;});
    exportTask.current=task;
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([task,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Export is taking longer than 90 seconds. Wait before retrying, or reload the viewer if it remains stuck.')),90000);})]);}
    finally{clearTimeout(timer);}
  }
  async function downloadModel(){setExporting(true);setExportError('');try{const blob=await exportScene(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='house-concept.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setExportError((e as Error).message);}finally{setExporting(false);}}
  const layout=useMemo(()=>makeHouseLayout(plan),[plan]);
  const doorAngles=useMemo(()=>new Map<string,number>(),[layout]);
  const interactions=useMemo(()=>makeInteractions(displayPlan,layout),[displayPlan,layout]);
  const [mode,setMode]=useState<ViewerMode>('overview');
  const requestedMode=useRef<ViewerMode>('overview');
  const [cameraPreset,setCameraPreset]=useState<'front'|'corner'|'aerial'>('front');
  const [cutaway,setCutaway]=useState(false);
  const [openDoors,setOpenDoors]=useState<Set<string>>(new Set());
  const [openShelves,setOpenShelves]=useState<Set<string>>(new Set());
  const [tvOn,setTvOn]=useState<Set<string>>(new Set());
  const [chimneyOn,setChimneyOn]=useState<Set<string>>(new Set());
  const [command,setCommand]=useState<ViewCommand|null>(null);
  const [tourId,setTourId]=useState(0);
  const [locked,setLocked]=useState(false);
  const [hover,setHover]=useState('');
  const [contextVisible,setContextVisible]=useState(true),[localStudy,setStudy]=useState(false);
  const study=onOpenDock?studyOpen:localStudy;
  const [inputs,setInputs]=useState<Study>(()=>({date:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}),hour:10,wind:'south',windOn:true,windowsOpen:true}));
  const site=plan.design?.siteContext||defaultSite,sun=sunPosition(inputs.date,inputs.hour,site.latitude,site.longitude),extent=Math.max(45,plan.width,plan.depth,(plan.levels||1)*FLOOR_HEIGHT);
  const incompleteBathrooms=useMemo(()=>plan.rooms.filter(r=>r.kind==='bathroom'&&bathroomFixtures(r,layout).length<2),[plan,layout]);
  const paths=useMemo(()=>study&&inputs.windOn&&inputs.windowsOpen?windPaths(plan,layout,inputs.wind,floor,openDoors):[],[plan,layout,inputs.wind,floor,openDoors,study,inputs.windOn,inputs.windowsOpen]);
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const lastFloor=useRef(floor);

  const toggleSet=(setter:Dispatch<SetStateAction<Set<string>>>,id:string)=>setter(previous=>{
    const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;
  });

  const interact=useCallback((id:string)=>{
    const item=interactions.find(entry=>entry.id===id);
    if(!item)return;
    lastFloor.current=item.floor;
    const door=layout.doors.find(d=>d.id===id),window=layout.windows.find(w=>w.id===id);
    const roomId=window?.roomId||door?.rooms?.[0]||plan.rooms.find(r=>r.floor===item.floor&&item.x>=r.x&&item.x<=r.x+r.w&&item.z>=r.y&&item.z<=r.y+r.h)?.id;
    onSelect?.({kind:'object',id,label:item.label,roomId});
    if(item.action==='door')return toggleSet(setOpenDoors,id);
    if(item.action==='shelf')return toggleSet(setOpenShelves,id);
    if(item.action==='tv')return toggleSet(setTvOn,id);
    if(item.action==='chimney')return toggleSet(setChimneyOn,id);
    if(item.action==='stairs'){requestedMode.current='walk';
      const nextFloor=item.floor===(plan.levels||1)-1?Math.max(0,item.floor-1):item.floor+1;
      const destination=plan.rooms.find(room=>room.floor===nextFloor&&room.kind==='stairs')||plan.rooms.find(room=>room.floor===nextFloor&&room.kind==='lounge');
      if(destination){lastFloor.current=nextFloor;onSelect?.({kind:'floor',floor:nextFloor});setMode('walk');setCommand(roomView(plan,destination,nextFloor));}
      return;
    }
    if(item.view&&item.look){requestedMode.current='walk';
      setMode('walk');
      setCommand({id:Date.now()+Math.random(),floor:item.floor,
        position:[worldX(plan,item.view[0]),item.floor*FLOOR_HEIGHT+item.view[1],worldZ(plan,item.view[2])],
        look:[worldX(plan,item.look[0]),item.floor*FLOOR_HEIGHT+item.look[1],worldZ(plan,item.look[2])]});
    }
  },[interactions,plan,layout,onSelect]);

  useEffect(()=>{
    if(lastFloor.current===floor)return;
    lastFloor.current=floor;
    if(!active||mode!=='walk')return;
    const destination=plan.rooms.find(room=>room.floor===floor&&room.kind==='lounge')||plan.rooms.find(room=>room.floor===floor&&room.kind==='living')||plan.rooms.find(room=>room.floor===floor);
    if(destination){setMode('walk');setCommand(roomView(plan,destination,floor));}
  },[floor,plan]);

  const exitPointer=()=>{if(document.pointerLockElement===canvasRef.current)document.exitPointerLock();};
  useEffect(()=>{if(!active){exitPointer();motion.current=emptyMotion();}},[active]);
  const overview=(aerial=false)=>{requestedMode.current='overview';exitPointer();setHover('');setMode('overview');setCameraPreset(aerial?'aerial':'corner');const {n}=entrancePose(plan,layout),dist=Math.max(plan.width,plan.depth,(plan.levels||1)*12)*1.3;setCommand({id:Date.now(),floor:0,fov:52,position:[(n[0]+n[1]*.6)*dist,aerial?Math.max(16,dist*.65):Math.max(6.2,(plan.levels||1)*2.2),(n[1]-n[0]*.6)*dist],look:[0,(plan.levels||1)*4,0]});};
  const previousPlan=useRef(plan);
  const frontView=()=>{requestedMode.current='overview';exitPointer();setHover('');setMode('overview');setCameraPreset('front');setCutaway(false);const canvas=canvasRef.current;setCommand({id:Date.now(),floor:0,...frontElevationPose(plan,canvas?canvas.clientWidth/canvas.clientHeight:1.25)});};
  useEffect(()=>{if(!active||mode!=='overview'||cameraPreset!=='front')return;frontView();const observer=new ResizeObserver(()=>{const canvas=canvasRef.current;if(requestedMode.current==='overview'&&canvas&&canvas.clientWidth>0&&canvas.clientHeight>0)frontView();});if(viewerRef.current)observer.observe(viewerRef.current);return()=>observer.disconnect();},[plan,mode,cameraPreset,active]);
  useEffect(()=>{if(previousPlan.current!==plan){previousPlan.current=plan;frontView();}},[plan]);

  const walk=()=>{
    if(mode==='walk'){if(!touch)canvasRef.current?.requestPointerLock?.().catch(()=>{});return;}
    requestedMode.current='walk';lastFloor.current=0;onSelect?.({kind:'floor',floor:0});
    setMode('walk');setCommand(null);setHover('');
    if(!touch)canvasRef.current?.requestPointerLock?.().catch(()=>{});
  };
  const tour=()=>{
    requestedMode.current='tour';exitPointer();setCutaway(false);setOpenDoors(new Set(layout.doors.map(door=>door.id)));
    setMode('tour');setTourId(previous=>previous+1);setHover('');
  };

  useImperativeHandle(ref,()=>({exportScene,camera:cameraPose,downloadModel,downloadCamera,front:frontView}));
  const roomJump=(value:string)=>{requestedMode.current='walk';const r=plan.rooms.find(o=>o.id===value.replace(/^(shower|storage):/,''));if(!r)return;lastFloor.current=r.floor;onSelect?.({kind:'room',id:r.id});exitPointer();setMode('walk');setCommand(presentationPose(plan,r,layout,value.startsWith('shower:')?'shower':value.startsWith('storage:')?'storage':undefined));};
  const climatePanel=study&&<ClimatePanel study={inputs} onChange={setInputs} lat={site.latitude} lon={site.longitude} isDefault={!plan.design?.siteContext} elevation={sun.elevation} paths={paths.length} doors={!!openDoors.size} openDoors={()=>setOpenDoors(openDoors.size?new Set():new Set(layout.doors.filter(d=>!d.arch).map(d=>d.id)))}/>;
  return <div className={'house-viewer workspace-viewer '+(present?'present-viewer':'')+(touch?' touch-viewer':'')+(mode==='walk'?' walk-viewer':'')} ref={viewerRef}>
    <div className="canvas-tools" role="toolbar" aria-label="3D viewing tools">
      <Button aria-label="Front view" title="Road-facing front elevation" className={mode==='overview'&&cameraPreset==='front'?'active':''} onClick={frontView}><Camera size={15}/><span>Front view</span></Button>
      {!present&&<><Button className={mode==='overview'&&cameraPreset==='corner'?'active':''} onClick={()=>{overview();setCutaway(false);}} title="Corner view · drag to orbit or tap to select" aria-label="Orbit / select"><Move size={15}/><span>Orbit / select</span></Button>
      <Button aria-label="Walk inside" title="Walk inside" className={mode==='walk'?'active':''} onClick={walk}><Footprints size={15}/><span>Walk inside</span></Button></>}
      <Button aria-label="Guided tour" title="Guided tour" className={mode==='tour'?'active':''} onClick={tour}><Play size={15}/><span>Guided tour</span></Button>
      {!present&&<><Button aria-label="Cutaway" title="Cutaway" className={cutaway?'active':''} onClick={()=>{overview(true);setCutaway(!cutaway);}}><Layers size={15}/><span>Cutaway</span></Button>
      <details className="viewer-options"><summary aria-label="More viewing tools"><MoreHorizontal size={18}/></summary><div className="viewer-options-menu">
       <label><Checkbox checked={xray} onChange={e=>setXray(e.target.checked)}/> Transparent walls</label>
       <label><Checkbox checked={showServices} onChange={e=>setShowServices(e.target.checked)}/> Plumbing</label>
       <label><Checkbox checked={furnished} onChange={e=>setFurnished(e.target.checked)}/> Interiors (preview)</label>
       <label>Light<Select aria-label="Presentation lighting" value={mood} onChange={e=>setMood(e.target.value)}><option value="recipe">Recipe lighting</option><option value="day">Clear daylight</option><option value="golden">Golden hour</option><option value="sunset">Sunset</option><option value="dusk">Dusk · warm house lights</option></Select></label>
       <label><Checkbox checked={enhanced} disabled={!qualityConfig.ssao} onChange={e=>setEnhanced(e.target.checked)}/> Contact shadows{!qualityConfig.ssao?' · High only':''}</label>
       <label><Checkbox checked={reflections} disabled={!qualityConfig.reflections} onChange={e=>setReflections(e.target.checked)}/> Live reflections{!qualityConfig.reflections?' · High only':''}</label>
       <label><Checkbox checked={contextVisible} onChange={e=>setContextVisible(e.target.checked)}/> Surroundings</label>
       <details className="controls-guide"><summary>Keyboard & touch controls</summary><p>W A S D or arrows: move. Mouse: look. Shift: sprint. Space: jump. C: crouch. E: interact. Esc: release the mouse.</p><p>Touch: one finger orbits, two fingers pan / zoom. In Walk, use the joystick to move and drag the house view to look; buttons jump, crouch and interact.</p></details>
       <Button onClick={()=>{onOpenDock?onOpenDock('climate'):setStudy(!study);}}><Sun size={15}/> Sun & breeze</Button>
       {canRender&&<Button onClick={()=>onOpenDock?.('renders')}>Camera & render</Button>}
       <Button onClick={()=>document.fullscreenElement?document.exitFullscreen():viewerRef.current?.requestFullscreen?.().catch(()=>{})}><Maximize size={15}/> Full screen</Button>
       <Button disabled={exporting||loading} onClick={downloadModel}>{exporting?'Exporting…':'Download 3D'}</Button><Button disabled={loading} onClick={downloadCamera}>Download camera settings</Button>
      </div></details></>}
    </div>
    <div className="room-jump"><Select aria-label="Look inside a room" value="" onChange={e=>roomJump(e.target.value)}><option value="">Jump to a room…</option>{plan.rooms.filter(r=>!['portico','stairs','foyer','passage'].includes(r.kind)).map(r=><option key={r.id} value={r.id}>{r.floor===0?'Ground':'Floor '+r.floor} · {r.label}</option>)}{plan.rooms.filter(r=>r.floor===floor&&roomFitments(plan,r,layout).some(f=>['wardrobe','prayer','upper','sideboard'].includes(f.kind))).map(r=><option key={'storage:'+r.id} value={'storage:'+r.id}>Storage · {r.label}</option>)}{plan.rooms.filter(r=>r.floor===floor&&r.kind==='bathroom'&&showerZone(r,layout)).map(r=><option key={'shower:'+r.id} value={'shower:'+r.id}>Shower · {r.label}</option>)}</Select></div>
    {!present&&<div className="quality-control" role="toolbar" aria-label="Rendering quality"><label>Quality<Select aria-label="Viewer quality" value={quality} onChange={e=>chooseQuality(e.target.value)}>{['auto','high','balanced','low'].map(q=><option key={q} value={q}>{q.charAt(0).toUpperCase()+q.slice(1)}</option>)}</Select></label><span data-quality={actualQuality}>{actualQuality} {fps>0?'· '+fps+' fps':''}</span></div>}
    {climateTarget?createPortal(climatePanel,climateTarget):climatePanel}
    <div className="house-canvas">
      <ViewerBoundary><Canvas shadows frameloop={!active?'never':mode==='overview'&&!openShelves.size&&!chimneyOn.size&&!study?'demand':'always'} gl={{preserveDrawingBuffer:true}} dpr={Math.min(window.devicePixelRatio||1,qualityConfig.dpr)} camera={{position:[plan.width*.85,plan.depth*.8,plan.depth*.9],fov:52,near:.05,far:Math.max(400,(plan.levels||1)*40)}}
        onCreated={({gl,scene,camera,invalidate})=>{sceneRef.current=scene;cameraRef.current=camera;canvasRef.current=gl.domElement;gl.toneMapping=ACESFilmicToneMapping;gl.toneMappingExposure=1.08;gl.shadowMap.type=PCFSoftShadowMap;if(import.meta.env.VITE_DEMO_MODE==='true')(window as any).__hcsDemoViewer={camera,scene,gl,invalidate};}}>
        <AdaptiveQuality sceneVersion={layout} moving={mode!=='overview'} stamp={[plan.design?.style,mood,cutaway,xray,contextVisible,furnished,study?inputs.date+'|'+inputs.hour:'',...openDoors,...openShelves].join('|')} choice={quality} level={actualQuality} ready={active&&!loading} onSample={sampleFps} onLevel={chooseAuto}/>
        <ViewerCompass target={compass}/>
        <SelectionOverlay plan={plan} selection={present?null:selection}/>
        <SceneActivity stamp={[active,mode,mood,cameraPreset,actualQuality,selection?.kind,plan.design?.style,...openDoors,...openShelves].join('|')}/>
        <ExteriorLightRig plan={plan} choice={mood} extent={extent} study={study?sun:undefined}/>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,GROUND_LEVEL-.18,0]} receiveShadow><planeGeometry args={[2000,2000]}/><meshStandardMaterial color="#969c91" roughness={1}/></mesh>
        {study&&<ClimateOverlay paths={paths} shift={[-plan.width/2,0,-plan.depth/2]}/>}
        <HouseScene onSelect={present?undefined:onSelect} lightPower={exteriorLighting(mood,plan.design?.style).fixtures} contextVisible={contextVisible} plan={displayPlan} layout={layout} interactions={interactions} assets={assets} mode={mode} cutaway={cutaway} showServices={showServices} xray={xray}
          openDoors={openDoors} doorAngles={doorAngles} openShelves={openShelves} tvOn={tvOn} chimneyOn={chimneyOn} onInteract={interact}/>
        <InteriorLighting plan={displayPlan}/><InteriorReflections plan={displayPlan} layout={layout} enabled={qualityConfig.reflections&&reflections&&!cutaway&&!xray}/><CameraRig active={active} touch={motion} plan={plan} layout={layout} interactions={interactions} mode={mode} floor={floor} command={command} tourId={tourId}
          openDoors={openDoors} doorAngles={doorAngles} onInteract={interact} onHover={setHover} onTourDone={()=>overview()} onLockChange={setLocked}/>
        {qualityConfig.ssao&&enhanced&&<PresentationEffects/>}
        <OrbitControls enabled={mode==='overview'} enableDamping dampingFactor={.08} target={command?.look||[0,(plan.levels||1)*4,0]}
          minDistance={9} maxDistance={Math.max(150,(plan.levels||1)*25)} touches={{ONE:TOUCH.ROTATE,TWO:TOUCH.DOLLY_PAN}} maxPolarAngle={Math.PI*(cameraPreset==='front'?.6:.52)}/>
      </Canvas></ViewerBoundary>
      {loading&&<div className="viewer-loading" role="status">Loading materials & models · {Math.round(progress)}%</div>}
      {mode==='walk'&&!present&&<><div className="viewer-crosshair">+</div><div className="viewer-interaction">{hover?`${hover} · E or click`:'Look at an object to interact'}</div>
        {!locked&&!touch&&<Button className="viewer-lock" onClick={()=>canvasRef.current?.requestPointerLock?.().catch(()=>{})}>Click to control the camera</Button>}</>}
      {mode==='tour'&&<div className="viewer-tour-label">GUIDED HOUSE TOUR · FRONT → INTERIOR → ALL FLOORS</div>}
      <Compass ref={compass}/>
      {touch&&mode==='walk'&&!present&&<TouchWalkControls motion={motion}/>}
      {!present&&<div className="canvas-status"><span className="live-dot"/> Real-time 3D · feet <span>{mode==='walk'?'Walk':mode==='tour'?'Tour':'Overview'}</span></div>}
    </div>
    {!present&&incompleteBathrooms.length>0&&<details className="viewer-review"><summary>Bathroom fit review · {incompleteBathrooms.length}</summary><p>Insufficient clear wall space for basin and toilet: {incompleteBathrooms.map(r=>r.label+' · floor '+r.floor).join(', ')}. Fittings that do not fit are omitted.</p></details>}
    {exportError&&<p role="alert">{exportError}</p>}

    <div className="viewer-help" hidden={present||touch}>
      {mode==='walk'?<><strong>W A S D</strong> move <span>·</span> <strong>Mouse</strong> look <span>·</span> <strong>Shift</strong> sprint <span>·</span> <strong>Space</strong> jump <span>·</span> <strong>C</strong> crouch <span>·</span> <strong>E</strong> interact <span>·</span> <strong>Esc</strong> release mouse</>:
        <><strong>Drag</strong> rotate <span>·</span> <strong>Scroll</strong> zoom <span>·</span> <strong>Right drag</strong> pan <span>·</span> Click sofa or window for a person’s view</>}
    </div>
  </div>;
}
