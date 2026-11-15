import {Group,PlaneGeometry,DoubleSide,type MeshDepthMaterial} from 'three';
import {safeRects,type FacadeContext,type Rect} from './layout';
import {beam,mount,solid} from './geometry';
import type {MaterialSet} from './materials';
export function JaaliPanel(c:FacadeContext,r:Rect,materials:MaterialSet,pattern:'star'|'cross'|'flower'='star',out=.3,solidOnly=true){
 const root=new Group();root.name='JaaliPanel · '+pattern;const patches=safeRects(c,r,solidOnly,.16);root.userData.facadeRects=patches.map(r=>({...r,facing:c.facing}));
 for(const p of patches){if(p.w<.35||p.h<.35)continue;const g=mount(c,p,out),geo=new PlaneGeometry(p.w,p.h),uv=geo.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)*p.w+p.u)/4,(uv.getY(i)*p.h+p.v)/4);
  const mesh=solid(geo,materials.jaali[pattern].material,'Alpha-cut CNC jaali');mesh.rotation.y=Math.PI;mesh.customDepthMaterial=materials.jaali[pattern].depth as MeshDepthMaterial;mesh.userData={alphaMasked:true,pattern};g.add(mesh);
  for(const sign of [-1,1]){g.add(beam([.055,p.h,.12],materials.metal,[sign*p.w/2,0,.015]));g.add(beam([p.w,.055,.12],materials.metal,[0,sign*p.h/2,.015]));}
  root.add(g);
 }return root;
}
