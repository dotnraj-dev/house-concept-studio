import {Group} from 'three';
import {safeRects,type FacadeContext,type Rect} from './layout';
import {profile,mount,solid,type KitMaterial} from './geometry';
export const STONE_COURSE_FEET=.5;
export function CladdingWall(c:FacadeContext,r:Rect,material:KitMaterial,stacked=true){
 const root=new Group();root.name=stacked?'Stacked-stone feature wall':'Stone feature wall';const patches=safeRects(c,r,true,.10);
 root.userData={facadeRects:patches.map(r=>({...r,facing:c.facing})),stoneCourseFeet:STONE_COURSE_FEET};
 for(const p of patches){const g=mount(c,p,.035),geo=profile(p.w,p.h,.16,.018),position=geo.attributes.position,uv=geo.attributes.uv;
  // The original map has eight stone courses in a four-foot repeat: six inches per course.
  for(let i=0;i<uv.count;i++)uv.setXY(i,(position.getX(i)+p.w/2+p.u)/4,(position.getY(i)+p.h/2+p.v)/4);
  g.add(solid(geo,material,'Stone cladding · 6 inch courses'));root.add(g);
 }return root;
}
