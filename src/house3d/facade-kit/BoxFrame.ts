import {Group} from 'three';
import {intersects,safeRects,expandedOpenings,type FacadeContext,type Rect} from './layout';
import {beam,mount,ring,solid,type KitMaterial} from './geometry';
export function BoxFrame(c:FacadeContext,r:Rect,material:KitMaterial,depth=1,rounded=false,thickness=.48){
 depth=Math.max(.75,Math.min(1.5,depth));const root=new Group();root.name='BoxFrame';
 const strips=[{u:r.u,v:r.v,w:r.w,h:thickness},{u:r.u,v:r.v+r.h-thickness,w:r.w,h:thickness},{u:r.u,v:r.v+thickness,w:thickness,h:r.h-2*thickness},{u:r.u+r.w-thickness,v:r.v+thickness,w:thickness,h:r.h-2*thickness}];
 const corners=rounded?[r.u,r.u+r.w-1.3].flatMap(u=>[r.v,r.v+r.h-1.3].map(v=>({u,v,w:1.3,h:1.3}))):[];
 const cuts=expandedOpenings(c,.1),blocked=[...strips,...corners].some(s=>cuts.some(o=>intersects(s,o)));
 const safe=strips.flatMap(s=>safeRects(c,s,false,.1));root.userData={facadeRects:safe.map(r=>({...r,facing:c.facing})),component:'BoxFrame'};
 if(!blocked){const g=mount(c,r,.035);g.add(solid(ring(r.w,r.h,thickness,depth,rounded),material,'Continuous profiled surround'));root.add(g);}
 else for(const s of safe){const g=mount(c,s,.04);g.add(beam([s.w,s.h,depth],material,[0,0,-depth/2],rounded?.12:.035));root.add(g);}
 return root;
}
