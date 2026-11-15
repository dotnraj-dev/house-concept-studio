import {Group,SpotLight,Object3D} from 'three';
import {safeRects,type FacadeContext,type Rect} from './layout';
import {beam,mount} from './geometry';
import type {MaterialSet} from './materials';
export function CoveStrip(c:FacadeContext,r:Rect,m:MaterialSet,out=.5,realLight=false){
 const g=mount(c,r,out);g.name='Warm cove under projection';g.add(beam([r.w,.045,.055],m.warm,[0,0,0],.012));
 if(realLight){const target=new Object3D();target.position.set(0,-4,.45);g.add(target);const light=new SpotLight('#ffd49a',22,14,1,.75,2);light.position.set(0,-.08,.2);light.target=target;g.add(light);}return g;
}
export function FacadeLights(c:FacadeContext,positions:{u:number;v:number}[],m:MaterialSet){
 const root=new Group();root.name='Warm up/down wall washers';
 for(const [i,p] of positions.entries()){
  const r={u:p.u-.15,v:p.v-.3,w:.3,h:.6},safe=safeRects(c,r,true,.18);
  if(!safe.some(s=>s.w>=r.w-.01&&s.h>=r.h-.01))continue;
  const g=mount(c,r,.22);g.add(beam([.28,.58,.19],m.metal,[0,0,-.06],.055));
  for(const sign of [-1,1]){g.add(beam([.19,.026,.15],m.warm,[0,sign*.29,-.07],.009));
   if(i<2){const target=new Object3D();target.position.set(0,sign*3.4,.1);g.add(target);const light=new SpotLight('#ffd4a0',12,9,.50,.65,2);light.position.set(0,sign*.3,-.15);light.target=target;g.add(light);}
  }g.userData.facadeRects=[{...r,facing:c.facing}];root.add(g);
 }return root;
}
