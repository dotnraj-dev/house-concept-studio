import {ExteriorLightRig} from '../house3d/ExteriorLightRig';
import {SceneActivity} from '../house3d/SceneActivity';
import {exteriorLighting} from '../house3d/exterior-lighting';
import {FACADE_STYLES} from '../house3d/facade-styles';
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
import {plotEdges,defaultSite} from '../site-context';
import {SiteFinish} from '../house3d/SiteWorld';
import {bathroomFixtures} from '../house3d/bathroom';
import {ClimatePanel,type Study} from './ClimatePanel';
import {ViewerBoundary} from './ViewerBoundary';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import type {Scene,Camera,PerspectiveCamera} from 'three';
import {RenderPanel} from './RenderPanel';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, useProgress } from '@react-three/drei';
import { ACESFilmicToneMapping, PCFSoftShadowMap } from 'three';
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

export function House3D({plan,floor,assets,projectId,canRender=false,onStyleChange}:{plan:Plan;floor:number;assets:Asset[];projectId?:string;canRender?:boolean;onStyleChange?:(id:string)=>void}){
  const {active:loading,progress}=useProgress();
  const [furnished,setFurnished]=useState(plan.design?.furnished!==false),[showServices,setShowServices]=useState(false),[xray,setXray]=useState(false),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  const [reflections,setReflections]=useState(true);
  const [enhanced,setEnhanced]=useState(true),[mood,setMood]=useState<string>('recipe');
  const viewerRef=useRef<HTMLDivElement>(null);
  const sceneRef=useRef<Scene|null>(null),cameraRef=useRef<Camera|null>(null);
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
  const [contextVisible,setContextVisible]=useState(true),[study,setStudy]=useState(false);
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
    if(item.action==='door')return toggleSet(setOpenDoors,id);
    if(item.action==='shelf')return toggleSet(setOpenShelves,id);
    if(item.action==='tv')return toggleSet(setTvOn,id);
    if(item.action==='chimney')return toggleSet(setChimneyOn,id);
    if(item.action==='stairs'){
      const nextFloor=item.floor===(plan.levels||1)-1?Math.max(0,item.floor-1):item.floor+1;
      const destination=plan.rooms.find(room=>room.floor===nextFloor&&room.kind==='stairs')||plan.rooms.find(room=>room.floor===nextFloor&&room.kind==='lounge');
      if(destination){setMode('walk');setCommand(roomView(plan,destination,nextFloor));}
      return;
    }
    if(item.view&&item.look){
      setMode('walk');
      setCommand({id:Date.now()+Math.random(),floor:item.floor,
        position:[worldX(plan,item.view[0]),item.floor*FLOOR_HEIGHT+item.view[1],worldZ(plan,item.view[2])],
        look:[worldX(plan,item.look[0]),item.floor*FLOOR_HEIGHT+item.look[1],worldZ(plan,item.look[2])]});
    }
  },[interactions,plan]);

  useEffect(()=>{
    if(lastFloor.current===floor)return;
    lastFloor.current=floor;
    const destination=plan.rooms.find(room=>room.floor===floor&&room.kind==='lounge')||plan.rooms.find(room=>room.floor===floor&&room.kind==='living')||plan.rooms.find(room=>room.floor===floor);
    if(destination){setMode('walk');setCommand(roomView(plan,destination,floor));}
  },[floor,plan]);

  const exitPointer=()=>{if(document.pointerLockElement===canvasRef.current)document.exitPointerLock();};
  const overview=(aerial=false)=>{exitPointer();setHover('');setMode('overview');setCameraPreset(aerial?'aerial':'corner');const {n}=entrancePose(plan,layout),dist=Math.max(plan.width,plan.depth,(plan.levels||1)*12)*1.3;setCommand({id:Date.now(),floor:0,fov:52,position:[(n[0]+n[1]*.6)*dist,aerial?Math.max(16,dist*.65):Math.max(6.2,(plan.levels||1)*2.2),(n[1]-n[0]*.6)*dist],look:[0,(plan.levels||1)*4,0]});};
  const frontView=()=>{exitPointer();setHover('');setMode('overview');setCameraPreset('front');setCutaway(false);const canvas=canvasRef.current;setCommand({id:Date.now(),floor:0,...frontElevationPose(plan,canvas?canvas.clientWidth/canvas.clientHeight:1.25)});};
  useEffect(()=>{if(mode!=='overview'||cameraPreset!=='front')return;frontView();const resize=()=>frontView();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[plan,mode,cameraPreset]);
  const walk=()=>{
    setMode('walk');setCommand(null);setHover('');
    canvasRef.current?.requestPointerLock?.().catch(()=>{});
  };
  const tour=()=>{
    exitPointer();setCutaway(false);setOpenDoors(new Set(layout.doors.map(door=>door.id)));
    setMode('tour');setTourId(previous=>previous+1);setHover('');
  };

  return <div className="house-viewer" ref={viewerRef}>
    <div className="viewer-toolbar" aria-label="3D viewing modes">
      <button className={mode==='overview'&&cameraPreset==='front'?'active':''} onClick={frontView}>Front view</button>
      <button className={mode==='overview'&&cameraPreset==='corner'?'active':''} onClick={()=>{overview();setCutaway(false);}}>Corner view</button>
      <button className={mode==='overview'&&cutaway?'active':''} onClick={()=>{overview(true);setCutaway(true);}}>All floors</button>
      <button className={mode==='tour'?'active':''} onClick={tour}>Guided tour</button>
      <button className={mode==='walk'?'active':''} onClick={walk}>Walk inside</button>
      <label><input type="checkbox" checked={furnished} onChange={e=>setFurnished(e.target.checked)}/> Interiors</label><label><input type="checkbox" checked={showServices} onChange={e=>setShowServices(e.target.checked)}/> Plumbing</label><label><input type="checkbox" checked={xray} onChange={e=>setXray(e.target.checked)}/> Transparent walls</label><button disabled={exporting||loading} onClick={downloadModel}>{exporting?'Exporting…':'Download 3D'}</button><button disabled={loading} onClick={downloadCamera}>Download camera settings</button>
    </div>
    {incompleteBathrooms.length>0&&<p className="scene-review" role="status">Review bathroom sizes: {incompleteBathrooms.map(r=>r.label+' (floor '+r.floor+')').join(', ')}. There is insufficient clear wall space for both basin and toilet; fittings that do not fit are omitted.</p>}
    <div className="site-toolbar">{onStyleChange&&<label>Facade<select aria-label="Facade style" value={plan.design?.style||""} onChange={e=>onStyleChange(e.target.value)}>{!FACADE_STYLES.some(s=>s.id===plan.design?.style)&&<option value={plan.design?.style||""}>Current regional style</option>}{FACADE_STYLES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}<button className="study-trigger" onClick={()=>document.fullscreenElement?document.exitFullscreen():viewerRef.current?.requestFullscreen()}>Full screen</button><label>Light<select aria-label="Presentation lighting" value={mood} onChange={e=>setMood(e.target.value)}><option value="recipe">Recipe lighting</option><option value="day">Clear daylight</option><option value="golden">Golden hour</option><option value="sunset">Sunset</option><option value="dusk">Dusk · warm house lights</option></select></label><label><input type="checkbox" checked={enhanced} onChange={e=>setEnhanced(e.target.checked)}/> Contact shadows</label><label><input type="checkbox" checked={reflections} onChange={e=>setReflections(e.target.checked)}/> Live reflections</label><label><input type="checkbox" checked={contextVisible} onChange={e=>setContextVisible(e.target.checked)}/> Surroundings</label><label>Room view <select aria-label="Look inside a room" value="" onChange={e=>{const r=plan.rooms.find(o=>o.id===e.target.value.replace(/^(shower|storage):/,''));if(!r)return;exitPointer();setMode('walk');setCommand(presentationPose(plan,r,layout,e.target.value.startsWith('shower:')?'shower':e.target.value.startsWith('storage:')?'storage':undefined));}}><option value="">Choose a room…</option>{plan.rooms.filter(r=>r.floor===floor&&!['portico','stairs','foyer','passage'].includes(r.kind)).map(r=><option key={r.id} value={r.id}>{r.label}</option>)}{plan.rooms.filter(r=>r.floor===floor&&roomFitments(plan,r,layout).some(f=>['wardrobe','prayer','upper','sideboard'].includes(f.kind))).map(r=><option key={'storage:'+r.id} value={'storage:'+r.id}>Storage & joinery · {r.label}</option>)}{plan.rooms.filter(r=>r.floor===floor&&r.kind==='bathroom'&&showerZone(r,layout)).map(r=><option key={'shower:'+r.id} value={'shower:'+r.id}>Shower & fittings · {r.label}</option>)}</select></label><button aria-expanded={study} className="study-trigger" onClick={()=>setStudy(!study)}>{study?'Close':'Open'} sun & breeze study</button></div>
    {contextVisible&&<p className="context-provenance">{plan.design?.siteContext?.edges.length||0} of {plotEdges(plan).length} boundaries recorded · distant streetscape and planting are illustrative. Edit nearby boundaries under Form → Plot & setbacks.</p>}
    {study&&<ClimatePanel study={inputs} onChange={setInputs} lat={site.latitude} lon={site.longitude} isDefault={!plan.design?.siteContext} elevation={sun.elevation} paths={paths.length} doors={!!openDoors.size} openDoors={()=>setOpenDoors(openDoors.size?new Set():new Set(layout.doors.filter(d=>!d.arch).map(d=>d.id)))}/>}
    <div className="house-canvas">
      <ViewerBoundary><Canvas shadows frameloop={mode==='overview'&&!openShelves.size&&!chimneyOn.size&&!study?'demand':'always'} gl={{preserveDrawingBuffer:true}} dpr={[1,1.7]} camera={{position:[plan.width*.85,plan.depth*.8,plan.depth*.9],fov:52,near:.05,far:Math.max(400,(plan.levels||1)*40)}}
        onCreated={({gl,scene,camera,invalidate})=>{sceneRef.current=scene;cameraRef.current=camera;canvasRef.current=gl.domElement;gl.toneMapping=ACESFilmicToneMapping;gl.toneMappingExposure=1.08;gl.shadowMap.type=PCFSoftShadowMap;if(import.meta.env.VITE_DEMO_MODE==='true')(window as any).__hcsDemoViewer={camera,scene,gl,invalidate};}}>
        <SceneActivity stamp={[mode,mood,cameraPreset,plan.design?.style,...openDoors,...openShelves].join('|')}/>
        <ExteriorLightRig plan={plan} choice={mood} extent={extent} study={study?sun:undefined}/>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,GROUND_LEVEL-.18,0]} receiveShadow><planeGeometry args={[2000,2000]}/><meshStandardMaterial color="#969c91" roughness={1}/></mesh>
        {study&&<ClimateOverlay paths={paths} shift={[-plan.width/2,0,-plan.depth/2]}/>}
        <HouseScene lightPower={exteriorLighting(mood,plan.design?.style).fixtures} contextVisible={contextVisible} plan={displayPlan} layout={layout} interactions={interactions} assets={assets} mode={mode} cutaway={cutaway} showServices={showServices} xray={xray}
          openDoors={openDoors} doorAngles={doorAngles} openShelves={openShelves} tvOn={tvOn} chimneyOn={chimneyOn} onInteract={interact}/>
        <InteriorLighting plan={displayPlan}/><InteriorReflections plan={displayPlan} layout={layout} enabled={reflections&&!cutaway&&!xray}/><CameraRig plan={plan} layout={layout} interactions={interactions} mode={mode} floor={floor} command={command} tourId={tourId}
          openDoors={openDoors} doorAngles={doorAngles} onInteract={interact} onHover={setHover} onTourDone={()=>overview()} onLockChange={setLocked}/>
        {enhanced&&<PresentationEffects/>}
        <OrbitControls enabled={mode==='overview'} enableDamping dampingFactor={.08} target={command?.look||[0,(plan.levels||1)*4,0]}
          minDistance={9} maxDistance={Math.max(150,(plan.levels||1)*25)} maxPolarAngle={Math.PI*(cameraPreset==='front'?.6:.52)}/>
      </Canvas></ViewerBoundary>
      {loading&&<div className="viewer-loading" role="status">Loading materials & models · {Math.round(progress)}%</div>}
      {mode==='walk'&&<><div className="viewer-crosshair">+</div><div className="viewer-interaction">{hover?`${hover} · E or click`:'Look at an object to interact'}</div>
        {!locked&&<button className="viewer-lock" onClick={()=>canvasRef.current?.requestPointerLock?.().catch(()=>{})}>Click to control the camera</button>}</>}
      {mode==='tour'&&<div className="viewer-tour-label">GUIDED HOUSE TOUR · FRONT → INTERIOR → ALL FLOORS</div>}
    </div>
    {exportError&&<p role="alert">{exportError}</p>}
    {canRender&&projectId&&<RenderPanel projectId={projectId} createScene={exportScene} camera={cameraPose}/>}
    <div className="viewer-help">
      {mode==='walk'?<><strong>W A S D</strong> move <span>·</span> <strong>Mouse</strong> look <span>·</span> <strong>Shift</strong> sprint <span>·</span> <strong>Space</strong> jump <span>·</span> <strong>C</strong> crouch <span>·</span> <strong>E</strong> interact <span>·</span> <strong>Esc</strong> release mouse</>:
        <><strong>Drag</strong> rotate <span>·</span> <strong>Scroll</strong> zoom <span>·</span> <strong>Right drag</strong> pan <span>·</span> Click sofa or window for a person’s view</>}
    </div>
  </div>;
}
