import {Group,PlaneGeometry} from 'three';
import {GROUND_LEVEL} from '../../building-dimensions';
import {plotEdges} from '../../site-context';
import {entrancePose} from '../layout';
import type {FacadeContext} from './layout';
import {beam,instances,profile,solid} from './geometry';
import type {MaterialSet} from './materials';
export type GatePattern='cnc'|'vertical-bars'|'wood-and-metal';
export function Gate(width:number,m:MaterialSet,pattern:GatePattern){
 const root=new Group();root.name='Designed '+pattern+' gate · open';const leafWidth=width/2;
 for(const sign of [-1,1]){
  const leaf=new Group();leaf.position.set(sign*width/2,2.1,0);leaf.rotation.y=sign*Math.PI/2;
  const centre=-sign*leafWidth/2;for(const y of [-1.8,1.8])leaf.add(beam([leafWidth,.10,.14],m.metal,[centre,y,0],.025));
  for(const end of [0,-sign*leafWidth])leaf.add(beam([.09,3.7,.14],m.metal,[end,0,0],.025));
  if(pattern==='cnc'){
   const geo=new PlaneGeometry(leafWidth-.15,3.4),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*leafWidth/4,uv.getY(i)*3.4/4);
   const panel=solid(geo,m.jaali.cross.material,'CNC perforated gate sheet');panel.position.set(centre,0,0);panel.customDepthMaterial=m.jaali.cross.depth as import('three').MeshDepthMaterial;leaf.add(panel);
  }else{
   const poses=[];for(let x=-leafWidth/2+.14;x<leafWidth/2-.08;x+=pattern==='wood-and-metal'?.23:.22)poses.push({at:[centre+x,0,0] as [number,number,number]});
   leaf.add(instances(profile(pattern==='wood-and-metal'?.17:.045,3.5,.09,.015),pattern==='wood-and-metal'?m.timber:m.metal,poses,'Instanced gate members'));
  }
  leaf.add(beam([.065,.52,.16],m.metal,[-sign*(leafWidth-.2),.05,.13],.02));root.add(leaf);
 }return root;
}
export function CompoundWall(c:FacadeContext,m:MaterialSet,pattern:GatePattern){
 const root=new Group();root.name='Compound wall and aligned entrance gates';
 const poly=plotEdges(c.plan),entry=entrancePose(c.plan,c.layout),parking=c.plan.rooms.find(r=>r.floor===0&&r.kind==='portico');
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz);if(len<.1)continue;
  const g=new Group();g.position.set(a.x-c.plan.offsetX,GROUND_LEVEL,a.y-c.plan.offsetY);g.rotation.y=-Math.atan2(dz,dx);
  const along=(x:number,z:number)=>(x+c.plan.offsetX-a.x)*dx/len+(z+c.plan.offsetY-a.y)*dz/len;
  const spans:[number,number][]=[];
  if(a.road){const u=along(entry.x,entry.z);spans.push([Math.max(.55,u-2.2),Math.min(len-.55,u+2.2)]);
   if(parking){const p=along(parking.x+parking.w/2,parking.y+parking.h/2);spans.push([Math.max(.55,p-4.25),Math.min(len-.55,p+4.25)]);}
  }
  const merged:[number,number][]=[];for(const r of spans.sort((a,b)=>a[0]-b[0])){const last=merged.at(-1);if(last&&r[0]<=last[1]+.4)last[1]=Math.max(last[1],r[1]);else if(r[1]>r[0])merged.push([...r]);}
  let start=0;const solids:[number,number][]=[];for(const [u,v] of merged){if(u>start+.1)solids.push([start,u]);start=v;}if(start<len)solids.push([start,len]);
  for(const [u,v] of solids){g.add(beam([v-u,2.7,.38],m.paint,[(u+v)/2,1.35,0],.07));g.add(beam([v-u+.08,.12,.52],m.accent,[(u+v)/2,2.74,0],.035));
   if(a.road&&v-u>2)g.add(beam([v-u-.4,.75,.08],m.stone,[(u+v)/2,1.8,-.22],.025));
  }
  for(const u of merged.flat()){g.add(beam([.65,4.2,.65],m.accent,[u,2.1,0],.07));g.add(beam([.82,.16,.82],m.paint,[u,4.25,0],.06));g.add(beam([.32,.44,.32],m.metal,[u,4.6,0],.06));g.add(beam([.22,.24,.35],m.warm,[u,4.6,-.015],.04));}
  for(const [u,v] of merged){const gate=Gate(Math.max(.1,v-u-.1),m,pattern);gate.position.x=(u+v)/2;g.add(gate);}
  root.add(g);
 }return root;
}
