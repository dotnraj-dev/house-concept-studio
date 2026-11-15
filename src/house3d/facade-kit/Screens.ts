import {Group} from 'three';
import {safeRects,type FacadeContext,type Rect} from './layout';
import {profile,instances,mount,type KitMaterial} from './geometry';
export function FinScreen(c:FacadeContext,r:Rect,material:KitMaterial,pitch=.4,out=.2,solidOnly=true){
 const root=new Group();root.name='FinScreen';const patches=safeRects(c,r,solidOnly,.15);root.userData.facadeRects=patches.map(r=>({...r,facing:c.facing}));
 for(const p of patches){const poses=[];for(let u=Math.ceil((p.u+.08)/pitch)*pitch;u<p.u+p.w-.075;u+=pitch)poses.push({at:[u-p.u-p.w/2,0,-.24] as [number,number,number]});
  if(!poses.length)continue;const g=mount(c,p,out);g.add(instances(profile(.095,p.h,.48,.025),material,poses,'Instanced vertical timber fins'));root.add(g);
 }return root;
}
export function SlatScreen(c:FacadeContext,r:Rect,material:KitMaterial,pitch=.27,out=.16,solidOnly=true){
 const root=new Group();root.name='SlatScreen';const patches=safeRects(c,r,solidOnly,.15);root.userData.facadeRects=patches.map(r=>({...r,facing:c.facing}));
 for(const p of patches){const poses=[];for(let y=Math.ceil((p.v+.055)/pitch)*pitch;y<p.v+p.h-.055;y+=pitch)poses.push({at:[0,y-p.v-p.h/2,-.12] as [number,number,number]});
  if(!poses.length)continue;const g=mount(c,p,out);g.add(instances(profile(p.w,.085,.24,.023),material,poses,'Instanced horizontal WPC slats'));root.add(g);
 }return root;
}
