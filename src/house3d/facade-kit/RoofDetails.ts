import {Group,ExtrudeGeometry,Mesh,LatheGeometry,Vector2,BufferGeometry,Float32BufferAttribute,DoubleSide} from 'three';
import {FLOOR_HEIGHT} from '../../building-dimensions';
import type {Plan} from '../../types';
import type {FacadeContext,Rect} from './layout';
import {beam,ring,solid,roundedPath,profile,instances,mount} from './geometry';
import {SlatScreen} from './Screens';
import type {MaterialSet} from './materials';
export function Pergola(c:FacadeContext,r:Rect,m:MaterialSet,depth=3.4){
 const g=mount(c,r,.9);g.name='Timber pergola with framed soffit';g.add(beam([r.w,.24,.3],m.timber,[0,0,0],.04));
 const poses=[];for(let x=-r.w/2+.18;x<r.w/2;x+=.55)poses.push({at:[x,.04,depth/2] as [number,number,number]});
 g.add(instances(profile(.105,.18,depth,.025),m.timber,poses,'Instanced pergola rafters'));return g;
}
export function FloorRibbon(plan:Plan,m:MaterialSet,floor:number){
 const g=new Group();g.name='Sweeping white floor ribbon';
 const geo=ring(plan.width+1.4,plan.depth+1.4,.8,.6,true);geo.rotateX(-Math.PI/2);
 const mesh=solid(geo,m.paint,'Rounded continuous floor fascia');mesh.position.set(plan.width/2,floor*FLOOR_HEIGHT-.04,plan.depth/2);g.add(mesh);return g;
}
export function CurvedParapet(plan:Plan,m:MaterialSet,rounded=false){
 const level=(plan.levels||1)*FLOOR_HEIGHT,g=new Group();g.name=rounded?'Curved roof parapet':'Profiled terrace parapet';
 const slab=new ExtrudeGeometry(roundedPath(plan.width+.75,plan.depth+.75,rounded?1.8:.10) as import('three').Shape,{depth:.32,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,curveSegments:24});
 slab.rotateX(-Math.PI/2);const deck=solid(slab,m.paint,'Profiled roof deck');deck.position.set(plan.width/2,level+.05,plan.depth/2);g.add(deck);
 const parapet=ring(plan.width+.45,plan.depth+.45,.24,1.15,rounded);parapet.rotateX(-Math.PI/2);const wall=solid(parapet,m.paint,'Continuous parapet with rounded corners');wall.position.set(plan.width/2,level+1.55,plan.depth/2);g.add(wall);
 return g;
}
export function StairHeadroom(c:FacadeContext,m:MaterialSet,height=7.5){
 const room=c.plan.rooms.find(r=>r.kind==='stairs'&&r.floor===(c.plan.levels||1)-1);const root=new Group();root.name='Staircase headroom · roof access review required';if(!room)return root;
 const w=Math.max(4,Math.min(6.8,room.w-.6)),d=Math.max(4,Math.min(7.2,room.h-.6)),x=room.x+room.w/2,z=room.y+room.h-d/2-.3,y=(c.plan.levels||1)*FLOOR_HEIGHT+.4;
 root.position.set(x,y,z);
 // A real door aperture remains in the front face; the other faces contain high louvres.
 const t=.22,door=2.8;
 for(const sign of [-1,1])root.add(beam([(w-door)/2,height,t],m.paint,[sign*(w+door)/4,height/2,-d/2],.04));
 root.add(beam([door,height-6.6,t],m.paint,[0,6.6+(height-6.6)/2,-d/2],.03));
 root.add(beam([w,height,t],m.paint,[0,height/2,d/2],.05));
 for(const sign of [-1,1]){root.add(beam([t,4.7,d],m.paint,[sign*w/2,2.35,0]));root.add(beam([t,height-6.6,d],m.paint,[sign*w/2,6.6+(height-6.6)/2,0]));
  const poses=[];for(let h=4.85;h<6.5;h+=.22)poses.push({at:[sign*w/2,h,0] as [number,number,number]});
  root.add(instances(profile(.25,.085,d-.3,.025),m.metal,poses,'Stair headroom louvres'));
 }
 root.add(beam([w+.55,.32,d+.55],m.paint,[0,height+.08,0],.09));
 root.userData={requiresRoofAccessReview:true};return root;
}
export function WaterTankScreen(c:FacadeContext,m:MaterialSet,includeTank=true){
 const root=new Group();root.name='Customer roof-tank screens';
 for(const n of c.plan.design?.services||[]){if(n.type!=='tank'||n.level!==(c.plan.levels||1))continue;
  const x=n.x-c.plan.offsetX,z=n.y-c.plan.offsetY,w=4.7,d=4.7;
  if(x-w/2<.3||x+w/2>c.plan.width-.3||z-d/2<.3||z+d/2>c.plan.depth-.3){root.userData.screenNeedsClearance=true;continue;}
  const stair=c.plan.rooms.find(r=>r.kind==='stairs'&&r.floor===(c.plan.levels||1)-1);
  if(stair&&x+w/2>stair.x-.4&&x-w/2<stair.x+stair.w+.4&&z+d/2>stair.y-.4&&z-d/2<stair.y+stair.h+.4){root.userData.screenNeedsClearance=true;continue;}
  const g=new Group();g.position.set(x,n.level*FLOOR_HEIGHT+.4,z);const poses=[];
  for(let y=.28;y<4.4;y+=.24){poses.push({at:[0,y,-d/2] as [number,number,number]});poses.push({at:[0,y,d/2] as [number,number,number]});}
  g.add(instances(profile(w,.085,.16,.02),m.timber,poses,'Tank privacy louvres'));
  for(const sign of [-1,1]){g.add(beam([.13,4.5,.13],m.metal,[sign*w/2,2.25,-d/2]));g.add(beam([.13,4.5,.13],m.metal,[sign*w/2,2.25,d/2]));}
  const side=[];for(let y=.28;y<4.4;y+=.24)side.push({at:[-w/2,y,0] as [number,number,number]});
  g.add(instances(profile(.16,.085,d,.02),m.timber,side,'Tank side screen; opposite side open for access'));
  if(includeTank){const tank=solid(new LatheGeometry([[0,0],[1.2,0],[1.35,.2],[1.35,3.3],[1.1,3.6],[0,3.6]].map(p=>new Vector2(...p as [number,number])),32),m.dark,'Selected roof water tank');g.add(tank);}
  root.add(g);
 }return root;
}
export function TiledRoof(plan:Plan,m:MaterialSet,pitch=.38,eave=1.1){
 const g=new Group();g.name='Hipped terracotta roof with individual tile relief';
 const a=plan.width/2+eave,b=plan.depth/2+eave,base=(plan.levels||1)*FLOOR_HEIGHT+.2,poses=[];
 const pos:number[]=[],uv:number[]=[];const height=(x:number,z:number)=>Math.max(0,Math.min(a-Math.abs(x),b-Math.abs(z)))*pitch;
 for(let x=-a;x<a;x+=1)for(let z=-b;z<b;z+=1){const corners=[[x,z],[Math.min(a,x+1),z],[Math.min(a,x+1),Math.min(b,z+1)],[x,Math.min(b,z+1)]];
  for(const i of [0,2,1,0,3,2]){const [u,v]=corners[i];pos.push(u,height(u,v),v);uv.push(u,v);}
 }
 const roof=new BufferGeometry();roof.setAttribute('position',new Float32BufferAttribute(pos,3));roof.setAttribute('uv',new Float32BufferAttribute(uv,2));roof.computeVertexNormals();g.add(solid(roof,m.tile,'Closed hip roof surface'));
 // Curled tile lips and raised overlaps: two repeated profiles follow each roof pitch.
 const tilePos:number[]=[];
 for(let i=0;i<8;i++){const x=-.36+i*.09,x2=x+.09,y=.07*Math.sin((x/.72+.5)*Math.PI),y2=.07*Math.sin((x2/.72+.5)*Math.PI);
  tilePos.push(x,y,-.52,x2,y2,-.52,x2,y2,.52,x,y,-.52,x2,y2,.52,x,y,.52);
 }
 const tile=new BufferGeometry();tile.setAttribute('position',new Float32BufferAttribute(tilePos,3));tile.computeVertexNormals();
 for(let x=-a+.38;x<a-.2;x+=.72)for(let z=-b+.4;z<b-.2;z+=.93){
  const side=a-Math.abs(x)<b-Math.abs(z),slope=side?-Math.sign(x)*pitch:-Math.sign(z)*pitch;
  poses.push({at:[x,height(x,z)+.035,z] as [number,number,number],rotation:side?[Math.atan(slope),Math.PI/2,0] as [number,number,number]:[-Math.atan(slope),0,0] as [number,number,number]});
 }
 const tiles=instances(tile,m.tile,poses,'Instanced curved clay roof tiles');(m.tile as import('three').MeshStandardMaterial).side=DoubleSide;g.add(tiles);
 g.add(beam([plan.width+2*eave,.28,plan.depth+2*eave],m.paint,[0,-.10,0],.07));
 const ridgeY=Math.min(a,b)*pitch;g.add(beam([.26,.22,Math.max(.3,2*(b-a))],m.tile,[0,ridgeY+.08,0],.10));
 g.position.set(plan.width/2,base,plan.depth/2);return g;
}
