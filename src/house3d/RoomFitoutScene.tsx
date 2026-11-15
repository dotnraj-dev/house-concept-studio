import {AssetModel} from './Assets';
import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import type {Group} from 'three';
import {CEILING_LEVEL,FLOOR_HEIGHT} from '../building-dimensions';
import {fitoutOf,roomFitout,type WardrobeDesign} from '../fitout';
import type {Asset,Plan,Room} from '../types';
import type {HouseLayout} from './layout';
import {bedsideTables,roomFitments,type Fitting} from './fitout-layout';
import {Block} from './Surface';

function CabinetLeaf({x,width,height,depth,open,index,style}:{x:number;width:number;height:number;depth:number;open:boolean;index:number;style:WardrobeDesign}){
 const ref=useRef<Group>(null),slide=style==='sliding',sign=index%2?-1:1;
 useFrame((_,dt)=>{if(!ref.current)return;const t=Math.min(1,dt*5);if(slide)ref.current.position.x+=((x+(open?(index%2?-.78:.78)*width:0))-ref.current.position.x)*t;else ref.current.rotation.y+=((open?(index%2?1:-1)*1.22:0)-ref.current.rotation.y)*t;});
 return <group ref={ref} position={[x+(!slide&&index%2?width:0),height/2,depth/2+.035+(slide?index%2*.085:0)]}>
  <Block position={[slide?0:sign*width/2,0,0]} size={[width-.045,height-.13,.08]} color={style==='sliding'?'#8f7254':'#bc9f7d'} surface="timber"/>
  {style==='mirror'&&index===0&&<Block position={[sign*width/2,0,.048]} size={[width-.22,height-.42,.018]} color="#dae4df" metalness={1} roughness={.06}/>}
  <Block position={[slide?width*.3:sign*(width-.16),.1,.075]} size={[.035,.55,.065]} color="#bba16e" metalness={.8}/>
 </group>;
}
function Cabinet({f,open,style='hinged',display=false}:{f:Pick<Fitting,'width'|'height'|'depth'>;open:boolean;style?:WardrobeDesign;display?:boolean}){
 const {width:w,height:h,depth:d}=f,count=Math.max(2,Math.ceil(w/2.2)),leaf=w/count;
 return <group name="Built-in joinery" userData={{solid:true}}>
  <Block position={[0,h/2,-d/2+.045]} size={[w,h,.09]} color="#cab899" surface="timber"/>
  {[-1,1].map(sign=><Block key={sign} position={[sign*(w/2-.055),h/2,0]} size={[.11,h,d]} color="#b69a77" surface="timber"/>)}
  {[.08,h-.06,...(display?[h*.26,h*.53,h*.77]:[h*.18,h*.52,h*.78])].map(y=><Block key={y} position={[0,y,0]} size={[w,.10,d]} color="#c7ac88" surface="timber"/>)}
  {!display&&Array.from({length:count},(_,i)=><CabinetLeaf key={i} x={style==='sliding'?-w/2+(i+.5)*leaf:-w/2+i*leaf} index={i} width={leaf} height={h} depth={d} open={open} style={style}/>)}
  {display&&Array.from({length:6},(_,i)=><group key={i} position={[-w*.34+i%3*w*.34,h*(i<3?.3:.57),.02]}><Block position={[0,.17,0]} size={[.45,.34,.42]} color={['#b48560','#d1c7af','#8a9b86'][i%3]}/><Block position={[0,.36,0]} size={[.49,.045,.46]} color="#d8d0bb"/></group>)}
 </group>;
}
function WallArt({width,height}:{width:number;height:number}){
 return <group name="Original botanical wall art">
  <Block position={[0,height/2,0]} size={[width,height,.07]} color="#82694c" surface="timber"/>
  <Block position={[0,height/2,.047]} size={[width-.15,height-.15,.025]} color="#efe4cf"/>
  <mesh position={[-width*.16,height*.58,.065]} scale={[1,.85,1]}><circleGeometry args={[height*.22,48]}/><meshStandardMaterial color="#bf8e67" roughness={1}/></mesh>
  {[-1,0,1].map((s,i)=><group key={s} position={[s*width*.19,height*.46,.085]} rotation={[0,0,s*.35]}><Block position={[0,0,0]} size={[.025,height*.51,.012]} color="#697364"/><mesh position={[.11,height*.12,.01]} scale={[.12,.25,1]} rotation={[0,0,-.5+i*.2]}><circleGeometry args={[1,24]}/><meshStandardMaterial color={i===1?'#556e5c':'#9aab8d'} roughness={1}/></mesh></group>)}
 </group>;
}
function TableLamp(){return <group name="Bedside reading lamp">
 <mesh position={[0,.05,0]} castShadow><cylinderGeometry args={[.26,.28,.09,24]}/><meshStandardMaterial color="#b29a6b" metalness={.7} roughness={.25}/></mesh>
 <Block position={[0,.42,0]} size={[.05,.7,.05]} color="#b29a6b" metalness={.8}/>
 <mesh position={[0,.88,0]} castShadow><cylinderGeometry args={[.28,.39,.52,32,1,true]}/><meshStandardMaterial color="#e9dfca" roughness={.95} emissive="#e6be7f" emissiveIntensity={.16}/></mesh>
 <pointLight position={[0,.72,0]} intensity={1.6} distance={4} decay={2} color="#ffdfad"/>
 </group>;}
function CeilingFan({on,small=false}:{on:boolean;small?:boolean}){
 const ref=useRef<Group>(null);useFrame((_,dt)=>{if(ref.current&&on)ref.current.rotation.y+=dt*4.5;});
 return <group name="Ceiling fan">
 <Block position={[0,.7,0]} size={[.09,1.4,.09]} color="#695b4b" metalness={.45}/>
 <mesh castShadow><cylinderGeometry args={[.33,.27,.22,32]}/><meshStandardMaterial color="#8d7658" metalness={.55} roughness={.28}/></mesh>
 <group ref={ref} scale={small?.76:1}>{[0,1,2].map(i=><group key={i} rotation={[0,i*Math.PI*2/3,0]}><group rotation={[.06,0,.045]}><Block position={[.96,.02,0]} size={[1.65,.045,.33]} color="#ad9576" surface="timber"/></group></group>)}</group>
 </group>;
}
function AirConditioner({on}:{on:boolean}){return <group name="Split AC indoor unit">
 <Block position={[0,.425,0]} size={[2.8,.85,.7]} color="#f3f1e9"/>
 <Block position={[0,.38,.36]} size={[2.6,.52,.018]} color="#e4e6df"/>
 {Array.from({length:6},(_,i)=><Block key={i} position={[0,.09+i*.035,.38]} size={[2.4,.014,.055]} color="#78847d"/>)}
 <Block position={[1,.57,.38]} size={[.08,.035,.018]} color={on?'#8bc4a4':'#a0a09a'} emissive={on?'#66be9c':undefined}/>
 </group>;}
function PrayerContent({faith,width}:{faith:ReturnType<typeof fitoutOf>['faith'];width:number}){
 return <group name="Customer-selected prayer fittings">
  {faith==='hindu'?[-1,1].map(s=><group key={s} position={[s*width*.28,0,.1]}><mesh position={[0,.12,0]}><cylinderGeometry args={[.19,.25,.12,24]}/><meshStandardMaterial color="#ba944c" metalness={.8} roughness={.22}/></mesh><Block position={[0,.45,0]} size={[.055,.55,.055]} color="#bd9954" metalness={.8}/><mesh position={[0,.75,0]}><sphereGeometry args={[.15,16,12]}/><meshStandardMaterial color="#bd9954" metalness={.8} roughness={.2}/></mesh></group>):
  faith==='christian'?<group><Block position={[0,.65,0]} size={[.1,1.05,.08]} color="#795b3c" surface="timber"/><Block position={[0,.87,0]} size={[.55,.1,.08]} color="#795b3c" surface="timber"/></group>:
  <group rotation={[.15,0,0]}><Block position={[0,.17,0]} size={[.9,.09,.6]} color={faith==='muslim'?'#53755d':'#aa9475'} surface="fabric"/><Block position={[0,.235,0]} size={[.81,.035,.54]} color="#e3d7bc"/></group>}
 </group>;
}
function Refrigerator({f,open}:{f:Fitting;open:boolean}){
 const ref=useRef<Group>(null),w=f.width,h=f.height,d=f.depth;
 useFrame((_,dt)=>{if(ref.current)ref.current.rotation.y+=((open?-1.3:0)-ref.current.rotation.y)*Math.min(1,dt*5);});
 return <group name="Refrigerator" userData={{solid:true}}>
  <Block position={[0,h/2,-d/2+.08]} size={[w,h,.16]} color="#e2e5df"/>
  {[-1,1].map(sign=><Block key={sign} position={[sign*(w/2-.07),h/2,0]} size={[.14,h,d]} color="#e5e6e1" metalness={.2}/>)}
  {[.15,1.5,2.8,4,h-.08].map(y=><Block key={y} position={[0,y,0]} size={[w-.15,.1,d-.12]} color="#f2f4ef"/>)}
  <group ref={ref} position={[-w/2,0,d/2]}>
   <Block position={[w/2,h/2,0]} size={[w,h-.1,.14]} color="#d6dfdc" metalness={.45} roughness={.22}/>
   <Block position={[w/2,h*.73,.08]} size={[w-.12,.035,.02]} color="#6a7771"/>
   <Block position={[w-.2,h*.45,.15]} size={[.055,1.1,.12]} color="#52675e" metalness={.8}/>
   <Block position={[w-.2,h*.85,.15]} size={[.055,.65,.12]} color="#52675e" metalness={.8}/>
  </group>
 </group>;
}
function FittingModel({f,plan,room,open,assets}:{f:Fitting;plan:Plan;room:Room;open:boolean;assets:Asset[]}){
 const o=roomFitout(plan,room.attachedTo?{...room,id:room.attachedTo}:room),home=fitoutOf(plan.design),cabinet=f.kind==='wardrobe'||f.kind==='loft'||f.kind==='sideboard'||f.kind==='upper';
 return <group name={f.kind+' · '+room.label} position={[f.x,room.floor*FLOOR_HEIGHT+f.bottom,f.z]} rotation={[0,f.angle,0]}>
 {cabinet&&(f.kind==="wardrobe"&&assets.some(a=>a.category.toLowerCase()==="shelf")?<AssetModel category="shelf" assets={assets} position={[0,0,0]} size={[f.width,f.height,f.depth]} open={open} fit="stretch"/>:<Cabinet f={f} style={f.kind==="wardrobe"?o.wardrobe:"hinged"} open={open}/>)}
 {f.kind==='fridge'&&(assets.some(a=>a.category.toLowerCase()==='fridge')?<AssetModel category="fridge" assets={assets} position={[0,0,0]} size={[f.width,f.height,f.depth]} open={open}/>:<Refrigerator f={f} open={open}/>)}
 {f.kind==='art'&&<WallArt width={f.width} height={f.height}/>}
 {f.kind==='ac'&&<AirConditioner on={!open}/>}
 {f.kind==='shelves'&&<Cabinet f={f} open display/>}
 {f.kind==='prayer'&&<><Cabinet f={f} open={open} display={home.prayerMode==='shelves'||room.kind==='pooja'}/><group position={[0,f.height*.53+.05,0]}><PrayerContent faith={home.faith} width={f.width}/></group></>}
 {f.kind==='laundry'&&<><Block solid position={[0,1.5,0]} size={[2.3,3,2.2]} color="#e8e8e0"/><mesh position={[0,1.4,1.12]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.72,.72,.08,32]}/><meshPhysicalMaterial color="#354946" metalness={.5} roughness={.15}/></mesh><Block position={[0,2.65,1.12]} size={[2,.26,.04]} color="#a5afaa"/></>}
 </group>;
}
export function RoomFitoutScene({plan,room,layout,open,hideHigh=false,assets}:{plan:Plan;room:Room;layout:HouseLayout;open:Set<string>;hideHigh?:boolean;assets:Asset[]}){
 const fittings=roomFitments(plan,room,layout),opt=roomFitout(plan,room),base=room.floor*FLOOR_HEIGHT,excluded=['terrace','portico','stairs','passage','foyer'];
 return <group>
 {fittings.filter(f=>!hideHigh||f.bottom<7).map(f=><FittingModel key={f.id} f={f} plan={plan} room={room} assets={assets} open={open.has(f.id)}/>)}
 {bedsideTables(plan,room,layout).map((t,i)=><group key={i} position={[t.x,base,t.z]}><Block solid position={[0,.95,0]} size={[t.w,1.8,t.d]} color="#b49b7a" surface="timber"/><Block position={[0,1.06,t.d/2+.03]} size={[t.w-.12,.65,.05]} color="#cfb28c" surface="timber"/><Block position={[0,1.12,t.d/2+.08]} size={[.35,.025,.05]} color="#a0844e" metalness={.8}/><group position={[0,1.9,0]}><TableLamp/></group></group>)}
 {!hideHigh&&!excluded.includes(room.kind)&&opt.fan&&<group position={[room.x+room.w/2,base+CEILING_LEVEL-1.4,room.y+room.h/2]}><CeilingFan on={!open.has('fan-'+room.id)} small={room.w<9||room.h<9}/></group>}
 </group>;
}

