import {roomFitments,overlaps} from './fitout-layout';
import {FLOOR_HEIGHT} from '../building-dimensions';
import {showerZone} from './interior-layout';
import type {Plan,Room} from '../types';
import type {HouseLayout} from './layout';
import {furnishingFrame,worldX,worldZ} from './layout';
import {livingFurniture,bedroomFurniture} from './furniture';
import {bathroomFixtures} from './bathroom';
export function presentationPose(plan:Plan,r:Room,layout:HouseLayout,detail?:'shower'|'storage'){
 const cx=r.x+r.w/2,cz=r.y+r.h/2,door=layout.doors.find(d=>d.rooms?.includes(r.id));
 let x=Math.max(r.x+.65,Math.min(r.x+r.w-.65,door?door.x+(door.axis==='x'?door.width/2:0):cx)),z=Math.max(r.y+.65,Math.min(r.y+r.h-.65,door?door.z+(door.axis==='z'?door.width/2:0):cz)),lx=cx,lz=cz,ly=3.1,y=5.15;
 const frame=furnishingFrame(plan,r),local=frame.local;
 if(['living','lounge'].includes(r.kind)){
  const f=livingFurniture(local);[x,z]=frame.transform(Math.min(local.x+local.w-1,f.sofa.x+1.5),Math.min(local.y+local.h-.8,f.sofa.z+.35));[lx,lz]=frame.transform(f.tv.x,f.tv.z);ly=3.9;
 }else if(r.kind==='kitchen'){[x,z]=frame.transform(local.x+local.w*.68,local.y+1.2);[lx,lz]=frame.transform(local.x+local.w/2,local.y+local.h-.8);ly=3.5;}
 else if(r.kind==='bedroom'){const bed=bedroomFurniture(local);[x,z]=frame.transform(local.x+local.w-.9,local.y+local.h-.9);[lx,lz]=frame.transform(bed.x,bed.z-1);ly=2.7;}
 else if(r.kind==='bathroom'){const basin=bathroomFixtures(r,layout).find(f=>f.kind==='basin');if(basin){const candidates=[[r.x+.75,r.y+.75],[r.x+r.w-.75,r.y+.75],[r.x+.75,r.y+r.h-.75],[r.x+r.w-.75,r.y+r.h-.75]];[x,z]=candidates.sort((a,b)=>Math.hypot(b[0]-basin.x,b[1]-basin.z)-Math.hypot(a[0]-basin.x,a[1]-basin.z))[0];lx=basin.x;lz=basin.z;ly=3.5;}}
 if(detail==='shower'){const s=showerZone(r,layout);if(s){const spots=[[r.x+1,r.y+1],[r.x+r.w-1,r.y+1],[r.x+1,r.y+r.h-1],[r.x+r.w-1,r.y+r.h-1]];[x,z]=spots.sort((a,b)=>Math.hypot(b[0]-s.x,b[1]-s.z)-Math.hypot(a[0]-s.x,a[1]-s.z))[0];lx=s.x;lz=s.z;ly=3.4;}}
 if(detail==='storage'){
  const fit=roomFitments(plan,r,layout).find(f=>['wardrobe','prayer','upper','sideboard'].includes(f.kind));
  if(fit){const distance=Math.max(3,Math.min(7,r.w*.5,r.h*.65));x=Math.max(r.x+.8,Math.min(r.x+r.w-.8,fit.x+Math.sin(fit.angle)*distance));z=Math.max(r.y+.8,Math.min(r.y+r.h-.8,fit.z+Math.cos(fit.angle)*distance));lx=fit.x;lz=fit.z;ly=fit.bottom+fit.height*.5;}
 }
 const solid=roomFitments(plan,r,layout).filter(f=>f.bottom<6);
 if(solid.some(f=>overlaps({x,z,w:.7,d:.7},f,.2))){
  const spots=[[r.x+1.2,r.y+1.2],[r.x+r.w-1.2,r.y+1.2],[r.x+1.2,r.y+r.h-1.2],[r.x+r.w-1.2,r.y+r.h-1.2],[cx,cz]];
  const free=spots.filter(([a,b])=>!solid.some(f=>overlaps({x:a,z:b,w:.7,d:.7},f,.25))).sort((a,b)=>Math.hypot(b[0]-lx,b[1]-lz)-Math.hypot(a[0]-lx,a[1]-lz))[0];if(free)[x,z]=free;
 }
 return {id:Date.now(),floor:r.floor,position:[worldX(plan,x),r.floor*FLOOR_HEIGHT+y,worldZ(plan,z)] as [number,number,number],look:[worldX(plan,lx),r.floor*FLOOR_HEIGHT+ly,worldZ(plan,lz)] as [number,number,number]};
}

