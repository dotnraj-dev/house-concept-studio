import {plotEdges} from '../site-context';
import {bathroomFixtures} from './bathroom';
import {HipRoof,SiteWorld,SiteFinish} from './SiteWorld';
import {palette} from '../regions';
import { ServiceScene } from './ServiceScene';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { DoubleSide, Object3D, PlaneGeometry, Quaternion, RepeatWrapping, SRGBColorSpace, Vector2, Vector3, Shape, type Group } from 'three';
import type { Asset, Plan, Room } from '../types';
import { AssetModel, FreeModel } from './Assets';
import { FLOOR_HEIGHT, shelfSpot, furnishingFrame, type DoorSpec, type HouseLayout, type Interaction, type WindowSpec } from './layout';
import { PBR_SURFACES, surfaceTexture, type PbrSurface, type Surface } from './materials';
import { stairDimensions } from './stairs';
import { doorTargetAngle } from './doors';
import {facadePieces} from './facade';
import {livingFurniture,bedroomFurniture,diningFurniture} from './furniture';

type Mode='overview'|'walk'|'tour';
type Props={plan:Plan;layout:HouseLayout;interactions:Interaction[];assets:Asset[];mode:Mode;cutaway:boolean;contextVisible?:boolean;showServices?:boolean;xray?:boolean;
  openDoors:Set<string>;doorAngles:Map<string,number>;openShelves:Set<string>;tvOn:Set<string>;chimneyOn:Set<string>;onInteract:(id:string)=>void};

function PbrMaterial({surface,size,color,metalness,opacity,emissive}:{surface:PbrSurface;size:[number,number,number];color:string;metalness:number;opacity:number;emissive?:string}){
  const paths=['color','normal','roughness'].map(name=>`/assets/materials/${surface}-${name}.jpg`);
  const loaded=useTexture(paths);
  const maps=useMemo(()=>loaded.map((source,index)=>{
    const texture=source.clone();
    texture.wrapS=texture.wrapT=RepeatWrapping;
    texture.repeat.set(Math.max(.15,(size[1]>1?Math.max(size[0],size[2]):size[0])/5),Math.max(.15,(size[1]>1?size[1]:size[2])/5));
    texture.anisotropy=8;
    if(index===0)texture.colorSpace=SRGBColorSpace;
    texture.needsUpdate=true;
    return texture;
  }),[loaded[0],loaded[1],loaded[2],size[0],size[1],size[2]]);
  useEffect(()=>()=>maps.forEach(map=>map.dispose()),[maps]);
  return <meshStandardMaterial color={color} map={maps[0]} normalMap={maps[1]} normalScale={new Vector2(.35,.35)} roughnessMap={maps[2]}
    roughness={surface==='woodfloor' ? .85 : .95} metalness={metalness} transparent={opacity<1} opacity={opacity}
    emissive={emissive||'#000000'} emissiveIntensity={emissive ? .35 : 0}/>;
}

function Block({position,size,color,metalness=0,opacity=1,emissive,surface,solid=false}:{position:[number,number,number];size:[number,number,number];color:string;metalness?:number;opacity?:number;emissive?:string;surface?:Surface;solid?:boolean}){
  const pbr=surface&&PBR_SURFACES.includes(surface as PbrSurface);
  const map=useMemo(()=>surface&&!pbr?surfaceTexture(surface,size):null,[surface,pbr,size[0],size[1],size[2]]);
  useEffect(()=>()=>{map?.dispose();},[map]);
  return <mesh userData={{solid}} position={position} castShadow={opacity===1} receiveShadow><boxGeometry args={size}/>
    {pbr?<Suspense fallback={<meshStandardMaterial color={color}/>}><PbrMaterial surface={surface as PbrSurface} size={size} color={color}
      metalness={metalness} opacity={opacity} emissive={emissive}/></Suspense>:
      <meshStandardMaterial color={color} map={map} metalness={metalness} roughness={opacity<1 ? .12 : surface==='concrete' ? .88 : .78}
        transparent={opacity<1} opacity={opacity} emissive={emissive||'#000000'} emissiveIntensity={emissive ? .35 : 0}/>}
  </mesh>;
}

function Door({door,open,angles}:{door:DoorSpec;open:boolean;angles:Map<string,number>}){
  const pivot=useRef<Group>(null);
  useFrame((_,delta)=>{if(pivot.current){pivot.current.rotation.y+=(doorTargetAngle(door,open)-pivot.current.rotation.y)*Math.min(1,delta*5);angles.set(door.id,pivot.current.rotation.y);}},-1);
  const base=door.floor*FLOOR_HEIGHT;
  const alongX=door.axis==='x';
  return <group position={[door.x,base,door.z]}>
    <Block position={[0,3.45,0]} size={[.19,6.9,.19]} color="#d8c5a7" surface="timber"/>
    <Block position={alongX?[door.width,3.45,0]:[0,3.45,door.width]} size={[.19,6.9,.19]} color="#d8c5a7" surface="timber"/>
    <Block position={alongX?[door.width/2,6.82,0]:[0,6.82,door.width/2]} size={alongX?[door.width+.19,.18,.22]:[.22,.18,door.width+.19]} color="#d8c5a7" surface="timber"/>
    <group ref={pivot} position={[alongX?.06:0,0,alongX?0:.06]} userData={{actionId:door.id,label:door.main?'Open / close entrance door':'Open / close room door'}}>
      <Block position={alongX?[door.width/2,3.35,0]:[0,3.35,door.width/2]} size={alongX?[door.width-.1,6.65,.13]:[.13,6.65,door.width-.1]} color={door.main?'#c5a078':'#d4b58f'} surface="timber"/>
      {[2.05,4.75].map(y=><Block key={y} position={alongX?[door.width/2,y,-.075]:[-.075,y,door.width/2]} size={alongX?[door.width-.5,2.13,.035]:[.035,2.13,door.width-.5]} color="#e5cead" surface="timber"/>)}
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
  return <mesh geometry={geometry} position={[x,0,.1]} castShadow receiveShadow>
    <meshStandardMaterial color="#ede8dc" normalMap={maps[0]} roughnessMap={maps[1]} normalScale={new Vector2(.24,.24)} roughness={1} side={DoubleSide}/>
  </mesh>;
}

function Window({window,assets,furnished}:{window:WindowSpec;assets:Asset[];furnished:boolean}){
  const base=window.floor*FLOOR_HEIGHT;
  const alongX=window.axis==='x';
  const x=window.x+(alongX?window.width/2:0),z=window.z+(alongX?0:window.width/2);
  return <group position={[x,base+4.7,z]}>
    <Block position={[0,0,0]} size={alongX?[window.width,3.35,.18]:[.18,3.35,window.width]} color="#c2d7da" opacity={.16}/>
    <Block position={[0,0,0]} size={alongX?[.07,3.4,.25]:[.25,3.4,.07]} color="#e5e6df"/>
    <Block position={[0,0,0]} size={alongX?[window.width,.07,.25]:[.25,.07,window.width]} color="#e5e6df"/>
    {[-1,1].map(side=><Block key={`edge-${side}`} position={[0,side*1.7,0]} size={alongX?[window.width+.25,.12,.28]:[.28,.12,window.width+.25]} color="#ebe7dd"/>)}
    {[-1,1].map(side=><Block key={side} position={alongX?[side*(window.width/2-.1),0,.12]:[.12,0,side*(window.width/2-.1)]}
      size={alongX?[.35,3.5,.2]:[.2,3.5,.35]} color="#a78070" opacity={.9}/>)}
    {furnished&&<group position={[-window.outward[0]*.25,0,-window.outward[1]*.25]} rotation={[0,Math.atan2(-window.outward[0],-window.outward[1]),0]}>
      <Block position={[0,1.95,.1]} size={[window.width+.65,.055,.055]} color="#6f6251" metalness={.55}/>
      {assets.some(asset=>asset.category.toLowerCase()==='curtain')?
        <AssetModel category="curtain" assets={assets} position={[0,-1.6,.18]} size={[window.width,3.4,.3]} fit="stretch"/>:
        <Suspense fallback={null}>{[-1,1].map(side=><CurtainPanel key={side} width={window.width*.26} height={3.55} x={side*window.width*.47}/>)}</Suspense>}
    </group>}
  </group>;
}

function Shelf({position,open,assets}:{position:[number,number,number];open:boolean;assets:Asset[]}){
  return <group position={position}>
    <AssetModel category="shelf" assets={assets} position={[0,.1,0]} size={[1.8,4.7,1.15]} rotation={Math.PI/2} fit="stretch" open={open}/>
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

function RoomLight({room}:{room:Room}){
  const target=useMemo(()=>new Object3D(),[]);
  return <group position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT,room.y+room.h/2]}>
    <primitive object={target} position={[0,.1,0]}/>
    <spotLight position={[0,8.05,0]} target={target} color="#fff2df" intensity={65} angle={1.12} penumbra={.72} castShadow={['living','lounge'].includes(room.kind)}
      distance={24} decay={2} shadow-mapSize={[512,512]} shadow-bias={-.0008} shadow-normalBias={.025}/>
    <mesh position={[0,8.18,0]}><cylinderGeometry args={[.4,.4,.065,24]}/><meshStandardMaterial color="#fff4d9" emissive="#ffe2a9" emissiveIntensity={1.1}/></mesh>
  </group>;
}

function Chimney({position,on,assets}:{position:[number,number,number];on:boolean;assets:Asset[]}){
  const fan=useRef<Group>(null);
  useFrame((_,delta)=>{if(fan.current&&on)fan.current.rotation.y+=delta*9;});
  return <group position={position}>
    <AssetModel category="chimney" assets={assets} position={[0,0,0]} size={[2.6,3.2,1.5]}/>
    <group ref={fan} position={[0,-.08,0]}><Block position={[0,0,0]} size={[1.3,.06,.22]} color="#333b39"/><Block position={[0,0,0]} size={[.22,.06,1.3]} color="#333b39"/></group>
    {on&&<pointLight position={[0,-.6,0]} color="#fff3cf" intensity={9} distance={8}/>}
  </group>;
}

function Furniture({room,layout,assets,openShelves,tvOn,chimneyOn,toiletStyle,furnished=true,shoeRack=true}:{layout:HouseLayout;furnished?:boolean;shoeRack?:boolean;room:Room;assets:Asset[];openShelves:Set<string>;tvOn:Set<string>;chimneyOn:Set<string>;toiletStyle:Plan['toiletStyle']}){
  const base=room.floor*FLOOR_HEIGHT,cx=room.x+room.w/2,cz=room.y+room.h/2;
  if(room.kind==='living'||room.kind==='lounge'){
    const {sofa,rug,coffee,tv}=livingFurniture(room),featureX=sofa.x,sofaZ=sofa.z;
    const [sx,sz]=shelfSpot(room);
    return <group>
      <Block position={[rug.x,base+.055,rug.z]} size={[rug.w,.05,rug.d]} color="#d7cab8" surface="fabric"/>
      <AssetModel category="sofa" assets={assets} position={[featureX,base+.1,sofaZ]} size={[sofa.w,2.7,sofa.d]} rotation={Math.PI}/>
      <Block position={[tv.x,base+4.1,tv.z]} size={[tv.w,2.15,tv.d]} color="#181e20" metalness={.16}/>
      <Block position={[featureX,base+4.1,room.y+.61]} size={[3.28,1.91,.04]} color={tvOn.has(`tv-${room.id}`)?'#9cb6bd':'#13191b'} emissive={tvOn.has(`tv-${room.id}`)?'#2f7284':undefined}/>
      <AssetModel category="coffee" assets={assets} position={[coffee.x,base+.1,coffee.z]} size={[coffee.w,1.4,coffee.d]}/>
      <Shelf position={[sx,base,sz]} open={openShelves.has(`shelf-${room.id}`)} assets={assets}/>
      <AssetModel category="plant" assets={assets} position={[room.x+room.w-1.05,base+.1,room.y+room.h-1.1]} size={[.9,2.1,.9]}/>
    </group>;
  }
  if(room.kind==='dining'){const table=diningFurniture(room);return <group>
    <AssetModel category="dining" assets={assets} position={[table.x,base+.1,table.z]} size={[table.w,2.5,table.d]} fit="stretch"/>
    {table.chairs.map((chair,i)=><DiningChair key={i} assets={assets} position={[chair.x,base,chair.z]} rotation={chair.rotation}/>)}
  </group>;}
  if(room.kind==='bedroom'){const bed=bedroomFurniture(room);return <group>
    <AssetModel category="bed" assets={assets} position={[bed.x,base+.1,bed.z]} size={[bed.w,2.7,bed.d]}/>
    <Shelf position={[shelfSpot(room)[0],base,shelfSpot(room)[1]]} open={openShelves.has(`shelf-${room.id}`)} assets={assets}/>
    <AssetModel category="plant" assets={assets} position={[room.x+room.w-1.05,base+.1,room.y+room.h-1.05]} size={[.8,1.9,.8]}/>
  </group>;}
  if(room.kind==='kitchen')return <group>
    <Block solid position={[cx,base+1,room.y+room.h-.85]} size={[Math.max(2,room.w-1.2),2,1.7]} color="#c4b5a1" surface="timber"/>
    {Array.from({length:Math.max(1,Math.floor((room.w-1.2)/2.1))},(_,i)=>{const n=Math.max(1,Math.floor((room.w-1.2)/2.1)),w=(room.w-1.2)/n,x=room.x+.6+(i+.5)*w;return <group key={i}><Block position={[x,base+1.08,room.y+room.h-1.72]} size={[w-.065,1.75,.065]} color="#cbb898" surface="timber"/><Block position={[x,base+1.64,room.y+room.h-1.79]} size={[Math.min(.6,w*.4),.045,.12]} color="#665b51" metalness={.62}/></group>;})}
    <Block position={[cx,base+2.05,room.y+room.h-.85]} size={[Math.max(2,room.w-1.2),.14,1.85]} color="#5b6560"/>
    <AssetModel category="sink" assets={assets} position={[cx-1.3,base+2.13,room.y+room.h-1.1]} size={[2.2,.7,1.5]}/>
    <AssetModel category="fridge" assets={assets} position={[room.x+room.w-1.2,base+.1,room.y+1.3]} size={[2.1,5.4,2.0]}/>
    <Shelf position={[shelfSpot(room)[0],base,shelfSpot(room)[1]]} open={openShelves.has(`shelf-${room.id}`)} assets={assets}/>
    <Chimney position={[cx+1,base+4.8,room.y+room.h-1]} on={chimneyOn.has(`chimney-${room.id}`)} assets={assets}/>
    <Block position={[cx+1,base+2.14,room.y+room.h-.82]} size={[2.0,.04,1.3]} color="#292d2e"/>
  </group>;
  if(room.kind==='bathroom')return <group>{bathroomFixtures(room,layout).map(f=><group key={f.kind} position={[f.x,base+.08,f.z]} rotation={[0,f.angle,0]}>
    {f.kind==='basin'?<><AssetModel category="basin" assets={assets} position={[0,0,0]} size={[f.width,2.85,f.depth]}/><Block position={[0,4.65,-f.depth/2+.04]} size={[1.72,2.1,.10]} color="#786756"/><Block position={[0,4.65,-f.depth/2+.105]} size={[1.58,1.96,.035]} color="#c8d7d5" metalness={.82}/></>:toiletStyle==='indian'?<><Block position={[0,.07,0]} size={[1.75,.14,2.2]} color="#f2efea"/><mesh position={[0,.147,0]} rotation={[-Math.PI/2,0,0]} scale={[.44,.75,1]}><circleGeometry args={[1,32]}/><meshStandardMaterial color="#b1c0ba"/></mesh></>:<AssetModel category="toilet" assets={assets} position={[0,0,0]} size={[f.width,2.55,f.depth]}/>}
  </group>)}</group>;
  if(room.kind==='foyer')return furnished&&shoeRack?<group><Block solid position={[room.x+.25,base+1.05,room.y+room.h-.7]} size={[.4,2.1,1.2]} color="#ba9a74" surface="timber"/></group>:null;
  if(room.kind==='pooja')return <group><Block position={[cx,base+1.3,room.y+room.h-.6]} size={[Math.min(3,room.w-.8),2.6,.8]} color="#be9a65" surface="timber"/><mesh position={[cx,base+2.85,room.y+room.h-.6]}><cylinderGeometry args={[.29,.12,.32,24]}/><meshStandardMaterial color="#ba964f" roughness={.27} metalness={.65}/></mesh></group>;
  if(room.kind==='utility')return <AssetModel category="basin" assets={assets} position={[cx,base+.1,room.y+room.h-1]} size={[2.2,2.8,1.8]}/>;
  if(room.kind==='stairs'){
    const {front,back,run,steps,rise,flightWidth}=stairDimensions(room);
    return !room.label.includes('landing')?<group position={[0,base,0]}><Block position={[cx,-.13,room.y+front/2]} size={[room.w,.26,front]} color="#eee4d2" surface="stone"/>
      {Array.from({length:steps},(_,i)=><group key={i}>
        <Block position={[room.x+.3+flightWidth/2,(i+1)*rise-.09,room.y+front+(i+.5)*run/steps]}
          size={[flightWidth,.18,run/steps+.025]} color="#eee4d2" surface="stone"/>
        <Block position={[room.x+room.w-.3-flightWidth/2,FLOOR_HEIGHT/2+(i+1)*rise-.09,room.y+back-(i+.5)*run/steps]}
          size={[flightWidth,.18,run/steps+.025]} color="#eee4d2" surface="stone"/>
      </group>)}
      <Block position={[cx,FLOOR_HEIGHT/2-.13,room.y+(back+room.h)/2]} size={[room.w-.3,.26,room.h-back]} color="#eee4d2" surface="stone"/>
      {[room.x+.3,room.x+room.w/2-.1].map(x=><Handrail key={x} start={[x,2.8,room.y+front]} end={[x,7.3,room.y+back]}/>)}
      {[room.x+room.w/2+.1,room.x+room.w-.3].map(x=><Handrail key={x} start={[x,7.3,room.y+back]} end={[x,11.8,room.y+front]}/>)}
      {[0,.5,1].flatMap(t=>[room.x+.3,room.x+room.w-.3].map((x,index)=>{
        const height=index===0?t*4.5:(2-t)*4.5;
        return <Block key={`${t}-${x}`} position={[x,height+1.4,room.y+front+t*run]} size={[.07,2.8,.07]} color="#827568" metalness={.4}/>;
      }))}
    </group>:<group>
      <Block position={[cx,base-.13,room.y+front/2]} size={[room.w,.26,front]} color="#eee4d2" surface="stone"/>
      <Handrail start={[room.x+.3,base+2.8,room.y+front]} end={[room.x+room.w/2-.1,base+2.8,room.y+front]}/>
    </group>;
  }
  if(room.kind==='portico')return <group>
    {furnished&&<AssetModel category="car" assets={assets} position={[cx,base+.1,cz]} size={[Math.min(6.3,room.w-1.3),4.6,Math.min(14.5,room.h-1.5)]}/>}
    {[room.x+.35,room.x+room.w-.35].map(x=><Block solid key={x} position={[x,base+4.3,room.y+.35]} size={[.46,8.6,.46]} color="#ede3d2" surface="stone"/>)}
  </group>;
  if(room.kind==='terrace')return <group>
    <Block position={[cx,base+.45,cz]} size={[room.w-.6,.45,room.h-.6]} color="#d3c7b1"/>
    <FreeModel id="furniture-kit/benchcushion" position={[cx,base+.5,cz]} size={[4,2.2,1.8]}/>
    <AssetModel category="plant" assets={assets} position={[room.x+1.1,base+.5,room.y+1.1]} size={[1.3,2.6,1.3]}/>
  </group>;
  return null;
}

function Site({plan}:{plan:Plan}){
 const polygon=plotEdges(plan);
 const shape=useMemo(()=>{const sh=new Shape();polygon.forEach((p,i)=>i?sh.lineTo(p.x-plan.offsetX,-p.y+plan.offsetY):sh.moveTo(p.x-plan.offsetX,-p.y+plan.offsetY));sh.closePath();return sh;},[plan]);
 return <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.06,0]} receiveShadow><shapeGeometry args={[shape]}/><Suspense fallback={<meshStandardMaterial color="#a2af8c"/>}><SiteFinish type="lawn" repeat={[.15,.15]}/></Suspense></mesh>{polygon.map((p,i)=>{const q=polygon[(i+1)%polygon.length],dx=q.x-p.x,dz=q.y-p.y,length=Math.hypot(dx,dz);if((plan.design?.siteContext?.edges.find(e=>e.edge===p.id)?.use|| (p.road?'road':'open'))==='road')return null;return <group key={i} position={[(p.x+q.x)/2-plan.offsetX,1.1,(p.y+q.y)/2-plan.offsetY]} rotation={[0,-Math.atan2(dz,dx),0]}><Block position={[0,0,0]} size={[length,2.2,.25]} color="#d8d0bd" surface="stone"/></group>;})}</group>;
}

export function HouseScene({plan,layout,interactions,assets,mode,cutaway,contextVisible=true,showServices=false,xray=false,openDoors,doorAngles,openShelves,tvOn,chimneyOn,onInteract}:Props){
  const floorCount=plan.levels||Math.max(1,...plan.rooms.map(r=>r.floor+1));
  const finish=palette(plan.design?.style);
  const furnished=plan.design?.furnished!==false;
  const shellCutaway=mode==='overview'&&cutaway;
  return <group name="HouseExport" userData={{exportRoot:true}} position={[-plan.width/2,0,-plan.depth/2]}>
    <Site plan={plan}/>{contextVisible&&<SiteWorld plan={plan}/>}
    <Block position={[plan.width/2,-.2,plan.depth/2]} size={[plan.width,.4,plan.depth]} color="#ddd8ce" surface="concrete"/>
    {plan.rooms.filter(room=>room.floor>0&&room.kind!=='stairs').map(room=><Block key={`slab-${room.id}`}
      position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT-.17,room.y+room.h/2]} size={[room.w,.34,room.h]} color="#ddd8ce" surface="concrete" opacity={shellCutaway ? .56 : 1}/>)}
    {plan.rooms.map(room=><group key={room.id}>
      {!(room.kind==='stairs'&&room.floor>0)&&<Block position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT+.035,room.y+room.h/2]} size={[room.w,.07,room.h]}
        color={room.kind==='bathroom'?'#ffffff':room.kind==='portico'?'#dedbd3':room.kind==='terrace'?'#e5ddd0':'#fff9ef'}
        surface={room.kind==='bathroom'?'tile':room.kind==='portico'?'concrete':plan.design?.floorFinish==='tile'?'limestone':(plan.design?.floorFinish||'limestone') as Surface}/>}
      {(furnished||['kitchen','bathroom','stairs','pooja','utility','foyer','portico'].includes(room.kind))&&(()=>{const frame=furnishingFrame(plan,room);const rotate=!['portico','foyer','bathroom'].includes(room.kind);return <group position={rotate?[room.x+room.w/2,0,room.y+room.h/2]:[0,0,0]} rotation={[0,rotate?frame.angle:0,0]}><Furniture layout={layout} room={rotate?frame.local:room} assets={assets} openShelves={openShelves} tvOn={tvOn} chimneyOn={chimneyOn} furnished={furnished} shoeRack={plan.design?.shoeRack} toiletStyle={plan.design?.roomRequests.find(q=>q.id===room.id)?.toiletStyle||(plan.toiletStyle==='both'?(plan.rooms.filter(r=>r.kind==='bathroom').findIndex(r=>r.id===room.id)%2?'indian':'western'):plan.toiletStyle)}/></group>;})()}
      {!shellCutaway&&!['portico','terrace','stairs'].includes(room.kind)&&<Block position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT+8.88,room.y+room.h/2]} size={[room.w,.10,room.h]} color="#faf8f0" surface="paint" opacity={xray?.18:1}/>}
      {!['portico','terrace','stairs'].includes(room.kind)&&room.floor<8&&<RoomLight room={room}/>}
      {room.floor>0&&room.kind==='terrace'&&<>
        {room.y===0&&<Block position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT+1.8,room.y+.15]} size={[room.w,3.5,.14]} color="#bed3d0" opacity={.48}/>}
        {room.x===0&&<Block position={[room.x,room.floor*FLOOR_HEIGHT+1.8,room.y+room.h/2]} size={[.14,3.5,room.h]} color="#bed3d0" opacity={.48}/>}
        {room.x+room.w>=plan.width-.05&&<Block position={[plan.width,room.floor*FLOOR_HEIGHT+1.8,room.y+room.h/2]} size={[.14,3.5,room.h]} color="#bed3d0" opacity={.48}/>}
        {room.y+room.h>=plan.depth-.05&&<Block position={[room.x+room.w/2,room.floor*FLOOR_HEIGHT+1.8,plan.depth]} size={[room.w,3.5,.14]} color="#bed3d0" opacity={.48}/>}
      </>}
    </group>)}
    {layout.walls.filter(wall=>!(shellCutaway&&wall.exterior&&wall.z<.25&&wall.d<.4)).map(wall=><Block key={wall.id}
      position={[wall.x+wall.w/2,wall.floor*FLOOR_HEIGHT+wall.bottom+wall.height/2,wall.z+wall.d/2]}
      size={[wall.w,wall.height,wall.d]} color={wall.exterior?finish.wall:'#f6f1e6'} opacity={xray?.18:1} surface={plan.design?.wallFinish==='stone'?'stone':plan.design?.wallFinish==='timber'?'timber':'paint'}/>)}
    {layout.doors.filter(door=>!door.arch).map(door=><Door key={door.id} door={door} open={openDoors.has(door.id)} angles={doorAngles}/>)}
    {layout.windows.map(window=><Window key={window.id} window={window} assets={assets} furnished={furnished}/>)}
    {!shellCutaway&&facadePieces(plan,layout).map(piece=><Block key={piece.id} position={piece.position} size={piece.size} color={piece.surface==='timber'?finish.trim:piece.color} surface={piece.surface}/>)}
    {!shellCutaway&&(!plan.design?.roof||plan.design.roof==='flat')&&<>
      <Block position={[plan.width/2,floorCount*FLOOR_HEIGHT+.15,plan.depth/2]} size={[plan.width+1,.35,plan.depth+1]} color="#f1eee7" surface="concrete"/>
      {[0,plan.width].map(x=><Block key={x} position={[x,floorCount*FLOOR_HEIGHT+.75,plan.depth/2]} size={[.4,1.25,plan.depth+1]} color="#ded8ce"/>)}
      {[0,plan.depth].map(z=><Block key={z} position={[plan.width/2,floorCount*FLOOR_HEIGHT+.75,z]} size={[plan.width+1,1.25,.4]} color="#ded8ce"/>)}
    </>}
    {plan.design?.roof&&plan.design.roof!=='flat'&&!shellCutaway&&<HipRoof w={plan.width} d={plan.depth} base={floorCount*FLOOR_HEIGHT} pitch={finish.pitch||.46} eave={finish.eave} color={finish.roof}/>}
    {showServices&&<ServiceScene plan={plan}/>}
    {interactions.map(item=><mesh key={item.id} position={[item.x,item.floor*FLOOR_HEIGHT+item.y,item.z]}
      userData={{interactionId:item.id,label:item.label}} onClick={event=>{if(mode!=='overview')return;event.stopPropagation();onInteract(item.id);}}>
      <boxGeometry args={item.size}/><meshBasicMaterial transparent opacity={.002} depthWrite={false} side={DoubleSide}/>
    </mesh>)}
  </group>;
}
