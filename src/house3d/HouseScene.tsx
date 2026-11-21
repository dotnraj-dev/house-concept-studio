import type {Selection} from '../workspace-state';
import {facadeStyle} from './facade-styles';
import {FacadeKit} from './facade-kit/FacadeKit';
import {RoomFitoutScene} from './RoomFitoutScene';
import {doorDesignFor,roomFitout,type DoorDesign} from '../fitout';
import {CEILING_LEVEL,GROUND_LEVEL} from '../building-dimensions';
import {TVJoinery,WovenRug,KitchenDetails,DiningDetails,BathroomDetails,VanityDetails,KitchenSink,KitchenStorage} from './InteriorDetails';
import {Block} from './Surface';
import {StaticBatcher} from './StaticBatcher';
import {InteriorKit,ModernHood} from './InteriorKit';
import {Architecture,EntryGarden} from './Architecture';
import {plotEdges} from '../site-context';
import {bathroomFixtures} from './bathroom';
import {HipRoof,SiteWorld,SiteFinish} from './SiteWorld';
import {palette} from '../regions';
import { ServiceScene } from './ServiceScene';
import {TerraceScene} from './TerraceScene';
import {openTerraceDepth,pitchedRoof} from '../terrace';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { DoubleSide, Object3D, type SpotLight, PlaneGeometry, Quaternion, RepeatWrapping, SRGBColorSpace, Vector2, Vector3, Shape, type Group } from 'three';
import type { Asset, Plan, Room } from '../types';
import { AssetModel, FreeModel, LibraryModel } from './Assets';
import { FLOOR_HEIGHT, furnishingFrame, type DoorSpec, type HouseLayout, type Interaction, type WindowSpec } from './layout';
import { type Surface } from './materials';
import { stairDimensions } from './stairs';
import { doorTargetAngle } from './doors';
import {facadePieces} from './facade';
import {livingFurniture,bedroomFurniture,diningFurniture,kitchenCounter} from './furniture';

type Mode='overview'|'walk'|'tour';
type Props={onSelect?:(selection:Selection)=>void;plan:Plan;layout:HouseLayout;interactions:Interaction[];assets:Asset[];mode:Mode;cutaway:boolean;contextVisible?:boolean;lightPower?:number;showServices?:boolean;xray?:boolean;
  openDoors:Set<string>;doorAngles:Map<string,number>;openShelves:Set<string>;tvOn:Set<string>;chimneyOn:Set<string>;onInteract:(id:string)=>void};

export {Block} from './Surface';

function Door({door,open,angles,style}:{door:DoorSpec;open:boolean;angles:Map<string,number>;style:DoorDesign}){
  const pivot=useRef<Group>(null);
  useFrame((_,delta)=>{if(pivot.current){pivot.current.rotation.y+=(doorTargetAngle(door,open)-pivot.current.rotation.y)*Math.min(1,delta*5);angles.set(door.id,pivot.current.rotation.y);}},-1);
  const base=door.floor*FLOOR_HEIGHT;
  const alongX=door.axis==='x';
  return <group position={[door.x,base,door.z]}>
    <Block position={[0,3.45,0]} size={[.19,6.9,.19]} color="#d8c5a7" surface="timber"/>
    <Block position={alongX?[door.width,3.45,0]:[0,3.45,door.width]} size={[.19,6.9,.19]} color="#d8c5a7" surface="timber"/>
    <Block position={alongX?[door.width/2,6.82,0]:[0,6.82,door.width/2]} size={alongX?[door.width+.19,.18,.22]:[.22,.18,door.width+.19]} color="#d8c5a7" surface="timber"/>
    <group ref={pivot} position={[alongX?.06:0,0,alongX?0:.06]} userData={{actionId:door.id,label:door.main?'Open / close entrance door':'Open / close room door'}}>
      <Block position={alongX?[door.width/2,3.35,0]:[0,3.35,door.width/2]} size={alongX?[door.width-.1,6.65,.13]:[.13,6.65,door.width-.1]} color={door.balcony?'#bad3d5':door.main?'#765136':'#ae8c66'} surface={door.balcony?undefined:'timber'} opacity={door.balcony?.2:1}/>
      {door.balcony&&[.12,door.width-.12].map(u=><Block key={u} position={alongX?[u,3.35,0]:[0,3.35,u]} size={alongX?[.1,6.65,.16]:[.16,6.65,.1]} color="#444a45"/>)}
      {(!door.balcony?(style==='panel'?[2.05,4.75]:style==='flush'?[1.4,5.65]:[]):[.08,6.62]).map(y=><Block key={y} position={alongX?[door.width/2,y,-.075]:[-.075,y,door.width/2]} size={alongX?[door.width-.25,door.balcony?.1:style==='flush'?.035:2.13,.035]:[.035,door.balcony?.1:style==='flush'?.035:2.13,door.width-.25]} color={door.balcony?'#444a45':'#c8aa7f'} surface={door.balcony?undefined:'timber'}/>)}
      {!door.balcony&&style==='slatted'&&Array.from({length:Math.floor(door.width/.16)},(_,i)=><Block key={'batten-'+i} position={alongX?[.12+i*.16,3.35,-.09]:[-.09,3.35,.12+i*.16]} size={alongX?[.09,6.4,.035]:[.035,6.4,.09]} color="#8d6b48" surface="timber"/>)}
      <Block position={alongX?[door.width*.83,3.25,-.18]:[-.18,3.25,door.width*.83]} size={alongX?[.13,.17,.25]:[.25,.17,.13]} color="#a98043" metalness={.65}/>
    </group>
  </group>;
}

function CurtainPanel({width,height,x}:{width:number;height:number;x:number}){
  const geometry=useMemo(()=>{
    const cloth=new PlaneGeometry(width,height,28,12);
    const positions=cloth.attributes.position;
    for(let i=0;i<positions.count;i++)positions.setZ(i,Math.sin((positions.getX(i)/width+.5)*Math.PI*10)*.085);
    cloth.computeVertexNormals();return cloth;
  },[width,height]);
  const maps=useTexture(['/assets/materials/fabric-normal.jpg','/assets/materials/fabric-roughness.jpg']);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(({clock})=>{
    const positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      const vx=positions.getX(i),falloff=.5-positions.getY(i)/height;
      positions.setZ(i,Math.sin((vx/width+.5)*Math.PI*10)*.085+Math.sin(clock.elapsedTime*.75+vx+x)*.045*falloff);
    }
    positions.needsUpdate=true;
  });
  return <mesh geometry={geometry} position={[x,0,.1]} castShadow receiveShadow userData={{dynamic:true}}>
    <meshStandardMaterial color="#ede8dc" normalMap={maps[0]} roughnessMap={maps[1]} normalScale={new Vector2(.24,.24)} roughness={1} side={DoubleSide}/>
  </mesh>;
}

function WindowJoinery({window:w,height:h,frameColor}:{window:WindowSpec;height:number;frameColor?:string}){
 const style=w.style||'casement',timber=style==='timber'||style==='heritage',sliding=style==='sliding',color=frameColor||(timber?'#9f7750':sliding?'#414d48':'#e5e7df'),width=w.width;
 const panelCount=Math.max(2,Math.ceil(width/(sliding?4:2.8))),panel=width/panelCount;
 return <group name={style+' window'}>
  {[-1,1].map(s=><group key={s}><Block position={[s*(width/2-.06),0,0]} size={[.12,h,.28]} color={color} surface={timber?'timber':undefined}/><Block position={[0,s*h/2,0]} size={[width+.12,.12,.28]} color={color} surface={timber?'timber':undefined}/></group>)}
  {style==='louvred'?Array.from({length:Math.max(3,Math.floor(h/.27))},(_,i)=><group key={i} position={[0,-h/2+.14+i*.27,0]} rotation={[.4,0,0]}><Block position={[0,0,0]} size={[width-.18,.29,.035]} color="#b6c8c2" opacity={.7}/></group>):
  Array.from({length:panelCount},(_,i)=><group key={i} position={[-width/2+(i+.5)*panel,0,sliding?i%2*.095:0]}>
   <Block position={[0,0,0]} size={[panel-.13,h-.17,.035]} color="#c1d3d3" opacity={.24} metalness={.12} roughness={.09}/>
   {[-1,1].map(s=><group key={s}><Block position={[s*(panel/2-.045),0,0]} size={[.075,h-.08,.16]} color={color} surface={timber?'timber':undefined}/><Block position={[0,s*(h/2-.06),0]} size={[panel-.03,.075,.16]} color={color} surface={timber?'timber':undefined}/></group>)}
   <Block position={[panel/2-.2,-.25,-.12]} size={[.045,.28,.08]} color={timber?'#b99b58':'#69746c'} metalness={.65}/>
   {style==='heritage'&&[-.22,.22].map(y=><Block key={y} position={[0,y*h,0]} size={[panel-.1,.045,.07]} color={color} surface="timber"/>)}
  </group>)}
  {timber&&<group position={[0,0,.19]}>{Array.from({length:Math.floor(width/.5)},(_,i)=><Block key={i} position={[-width/2+.28+i*.5,0,0]} size={[.025,h-.15,.025]} color="#434c45" metalness={.6}/>)}{[-.25,.25].map(y=><Block key={y} position={[0,y*h,0]} size={[width-.13,.025,.025]} color="#434c45" metalness={.6}/>)}</group>}
  <Block position={[0,-h/2-.08,0]} size={[width+.25,.10,frameColor?.28:.55]} color={frameColor||"#d8d3c6"} surface={frameColor?undefined:"quartz"}/>
 </group>;
}
function Window({window,assets,furnished,recipe}:{window:WindowSpec;assets:Asset[];furnished:boolean;recipe?:ReturnType<typeof facadeStyle>}){
  const base=window.floor*FLOOR_HEIGHT,height=window.height||3.4,half=height/2;
  const alongX=window.axis==='x';
  const x=window.x+(alongX?window.width/2:0),z=window.z+(alongX?0:window.width/2);
  return <group position={[x,base+(window.sill??3)+half,z]}>
    <group position={recipe?[-window.outward[0]*.14,0,-window.outward[1]*.14]:[0,0,0]} rotation={[0,alongX?0:Math.PI/2,0]}>
      <WindowJoinery window={window} height={height} frameColor={recipe?.trim}/>
    </group>
    {furnished&&<group position={[-window.outward[0]*.25,0,-window.outward[1]*.25]} rotation={[0,Math.atan2(-window.outward[0],-window.outward[1]),0]}>
      <Block position={[0,half+.22,.1]} size={[window.width+.65,.055,.055]} color="#6f6251" metalness={.55}/>
      {assets.some(asset=>asset.category.toLowerCase()==='curtain')?
        <AssetModel category="curtain" assets={assets} position={[0,-half,.18]} size={[window.width,height,.3]} fit="stretch"/>:
        <Suspense fallback={null}>{[-1,1].map(side=><CurtainPanel key={side} width={window.width*.26} height={height+.15} x={side*window.width*.47}/>)}</Suspense>}
    </group>}
  </group>;
}

function DiningChair({position,rotation,assets}:{position:[number,number,number];rotation:number;assets:Asset[]}){
  return <AssetModel category="chair" assets={assets} position={position} rotation={rotation} size={[1.6,3.1,1.8]}/>;
}

function Handrail({start,end}:{start:[number,number,number];end:[number,number,number]}){
  const from=new Vector3(...start),to=new Vector3(...end),direction=to.clone().sub(from);
  const quaternion=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),direction.clone().normalize());
  return <mesh position={from.clone().add(to).multiplyScalar(.5)} quaternion={quaternion} castShadow receiveShadow>
    <cylinderGeometry args={[.055,.055,direction.length(),10]}/><meshStandardMaterial color="#746253" metalness={.45} roughness={.35}/>
  </mesh>;
}

/** Room spotlights are only active where they can be seen: in the cutaway overview, or on the floor the
 * camera is on while walking/touring. Every active light adds cost to every lit pixel, so 14 always-on
 * room spots made the exterior view and walkthrough far slower without visible benefit. */
 function RoomLight({room,plan,interior,walking}:{room:Room;plan:Plan;interior:boolean;walking:boolean}){
  const target=useMemo(()=>new Object3D(),[]);
  const light=useRef<SpotLight>(null);
    useFrame(({camera,invalidate})=>{if(!light.current)return;const x=camera.position.x+plan.width/2,z=camera.position.z+plan.depth/2;const occupied=Math.floor((camera.position.y+.5)/FLOOR_HEIGHT)===room.floor&&x>=room.x-1&&x<=room.x+room.w+1&&z>=room.y-1&&z<=room.y+room.h+1;const on=interior&&(!walking||occupied);if(light.current.visible!==on){light.current.visible=on;invalidate();}});
  return <group position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT,room.y+room.h/2]}>
    <primitive object={target} position={[0,.1,0]}/>
    <spotLight ref={light} visible={false} position={[0,CEILING_LEVEL-.5,0]} target={target} color="#fff2df" intensity={48} angle={1.12} penumbra={.72} castShadow={false}
      distance={24} decay={2} shadow-mapSize={[512,512]} shadow-bias={-.0008} shadow-normalBias={.025}/>
    {['living','lounge','dining'].includes(room.kind)&&[-1,1].flatMap(a=>[-1,1].map(b=><group key={a+'-'+b} position={[a*room.w*.31,CEILING_LEVEL-.1,b*room.h*.31]}><mesh><cylinderGeometry args={[.19,.19,.04,20]}/><meshStandardMaterial color="#eee8d9" emissive="#ffd9a0" emissiveIntensity={1.8}/></mesh></group>))}
    <mesh position={[room.w*.26,CEILING_LEVEL-.18,room.h*.23]}><cylinderGeometry args={[.4,.4,.065,24]}/><meshStandardMaterial color="#fff4d9" emissive="#ffe2a9" emissiveIntensity={1.1}/></mesh>
  </group>;
}

function Chimney({position,on,assets}:{position:[number,number,number];on:boolean;assets:Asset[]}){
  const fan=useRef<Group>(null);
  useFrame((_,delta)=>{if(fan.current&&on)fan.current.rotation.y+=delta*9;});
  return <group position={position}>
    {assets.some(a=>a.category.toLowerCase()==='chimney')?<AssetModel category="chimney" assets={assets} position={[0,0,0]} size={[2.6,3.2,1.5]}/>:<ModernHood size={[2.6,3.2,1.5]}/>}
    {assets.some(a=>a.category.toLowerCase()==='chimney')&&<group ref={fan} position={[0,-.08,0]}><Block position={[0,0,0]} size={[1.3,.06,.22]} color="#333b39"/><Block position={[0,0,0]} size={[.22,.06,1.3]} color="#333b39"/></group>}
    {on&&<pointLight position={[0,-.6,0]} color="#fff3cf" intensity={9} distance={8}/>}
  </group>;
}

function Furniture({room,sourceRoom,frameAngle,plan,layout,assets,openShelves,tvOn,chimneyOn,toiletStyle,furnished=true,shoeRack=true}:{layout:HouseLayout;furnished?:boolean;shoeRack?:boolean;room:Room;sourceRoom:Room;frameAngle:number;plan:Plan;assets:Asset[];openShelves:Set<string>;tvOn:Set<string>;chimneyOn:Set<string>;toiletStyle:Plan['toiletStyle']}){
  const base=room.floor*FLOOR_HEIGHT,cx=room.x+room.w/2,cz=room.y+room.h/2;
  const item=(key:string,footprint:{x:number;z:number;w:number;d:number})=>{const edit=plan.editor?.data.objects[`furniture-${sourceRoom.id}-${key}`];if(edit===null)return null;if(!edit)return {...footprint,rotation:0};const dx=edit.x-sourceRoom.x-sourceRoom.w/2,dz=edit.y-sourceRoom.y-sourceRoom.h/2,c=Math.cos(frameAngle),s=Math.sin(frameAngle);return {...footprint,x:c*dx-s*dz,z:s*dx+c*dz,w:edit.w,d:edit.h,rotation:edit.angle-frameAngle};};
  const identity=(key:string,label:string)=>{const id=`furniture-${sourceRoom.id}-${key}`;return {editorObjectId:id,editorObjectLabel:label,roomId:plan.editor?.data.objects[id]?.roomId||sourceRoom.id};};
  if(room.kind==='living'||room.kind==='lounge'){
    const original=livingFurniture(room),sofa=item('sofa',original.sofa),rug=item('rug',original.rug),coffee=item('coffee',original.coffee),tv=item('tv',original.tv),plant=item('plant',{x:room.x+room.w-1.05,z:room.y+room.h-1.1,w:.9,d:.9});

    return <group>
      {rug&&<group userData={identity('rug','Rug')} position={[rug.x,0,rug.z]} rotation={[0,rug.rotation,0]}><Suspense fallback={null}><WovenRug x={0} z={0} w={rug.w} d={rug.d} base={base}/></Suspense></group>}
      {sofa&&<group userData={identity('sofa','Sofa')}><AssetModel category="sofa" assets={assets} position={[sofa.x,base+.1,sofa.z]} size={[sofa.w,2.7,sofa.d]} rotation={Math.PI+sofa.rotation}/></group>}
      {tv&&<group userData={identity('tv','TV')} position={[tv.x,0,tv.z]} rotation={[0,tv.rotation,0]}><Block position={[0,base+4.1,0]} size={[tv.w,2.15,tv.d]} color="#181e20" metalness={.16}/><Block position={[0,base+4.1,.11]} size={[Math.max(.5,tv.w-.22),1.91,.04]} color={tvOn.has(`tv-${room.id}`)?'#9cb6bd':'#13191b'} emissive={tvOn.has(`tv-${room.id}`)?'#2f7284':undefined}/></group>}
      <TVJoinery room={room}/>
      {coffee&&<group userData={identity('coffee','Coffee table')}><AssetModel category="coffee" assets={assets} position={[coffee.x,base+.1,coffee.z]} size={[coffee.w,1.4,coffee.d]} rotation={coffee.rotation}/></group>}

      {plant&&<group userData={identity('plant','Plant')}><AssetModel category="plant" assets={assets} position={[plant.x,base+.1,plant.z]} size={[plant.w,2.1,plant.d]}/></group>}
    </group>;
  }
  if(room.kind==='dining'){const original=diningFurniture(room),table=item('table',original);return <group>
    {table&&<group userData={identity('table','Dining table')}><AssetModel category="dining" assets={assets} position={[table.x,base+.1,table.z]} size={[table.w,2.5,table.d]} fit="stretch" rotation={table.rotation}/><DiningDetails {...table} base={base}/></group>}
    {original.chairs.map((chair,i)=>{const current=item(`chair-${i}`,chair);return current?<group key={i} userData={identity(`chair-${i}`,`Dining chair ${i+1}`)}><DiningChair assets={assets} position={[current.x,base,current.z]} rotation={chair.rotation+current.rotation}/></group>:null;})}
  </group>;}
  if(room.kind==='bedroom'){const bed=item('bed',bedroomFurniture(room)),plant=item('plant',{x:room.x+room.w-1.05,z:room.y+room.h-1.05,w:.8,d:.8});return <group>
    {bed&&<group userData={identity('bed','Bed')}><AssetModel category="bed" assets={assets} position={[bed.x,base+.1,bed.z]} size={[bed.w,2.7,bed.d]} rotation={bed.rotation}/></group>}

    {plant&&<group userData={identity('plant','Plant')}><AssetModel category="plant" assets={assets} position={[plant.x,base+.1,plant.z]} size={[plant.w,1.9,plant.d]}/></group>}
  </group>;}
  if(room.kind==='kitchen'){const q=kitchenCounter(room);return <group>
    <KitchenStorage room={room} open={openShelves.has(`shelf-${room.id}`)}/>
    <Block position={[q.x,base+2.99,q.z]} size={[q.w,.14,1.85]} color="#1b1c1f" surface="quartz"/><KitchenDetails room={room} hasWindows={layout.windows.some(w=>w.roomId===room.id)}/>
    <KitchenSink position={[q.sinkX,base+3.075,q.z]}/>

    <Chimney position={[q.hobX,base+5.4,room.y+room.h-1]} on={chimneyOn.has(`chimney-${room.id}`)} assets={assets}/>
    <Block position={[q.hobX,base+3.09,room.y+room.h-.82]} size={[2.0,.04,1.3]} color="#292d2e"/>
  </group>;}
  if(room.kind==='bathroom')return <group>{bathroomFixtures(room,layout).map(f=><group key={f.kind} position={[f.x,base+.08,f.z]} rotation={[0,f.angle,0]}>
    {f.kind==='basin'?<><AssetModel category="basin" assets={assets} position={[0,0,0]} size={[f.width,2.85,f.depth]}/><Block position={[0,4.65,-f.depth/2+.17]} size={[1.72,2.1,.10]} color="#786756"/><Block position={[0,4.65,-f.depth/2+.235]} size={[1.58,1.96,.035]} color="#dce3df" metalness={1} roughness={.025}/><VanityDetails depth={f.depth}/></>:toiletStyle==='indian'?<><Block position={[0,.07,0]} size={[1.75,.14,2.2]} color="#f2efea"/><mesh position={[0,.147,0]} rotation={[-Math.PI/2,0,0]} scale={[.44,.75,1]}><circleGeometry args={[1,32]}/><meshStandardMaterial color="#b1c0ba"/></mesh></>:<AssetModel category="toilet" assets={assets} position={[0,0,0]} size={[f.width,2.55,f.depth]}/>}
  </group>)}<BathroomDetails room={room} layout={layout}/></group>;
  if(room.kind==='foyer')return furnished&&shoeRack?<group><Block solid position={[room.x+.25,base+1.05,room.y+room.h-.7]} size={[.4,2.1,1.2]} color="#ba9a74" surface="timber"/></group>:null;
  if(room.kind==='stairs'){
    const {front,back,run,steps,rise,flightWidth}=stairDimensions(room);
    return <group position={[0,base,0]}><Block position={[cx,-.13,room.y+front/2]} size={[room.w,.26,front]} color="#eee4d2" surface="stone"/>
      {Array.from({length:steps},(_,i)=><group key={i}>
        <Block position={[room.x+.3+flightWidth/2,(i+1)*rise-.09,room.y+front+(i+.5)*run/steps]}
          size={[flightWidth,.18,run/steps+.025]} color="#eee4d2" surface="stone"/>
        <Block position={[room.x+room.w-.3-flightWidth/2,FLOOR_HEIGHT/2+(i+1)*rise-.09,room.y+back-(i+.5)*run/steps]}
          size={[flightWidth,.18,run/steps+.025]} color="#eee4d2" surface="stone"/>
      </group>)}
      <Block position={[cx,FLOOR_HEIGHT/2-.13,room.y+(back+room.h)/2]} size={[room.w-.3,.26,room.h-back]} color="#eee4d2" surface="stone"/>
      {[room.x+.3,room.x+room.w/2-.1].map(x=><Handrail key={x} start={[x,2.8,room.y+front]} end={[x,FLOOR_HEIGHT/2+2.8,room.y+back]}/>)}
      {[room.x+room.w/2+.1,room.x+room.w-.3].map(x=><Handrail key={x} start={[x,FLOOR_HEIGHT/2+2.8,room.y+back]} end={[x,FLOOR_HEIGHT+2.8,room.y+front]}/>)}
      {[0,.5,1].flatMap(t=>[room.x+.3,room.x+room.w-.3].map((x,index)=>{
        const height=index===0?t*FLOOR_HEIGHT/2:(2-t)*FLOOR_HEIGHT/2;
        return <Block key={`${t}-${x}`} position={[x,height+1.4,room.y+front+t*run]} size={[.07,2.8,.07]} color="#827568" metalness={.4}/>;
      }))}
    </group>;
  }
  if(room.kind==='portico')return <group>
    {furnished&&<AssetModel category="car" assets={assets} position={[cx,base+.1,cz]} size={[Math.min(6.3,room.w-1.3),4.6,Math.min(14.5,room.h-1.5)]}/>}
    {[room.x+.35,room.x+room.w-.35].map(x=><Block solid key={x} position={[x,base+4.3,room.y+.35]} size={[.46,8.6,.46]} color="#ede3d2" surface="stone"/>)}
  </group>;
  if(room.kind==='terrace')return <group>
    {[-1,1].map(side=><LibraryModel key={side} file="terracechair/plastic_monobloc_chair_01.glb" position={[cx+side*1.35,base+.1,room.y+1.25]} size={[1.9,2.75,1.9]} rotation={Math.PI+side*.25}/>)}
    {room.h>6&&<AssetModel category="plant" assets={assets} position={[room.x+1.1,base+.1,room.y+room.h-1.1]} size={[1.3,2.6,1.3]}/>}
  </group>;
  return null;
}

function Site({plan,boundary=true}:{plan:Plan;boundary?:boolean}){
 const polygon=plotEdges(plan);
 const shape=useMemo(()=>{const sh=new Shape();polygon.forEach((p,i)=>i?sh.lineTo(p.x-plan.offsetX,-p.y+plan.offsetY):sh.moveTo(p.x-plan.offsetX,-p.y+plan.offsetY));sh.closePath();return sh;},[plan]);
 return <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,GROUND_LEVEL-.06,0]} receiveShadow><shapeGeometry args={[shape]}/><Suspense fallback={<meshStandardMaterial color="#a2af8c"/>}><SiteFinish type="lawn" repeat={[.15,.15]}/></Suspense></mesh>{boundary&&polygon.map((p,i)=>{const q=polygon[(i+1)%polygon.length],dx=q.x-p.x,dz=q.y-p.y,length=Math.hypot(dx,dz);if((plan.design?.siteContext?.edges.find(e=>e.edge===p.id)?.use|| (p.road?'road':'open'))==='road')return null;return <group key={i} position={[(p.x+q.x)/2-plan.offsetX,GROUND_LEVEL+1.1,(p.y+q.y)/2-plan.offsetY]} rotation={[0,-Math.atan2(dz,dx),0]}><Block position={[0,0,0]} size={[length,2.2,.25]} color="#d8d0bd" surface="stone"/></group>;})}</group>;
}

export function HouseScene({onSelect,plan,layout,interactions,assets,mode,cutaway,contextVisible=true,lightPower=1,showServices=false,xray=false,openDoors,doorAngles,openShelves,tvOn,chimneyOn,onInteract}:Props){
  const floorCount=plan.levels||Math.max(1,...plan.rooms.map(r=>r.floor+1));
  const finish=palette(plan.design?.style),kit=!!facadeStyle(plan.design?.style);
  const furnished=plan.design?.furnished!==false;
  const shellCutaway=mode==='overview'&&cutaway;
  return <group name="HouseExport" userData={{exportRoot:true}} position={[-plan.width/2,0,-plan.depth/2]} onClick={event=>{
      if(mode!=='overview'||!onSelect)return;
      event.stopPropagation();
      let node=event.object;
      while(node){if(node.userData.siteContext){onSelect({kind:'site'});return;}if(node.userData.editorObjectId){onSelect({kind:'object',id:node.userData.editorObjectId,label:node.userData.editorObjectLabel,roomId:node.userData.roomId});return;}if(node.userData.roomId){onSelect({kind:'room',id:node.userData.roomId});return;}if(!node.parent)break;node=node.parent;}
      if(event.point.y<GROUND_LEVEL+.2){onSelect({kind:'site'});return;}
      const x=event.point.x+plan.width/2+Math.sign(event.camera.position.x-event.point.x)*.08;
      const z=event.point.z+plan.depth/2+Math.sign(event.camera.position.z-event.point.z)*.08;
      const f=Math.floor(Math.max(0,event.point.y)/FLOOR_HEIGHT);
      const inside=plan.rooms.find(r=>r.floor===f&&x>r.x&&x<r.x+r.w&&z>r.y&&z<r.y+r.h);
      onSelect(inside?{kind:'room',id:inside.id}:{kind:'facade'});
    }}><StaticBatcher/>
    <Site plan={plan} boundary={!kit}/>{!shellCutaway&&!kit&&<><Architecture plan={plan} layout={layout} assets={assets}/><EntryGarden plan={plan} layout={layout} assets={assets}/></>}{!shellCutaway&&kit&&<><Suspense fallback={null}><FacadeKit plan={plan} layout={layout} servicesVisible={showServices} lightPower={lightPower}/></Suspense><EntryGarden plan={plan} layout={layout} assets={assets} pathOnly/></>}{contextVisible&&<group userData={{siteContext:true}} position={[0,GROUND_LEVEL,0]}><SiteWorld plan={plan}/></group>}
    <Block position={[plan.width/2,GROUND_LEVEL/2,plan.depth/2]} size={[plan.width,-GROUND_LEVEL,plan.depth]} color="#ddd8ce" surface="concrete"/>
    {plan.rooms.filter(room=>room.floor>0&&room.kind!=='stairs').map(room=><Block key={`slab-${room.id}`}
      position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT-.17,room.y+room.h/2]} size={[room.w,.34,room.h]} color="#ddd8ce" surface="concrete" opacity={shellCutaway ? .56 : 1}/>)}
    {plan.rooms.map(room=><group key={room.id} userData={{roomId:room.id}}>
      {!(room.kind==='stairs'&&room.floor>0)&&<Block position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT+.035,room.y+room.h/2]} size={[room.w,.07,room.h]}
        color={room.kind==='bathroom'?'#ffffff':room.kind==='portico'?'#dedbd3':room.kind==='terrace'?'#e5ddd0':'#fff9ef'}
        surface={room.kind==='bathroom'?'bathfloor':room.kind==='portico'?'concrete':plan.design?.floorFinish==='woodfloor'?'woodfloor':'porcelain'}/>}
      {(furnished||['kitchen','bathroom','stairs','pooja','utility','foyer','portico'].includes(room.kind))&&(()=>{const frame=furnishingFrame(plan,room);const rotate=!['portico','foyer','bathroom'].includes(room.kind);return <group position={rotate?[room.x+room.w/2,0,room.y+room.h/2]:[0,0,0]} rotation={[0,rotate?frame.angle:0,0]}><Furniture layout={layout} plan={plan} sourceRoom={room} frameAngle={rotate?frame.angle:0} room={rotate?frame.local:room} assets={assets} openShelves={openShelves} tvOn={tvOn} chimneyOn={chimneyOn} furnished={furnished} shoeRack={plan.design?.shoeRack} toiletStyle={plan.design?.roomRequests.find(q=>q.id===room.id)?.toiletStyle||(plan.toiletStyle==='both'?(plan.rooms.filter(r=>r.kind==='bathroom').findIndex(r=>r.id===room.id)%2?'indian':'western'):plan.toiletStyle)}/></group>;})()}
      <RoomFitoutScene assets={assets} plan={plan} room={room} layout={layout} open={openShelves} hideHigh={shellCutaway}/>
       <InteriorKit plan={plan} room={room} layout={layout} interior={cutaway} walking={false} hideHigh={shellCutaway}/>
      {!shellCutaway&&!['portico','terrace','stairs'].includes(room.kind)&&<Block position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT+CEILING_LEVEL,room.y+room.h/2]} size={[room.w,.10,room.h]} color="#faf8f0" surface="paint" opacity={xray?.18:1}/>}
       {!['portico','terrace','stairs'].includes(room.kind)&&room.floor<8&&<RoomLight room={room} plan={plan} interior={mode!=='overview'||cutaway} walking={mode!=='overview'}/>}
      {!kit&&room.floor>0&&room.kind==='terrace'&&<>
        {room.y===0&&<Block position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT+1.8,room.y+.15]} size={[room.w,3.5,.14]} color="#bed3d0" opacity={.48}/>}
        {room.x===0&&<Block position={[room.x,room.floor*FLOOR_HEIGHT+1.8,room.y+room.h/2]} size={[.14,3.5,room.h]} color="#bed3d0" opacity={.48}/>}
        {room.x+room.w>=plan.width-.05&&<Block position={[plan.width,room.floor*FLOOR_HEIGHT+1.8,room.y+room.h/2]} size={[.14,3.5,room.h]} color="#bed3d0" opacity={.48}/>}
        {room.y+room.h>=plan.depth-.05&&<Block position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT+1.8,plan.depth]} size={[room.w,3.5,.14]} color="#bed3d0" opacity={.48}/>}
      </>}
    </group>)}
    {Object.values(plan.editor?.data.objects||{}).filter((v):v is NonNullable<typeof v>=>!!v&&!v.id.startsWith('furniture-')&&!['art','wardrobe','fridge','upper','shelves','loft','ac','prayer','laundry','sideboard'].includes(v.kind)).map(v=><group key={v.id} name={v.label} userData={{editorObjectId:v.id,editorObjectLabel:v.label,roomId:v.roomId}} position={[v.x,v.floor*FLOOR_HEIGHT,v.y]} rotation={[0,v.angle,0]}>{v.kind==='painting'?<><Block position={[0,4.7,0]} size={[v.w,2,.11]} color="#9b7652" surface="timber"/><Block position={[0,4.7,.065]} size={[v.w-.24,1.76,.025]} color="#d9d4c4"/></>:v.kind==='lamp'?<><mesh position={[0,.12,0]}><cylinderGeometry args={[.4,.43,.24,24]}/><meshStandardMaterial color="#a98b5d" metalness={.5}/></mesh><Block position={[0,2,0]} size={[.08,3.8,.08]} color="#a98b5d" metalness={.5}/><mesh position={[0,4,0]}><coneGeometry args={[.6,.8,32,1,true]}/><meshStandardMaterial color="#eee3ce" side={DoubleSide}/></mesh></>:<AssetModel category={v.kind==='table'?'coffee':v.kind==='stool'?'chair':v.kind as 'chair'|'sofa'|'plant'} assets={assets} position={[0,.04,0]} size={[v.w,2.6,v.h]}/>}</group>)}
    {layout.walls.filter(wall=>!(shellCutaway&&wall.exterior&&wall.z<.25&&wall.d<.4)).map(wall=><Block key={wall.id}
      position={[wall.x+wall.w/2,wall.floor*FLOOR_HEIGHT+wall.bottom+wall.height/2,wall.z+wall.d/2]}
      size={[wall.w,wall.height,wall.d]} color={wall.exterior?(facadeStyle(plan.design?.style)?.wall||finish.wall):'#f6f1e6'} neutralBase={wall.exterior&&kit} opacity={xray?.18:1} surface={plan.design?.wallFinish==='stone'?'stone':plan.design?.wallFinish==='timber'?'timber':'paint'}/>)}
    {plan.rooms.filter(r=>r.kind==='bathroom').flatMap(room=>layout.walls.filter(w=>w.rooms?.includes(room.id)).map(w=>{
      const along=w.w>w.d,cx=w.x+w.w/2,cz=w.z+w.d/2,side=along?(room.y+room.h/2>cz?1:-1):(room.x+room.w/2>cx?1:-1);
      return <Block key={'wet-'+room.id+'-'+w.id} position={[cx+(along?0:side*(w.w/2+.008)),room.floor*FLOOR_HEIGHT+w.bottom+w.height/2,cz+(along?side*(w.d/2+.008):0)]} size={along?[w.w,w.height,.014]:[.014,w.height,w.d]} color="#ffffff" surface="bathwall" opacity={xray?.18:1}/>;
    }))}
    {layout.walls.filter(w=>w.bottom===0&&w.height>1).map(w=><Block key={'skirt-'+w.id} position={[w.x+w.w/2,w.floor*FLOOR_HEIGHT+.18,w.z+w.d/2]} size={[w.w+.015,.25,w.d+.035]} color="#bfb6a8" surface="limestone"/>)}
    {layout.doors.filter(door=>!door.arch).map(door=><Door key={door.id} door={door} open={openDoors.has(door.id)} angles={doorAngles} style={doorDesignFor(plan,door)}/>)}
    {layout.windows.map(window=><Window key={window.id} window={window} assets={assets} recipe={roomFitout(plan,plan.rooms.find(r=>r.id===window.roomId)!).window==='auto'?facadeStyle(plan.design?.style):undefined} furnished={furnished&&!plan.rooms.some(r=>r.id===window.roomId&&r.kind==='bathroom')}/>)}
    {!kit&&!shellCutaway&&facadePieces(plan,layout).map(piece=><Block key={piece.id} position={piece.position} size={piece.size} color={piece.surface==='timber'?finish.trim:piece.color} surface={piece.surface}/>)}
    {!kit&&!shellCutaway&&(!plan.design?.roof||plan.design.roof==='flat')&&<>
      {[0,plan.width].map(x=><Block key={x} position={[x,floorCount*FLOOR_HEIGHT+.75,plan.depth/2]} size={[.4,1.25,plan.depth+1]} color="#ded8ce"/>)}
      {[0,plan.depth].map(z=><Block key={z} position={[plan.width/2,floorCount*FLOOR_HEIGHT+.75,z]} size={[plan.width+1,1.25,.4]} color="#ded8ce"/>)}
    </>}
    {!shellCutaway&&<TerraceScene plan={plan} layout={layout} includeDeck={!kit||pitchedRoof(plan)}/>}
    {!kit&&plan.design?.roof&&plan.design.roof!=='flat'&&!shellCutaway&&<HipRoof w={plan.width} d={plan.depth} base={floorCount*FLOOR_HEIGHT} pitch={finish.pitch||.46} eave={finish.eave} color={finish.roof} rearTerraceDepth={openTerraceDepth(plan)}/>}
    {showServices&&<ServiceScene plan={plan}/>}
    {interactions.map(item=><mesh key={item.id} position={[item.x,item.floor*FLOOR_HEIGHT+item.y,item.z]}
      userData={{interactionId:item.id,label:item.label}} onClick={event=>{if(mode!=='overview')return;event.stopPropagation();onInteract(item.id);}}>
      <boxGeometry args={item.size}/><meshBasicMaterial transparent opacity={.002} depthWrite={false} side={DoubleSide}/>
    </mesh>)}
  </group>;
}
