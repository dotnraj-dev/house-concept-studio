import {BoxGeometry,CylinderGeometry,Group,LatheGeometry,Mesh,MeshPhysicalMaterial,PlaneGeometry,DoubleSide,SphereGeometry,TorusGeometry,Vector2} from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
/** Original reusable geometry. No external model licence or paid generation is required. */
const colors:Record<string,string>={fabric:'#c8c6b9',linen:'#eee7d7',accent:'#728678',wood:'#b59a73',metal:'#7d715f',ceramic:'#faf8f1',glass:'#50645e'};
const cache=new Map<string,Group>();
export const BUILTIN_CATEGORIES=['sofa','bed','dining','basin','toilet','coffee','plant'] as const;
export function builtinModel(category:string):Group|null{
 if(cache.has(category))return cache.get(category)!.clone(true);
 const root=new Group();root.name='Studio '+category;
 const mats=new Map<string,MeshPhysicalMaterial>();
 const mat=(name:string)=>{if(!mats.has(name))mats.set(name,new MeshPhysicalMaterial({name,color:colors[name]||colors.fabric,roughness:name==='ceramic'?.18:name==='metal'?.14:name==='wood'?.38:.85,clearcoat:name==='wood'||name==='ceramic'?.3:0,clearcoatRoughness:.16,metalness:name==='metal'?1:0}));return mats.get(name)!;};
 const mesh=(geometry:any,name:string,x:number,y:number,z:number,parent=root)=>{const m=new Mesh(geometry,mat(name));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const soft=(w:number,h:number,d:number,x:number,y:number,z:number,name='fabric',radius=.1)=>mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(radius,w/4,h/4,d/4)),name,x,y,z);
 const leg=(x:number,z:number,height=.45)=>mesh(new CylinderGeometry(.045,.035,height,12),'metal',x,height/2,z);
 if(category==='sofa'){
  soft(6.5,.48,2.8,0,.68,0,'fabric',.15);soft(6.25,1.55,.42,0,1.72,1.18,'fabric',.16);
  for(const x of [-2.05,0,2.05]){soft(1.96,.43,2.13,x,1.08,-.12,'linen',.16);const cushion=soft(1.96,1.21,.32,x,1.86,.95,'linen',.14);cushion.rotation.x=-.09;}
  for(const x of [-3.05,3.05]){soft(.43,1.35,2.7,x,1.3,0,'fabric',.16);for(const z of [-1.02,1.02])leg(x,z);}
  for(const x of [-2.4,2.4]){const pillow=soft(.84,.86,.25,x,1.68,.38,x<0?'accent':'linen',.16);pillow.rotation.z=x<0?.17:-.17;pillow.rotation.x=-.18;}
 }else if(category==='bed'){
  soft(5.3,.5,6.65,0,.5,0,'wood',.06);soft(5.15,2.8,.32,0,1.7,-3.15,'fabric',.1);soft(5,.63,6.3,0,1.04,.07,'linen',.16);
  const cloth=new PlaneGeometry(5.5,4.15,48,40),vertices=cloth.attributes.position;
  for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),z=vertices.getY(i);vertices.setZ(i,.025*Math.sin(x*7+z*2.1)+.018*Math.sin(z*9+x*.6)-Math.max(0,Math.abs(x)-2.55)*.95);}
  cloth.computeVertexNormals();const quilt=mesh(cloth,'accent',0,1.43,1.1);quilt.rotation.x=-Math.PI/2;mat('accent').side=DoubleSide;for(const x of [-1.28,1.28]){const pillow=soft(2.05,.32,1.27,x,1.53,-2,'linen',.14);pillow.rotation.y=x<0?-.04:.04;}
  for(const x of [-2.4,2.4])for(const z of [-2.8,2.8])leg(x,z,.35);
 }else if(category==='dining'){
  soft(4,.16,2.65,0,2.45,0,'wood',.14);for(const x of [-1.5,1.5])for(const z of [-.9,.9])mesh(new CylinderGeometry(.07,.055,2.4,16),'wood',x,1.2,z);
 }else if(category==='basin'){
  soft(1.9,1.9,1.45,0,1.15,0,'wood',.04);
  const profile=[[0,.02],[.3,.02],[.48,.1],[.68,.25],[.72,.4],[.66,.43],[.58,.31],[.4,.19],[.1,.18],[0,.18]].map(([x,y])=>new Vector2(x,y));mesh(new LatheGeometry(profile,40),'ceramic',0,2.1,0);
  mesh(new CylinderGeometry(.04,.04,.75,12),'metal',0,2.6,-.5);const faucet=mesh(new CylinderGeometry(.04,.04,.42,12),'metal',0,2.95,-.29);faucet.rotation.x=Math.PI/2;
 }else if(category==='toilet'){
  const profile=[[0,0],[.37,0],[.39,.4],[.3,.7],[.56,.95],[.72,1.2],[.75,1.35],[.67,1.4],[.57,1.22],[.2,1.13],[0,1.13]].map(([x,y])=>new Vector2(x,y));const bowl=mesh(new LatheGeometry(profile,48),'ceramic',0,.05,.3);bowl.scale.z=1.25;
  soft(1.4,1.6,.53,0,1.68,-.75,'ceramic',.13);const ring=mesh(new TorusGeometry(.61,.07,12,48),'ceramic',0,1.46,.3);ring.rotation.x=Math.PI/2;ring.scale.y=1.25;soft(.27,.035,.12,0,2.51,-.75,'metal',.03);
 }else if(category==='coffee'){
  mesh(new CylinderGeometry(1.4,1.4,.14,64),'wood',0,1.27,0);
  for(const angle of [0,Math.PI*2/3,Math.PI*4/3]){const x=Math.cos(angle)*.88,z=Math.sin(angle)*.88;mesh(new CylinderGeometry(.09,.07,1.18,16),'wood',x,.59,z);}
  soft(.65,.09,.46,-.4,1.39,.1,'linen',.02);soft(.62,.08,.43,-.37,1.48,.1,'accent',.02);
  mesh(new CylinderGeometry(.23,.18,.12,32),'ceramic',.52,1.39,-.2);
 }else if(category==='plant'){
  const pot=mesh(new CylinderGeometry(.53,.35,.74,40),'ceramic',0,.37,0);
  mesh(new CylinderGeometry(.46,.46,.04,32),'wood',0,.75,0);
  for(let i=0;i<15;i++){
   const a=i*2.39996,h=1+(i%5)*.2,reach=.35+(i%3)*.14;
   const stem=mesh(new CylinderGeometry(.013,.02,h-.65,8),'accent',Math.cos(a)*reach*.4,(h+.65)/2,Math.sin(a)*reach*.4);stem.rotation.z=-Math.cos(a)*.3;stem.rotation.x=Math.sin(a)*.3;
   const leaf=mesh(new SphereGeometry(1,12,8),'accent',Math.cos(a)*reach,h,Math.sin(a)*reach);leaf.scale.set(.18,.44,.035);leaf.rotation.set(.3*Math.sin(a),-a,.55*Math.cos(a));
  }
  pot.material=mat('ceramic');
 }else return null;
 cache.set(category,root);return root.clone(true);
}
