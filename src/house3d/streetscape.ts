import {Group,BufferGeometry,Mesh,MeshStandardMaterial,Float32BufferAttribute,Color,Shape,ShapeGeometry,PlaneGeometry,LatheGeometry,Vector2,DataTexture,RGBAFormat,UnsignedByteType,RepeatWrapping,SRGBColorSpace,type Material} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Plan} from '../types';
import {surroundings,plotEdges,outsideLot} from '../site-context';
import {pointInPolygon} from '../geometry';
import {makeHouseLayout} from './layout';
import {faceContext} from './facade-kit/layout';
import {profile,instances,beam,solid} from './facade-kit/geometry';
import {treeGeometry,shrubGeometry,seeded,type TreeKind} from './vegetation';
type Point=[number,number,number];
type Pose={at:Point;rotation?:Point;scale?:Point};

function neighbourGeometry(tiled:boolean){
 const parts:BufferGeometry[]=[];
 const add=(size:Point,at:Point,color:string)=>{
  const g=profile(...size,.035);g.translate(...at);const tint=new Color(color),rgb=[];
  for(let i=0;i<g.attributes.position.count;i++)rgb.push(tint.r,tint.g,tint.b);
  g.setAttribute('color',new Float32BufferAttribute(rgb,3));parts.push(g);
 };
 const w=18,d=22,h=tiled?10:19;
 add([w,h,d],[0,h/2,0],tiled?'#d5d2bf':'#bfc9c3');
 add([w+.7,.45,d+.7],[0,h+.12,0],'#e1e3da');
 for(let f=0;f<(tiled?1:2);f++){
  add([w+.25,.25,d+.3],[0,f*9.5+.2,0],'#9fa8a1');
  for(const x of [-5,4.7]){
   add([4.4,4.5,.14],[x,f*9.5+5,-d/2-.08],'#5b6765');
   add([4,4.1,.05],[x,f*9.5+5,-d/2-.18],'#91a5a4');
   add([.07,4.2,.1],[x,f*9.5+5,-d/2-.25],'#4c5959');
   add([5,.14,1.25],[x,f*9.5+7.5,-d/2-.35],'#e2e4db');
   for(let j=-1;j<=1;j++)add([.055,4.05,.08],[x+j*1.15,f*9.5+5,-d/2-.29],'#5e6761');
   add([4.9,.12,.5],[x,f*9.5+2.5,-d/2-.31],'#e7e1d2');
  }
 }
 add([3,6.8,.15],[0,3.4,-d/2-.12],'#736b59');
 if(!tiled){
  add([7,3.2,5],[-4,h+1.7,5],'#abb8b0');
  add([7.6,.25,5.6],[-4,h+3.4,5],'#dce1d8');
  add([8,.45,3.3],[4,9.4,-d/2-1],'#dfe1d9');
  for(const x of [.2,7.8])add([.3,8.8,.5],[x,14,-d/2-.7],'#e8e8de');
  for(let x=.3;x<8;x+=.6)add([.035,3,.07],[x,11.1,-d/2-2.35],'#536365');
  add([4.8,2.1,4.4],[-4,h+4.5,5],'#afb9b0');
  for(let x=-6.7;x<-1.2;x+=.65)add([.13,2.5,.15],[x,h+5.5,2.7],'#697871');
 }else{
  // Profiled pitched slabs with real slope, white fascia and a clay ridge.
  for(const sign of [-1,1]){
   const g=profile(10.6,.22,24,.035);g.rotateZ(sign*-.38);g.translate(sign*4.7,h+1.9,0);
   const tint=new Color('#9f7660'),rgb=[];for(let i=0;i<g.attributes.position.count;i++)rgb.push(tint.r,tint.g,tint.b);
   g.setAttribute('color',new Float32BufferAttribute(rgb,3));parts.push(g);
  }
  add([13,.26,3.2],[0,h-.15,-d/2-1.1],'#d9d5c5');
  for(const x of [-5.5,5.5])add([.42,8.4,.42],[x,4.2,-d/2-2.4],'#e0dacb');
  for(let i=0;i<3;i++)add([5.4,.16,.7],[0,.08+i*.15,-d/2-3.8-i*.55],'#c5bba5');
  add([.3,.3,d+1],[0,h+3.9,0],'#8c5c43');
 }
 const merged=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!merged)throw new Error('Neighbour geometry could not be batched');return merged;
}
function distantTreeSilhouette(){
 const crown=new Shape();
 for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,r=1+.13*Math.sin(a*7)+.065*Math.sin(a*23);const x=Math.cos(a)*2.6*r,y=4+Math.sin(a)*1.9*r;i?crown.lineTo(x,y):crown.moveTo(x,y);}
 crown.closePath();
 const leaf=new ShapeGeometry(crown),stem=new PlaneGeometry(.17,3.5);stem.translate(0,1.75,0);
 // Shared upright crossed silhouettes form a distant treeline, not floating rocks.
 const g=mergeGeometries([leaf,stem],false);leaf.dispose();stem.dispose();if(!g)throw new Error('Treeline geometry could not be batched');return g;
}
export function streetscapeStats(root:Group){
 let draws=0,triangles=0,instancesCount=0;
 root.traverse(o=>{const mesh=o as Mesh&{isInstancedMesh?:boolean;count?:number};if(!mesh.isMesh)return;draws++;const n=mesh.isInstancedMesh?(mesh.count||0):1;instancesCount+=n;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*n;});
 return {drawCalls:draws,triangles:Math.round(triangles),instances:instancesCount};
}
/** Illustrative scenery is kept separate from measured boundary observations. */
export function buildStreetscape(plan:Plan,wetRoad=false){
 const root=new Group();root.name='Tamil Nadu streetscape · illustrative background';
 const owned:Material[]=[];
 const material=(color:string,options:ConstructorParameters<typeof MeshStandardMaterial>[0]={})=>{const m=new MeshStandardMaterial({color,roughness:.84,...options});owned.push(m);return m;};
 // Fine patches vary the road response without turning the sunset surface into a mirror.
 const roadPixels=new Uint8Array(128*128*4),roadRandom=seeded(817);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,grain=(roadRandom()-.5)*17+Math.sin(x*.19+y*.11)*4;
  roadPixels[i]=roadPixels[i+1]=roadPixels[i+2]=Math.round(239+grain);roadPixels[i+3]=255;}
 const roadMap=new DataTexture(roadPixels,128,128,RGBAFormat,UnsignedByteType);roadMap.colorSpace=SRGBColorSpace;roadMap.wrapS=roadMap.wrapT=RepeatWrapping;roadMap.repeat.set(22,3);roadMap.needsUpdate=true;
 const paint=material('#e3e4d9'),kerb=material('#b4b9b4'),paving=material('#b9b9ad'),asphalt=material('#424b4e',{map:roadMap,roughness:wetRoad?.52:.91,metalness:wetRoad?.055:0}),marking=material('#c2c6b8');
 const foliage=material('#ffffff',{vertexColors:true,side:2,roughness:.83}),bark=material('#ffffff',{vertexColors:true});
 const muted=material('#ffffff',{vertexColors:true}),distant=material('#748b7d',{roughness:1,side:2}),distantBuilding=material('#a2aca4');
 const contexts=surroundings(plan),polygon=plotEdges(plan),c=faceContext(plan,makeHouseLayout(plan));
 const road=contexts.find(e=>e.use==='road'&&!e.blocked);
 if(road){
  const frame=new Group();frame.name='Road, kerbs and continuous footpath';frame.position.set(road.x,0,road.z);frame.rotation.y=road.angle;
  const width=Math.max(220,road.width),a=polygon.find(p=>p.id===road.edge)!,b=polygon.find(p=>p.id===road.end)!;
  const dot=((a.x+b.x)/2-plan.offsetX-road.x)*Math.sin(road.angle)+((a.y+b.y)/2-plan.offsetY-road.z)*Math.cos(road.angle),sign=Math.sign(dot)||1;
  frame.add(beam([width,.12,road.depth],asphalt,[0,-.04,-sign*3.5],.025));
  frame.add(beam([width,.25,3.5],paving,[0,.12,sign*(road.depth/2-1.75)],.035));
  const curbPos:Pose[]=[],joints:Pose[]=[],dashes:Pose[]=[];
  for(let u=-width/2;u<width/2;u+=2){
   curbPos.push({at:[u,.22,sign*(road.depth/2-3.55)]});
   joints.push({at:[u,.255,sign*(road.depth/2-1.75)]});
  }
  for(let u=-width/2+4;u<width/2;u+=12)dashes.push({at:[u,.035,-sign*3.5]});
  frame.add(instances(new RoundedBoxGeometry(1.95,.35,.45,1,.06),kerb,curbPos,'Instanced road kerb stones'));
  frame.add(instances(new PlaneGeometry(.025,3.3).rotateX(-Math.PI/2),kerb,joints,'Footpath expansion joints'));
  frame.add(instances(new PlaneGeometry(4,.12).rotateX(-Math.PI/2),marking,dashes,'Instanced road markings'));root.add(frame);
 }
 // Use recorded neighbouring house dimensions/positions when present.
 const observed=contexts.filter(e=>!e.blocked&&['house','building'].includes(e.use));
 const houses:Pose[]=[],bungalows:Pose[]=[];
 for(const e of observed){(e.use==='house'?bungalows:houses).push({at:[e.x,0,e.z],rotation:[0,e.angle,0],scale:[e.width/18,e.height/(e.use==='house'?10:19),e.depth/22]});}
 // Example houses sit beyond recorded open zones, never replacing a measured boundary.
 const outside=(u:number,inward:number):Point=>c.at(u,0,-inward);
 const footprints:[number,number][][]=[];
 const rectangle=(x:number,z:number,w:number,d:number,angle:number)=>[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v])=>[x+Math.cos(angle)*u+Math.sin(angle)*v+plan.offsetX,z-Math.sin(angle)*u+Math.cos(angle)*v+plan.offsetY] as [number,number]);
 const recorded=contexts.filter(e=>e.observed).map(e=>rectangle(e.x,e.z,e.width,e.depth,e.angle).map(([x,y],i)=>({id:String(i),x,y,road:false,setback:0})));
 for(const [i,u] of [-24,c.length+24].entries()){
  let p=outside(u,c.depth+8),footprint=rectangle(p[0],p[2],22,28,c.angle);
  for(let attempt=0;attempt<100;attempt++){
   if(outsideLot(footprint,polygon)&&recorded.every(poly=>outsideLot(footprint,poly)))break;
   p=outside(u+(i?1:-1)*(attempt+1)*20,c.depth+8);footprint=rectangle(p[0],p[2],22,28,c.angle);
  }
  if(!outsideLot(footprint,polygon)||!recorded.every(poly=>outsideLot(footprint,poly)))continue;
  footprints.push(footprint);
  if(!observed.some(e=>Math.hypot(e.x-p[0],e.z-p[2])<23))(i?bungalows:houses).push({at:p,rotation:[0,c.angle,0]});
 }
 if(houses.length)root.add(instances(neighbourGeometry(false),muted,houses,'Muted flat-roof Tamil Nadu neighbours'));
 if(bungalows.length)root.add(instances(neighbourGeometry(true),muted,bungalows,'Muted tiled Tamil Nadu neighbours'));
 const trees:Record<TreeKind,Pose[]>={coconut:[], 'rain-tree':[],frangipani:[]};
 trees.coconut.push({at:outside(-9,12),scale:[1.0,1.12,1.0]},{at:outside(c.length+11,17),scale:[.85,1,.85]});
 trees['rain-tree'].push({at:outside(-16,c.depth*.75),scale:[1.3,1.15,1.3]},{at:outside(c.length+19,c.depth*.55),scale:[1.1,1.15,1.1]});
 // Additional recorded trees stay in the observed tree zone.
 for(const e of contexts.filter(e=>!e.blocked&&e.use==='trees'))trees['rain-tree'].push({at:[e.x,0,e.z],scale:[Math.min(1.2,e.width/17),Math.min(1.2,e.height/23),Math.min(1.2,e.depth/17)]});
 const gateSpans=c.openings.filter(o=>o.kind==='door'||o.kind==='portico').map(o=>[o.u-.9,o.u+o.w+.9]);
 const openU=(u:number)=>!gateSpans.some(([a,b])=>u>a&&u<b);
 const shrubs:Pose[]=[],pots:Pose[]=[],treeRoots:Pose[]=[];
 const gardenRandom=seeded(179);
 const roadVertices=polygon.findIndex(p=>p.road);
 if(roadVertices>=0){
  const a=polygon[roadVertices],b=polygon[(roadVertices+1)%polygon.length],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz),signed=polygon.reduce((s,p,i)=>s+p.x*polygon[(i+1)%polygon.length].y-p.y*polygon[(i+1)%polygon.length].x,0);
  const nx=-(dz/len)*Math.sign(signed),nz=(dx/len)*Math.sign(signed);
  for(let t=1.4;t<len-1;t+=2.1){
   const x=a.x+dx*t/len+nx*.8-plan.offsetX,z=a.y+dz*t/len+nz*.8-plan.offsetY,u=c.u(x,z);
   if(!openU(u))continue;
   const spread=.78+gardenRandom()*.4,height=.92+gardenRandom()*.46;
   pots.push({at:[x,0,z],scale:[spread,.7,spread]});shrubs.push({at:[x,.9,z],rotation:[0,gardenRandom()*Math.PI*2,0],scale:[spread,height,spread]});
   if(!treeRoots.length&&t>2){trees.frangipani.push({at:[x,.2,z],scale:[.42,.55,.42]});treeRoots.push({at:[x,0,z]});}
  }
 }
 // A second species-sized garden tree is outside the property, off the vehicle route.
 trees.frangipani.push({at:outside(c.length+5,4),scale:[.65,.8,.65]});
 for(const kind of Object.keys(trees) as TreeKind[]){
  const model=treeGeometry(kind),poses=trees[kind];
  root.add(instances(model.bark,bark,poses,'Instanced '+kind+' trunks and branches'));
  root.add(instances(model.foliage,foliage,poses,'Instanced '+kind+' botanical leaves'));
 }
 const potGeo=new LatheGeometry([[0,0],[.65,0],[.85,.85],[.9,.95],[.75,.95],[.7,.75],[0,.75]].map(p=>new Vector2(...p as [number,number])),14);
 root.add(instances(potGeo,material('#929384'),pots,'Compound-wall planted troughs'));
 root.add(instances(shrubGeometry(),foliage,shrubs,'Instanced compound-wall shrubs'));
 // Quiet low base below the building; existing lawn/entry path remain within the plot.
 const random=seeded(512),silhouettes:Pose[]=[],blocks:Pose[]=[];
 for(let i=0;i<64;i++){
  const angle=i/64*Math.PI*2,radius=125+random()*85;
  const x=Math.cos(angle)*radius+plan.width/2,z=Math.sin(angle)*radius+plan.depth/2,h=13+random()*7;
  for(let j=0;j<3;j++)silhouettes.push({at:[x,0,z],rotation:[0,j*Math.PI/3,0],scale:[1.15+random()*.5,h/6,1]});
  if(i%4===0)blocks.push({at:[x+12,6,z+8],scale:[12+random()*8,12,12]});
 }
 root.add(instances(distantTreeSilhouette(),distant,silhouettes,'Distant clustered tree silhouettes'));
 root.add(instances(profile(1,1,1,.035),distantBuilding,blocks,'Distant building silhouettes'));
 root.userData={illustrative:true,modelUnits:'feet',illustrativeNeighbourFootprints:footprints,...streetscapeStats(root)};
 const geometries=new Set<BufferGeometry>();root.traverse(o=>{if((o as Mesh).isMesh)geometries.add((o as Mesh).geometry);});
 return {root,dispose:()=>{geometries.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());roadMap.dispose();}};
}
