import {tvJoinery} from './interior-layout';
import type {Plan,Room} from '../types';
import {fitoutOf,roomFitout} from '../fitout';
import {furnishingFrame,type HouseLayout} from './layout';
import {bedroomFurniture,livingFurniture,diningFurniture,kitchenCounter} from './furniture';
export type Footprint={x:number;z:number;w:number;d:number};
export type Fitting=Footprint&{id:string;kind:'fridge'|'wardrobe'|'loft'|'art'|'ac'|'prayer'|'upper'|'shelves'|'sideboard'|'laundry';angle:number;width:number;depth:number;height:number;bottom:number;roomId:string};
export const overlaps=(a:Footprint,b:Footprint,gap=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.z-b.z)<(a.d+b.d)/2+gap;
export function doorReservations(room:Room,layout:HouseLayout):Footprint[]{
 return layout.doors.filter(d=>d.floor===room.floor&&d.rooms?.includes(room.id)).map(d=>{
  const x=d.x+(d.axis==='x'?d.width/2:0),z=d.z+(d.axis==='z'?d.width/2:0),along=d.axis==='x';
  const sign=along?(room.y+room.h/2>z?1:-1):(room.x+room.w/2>x?1:-1),depth=d.arch?2:d.width+.5;
  return {x:x+(along?0:sign*depth/2),z:z+(along?sign*depth/2:0),w:along?d.width+.8:depth,d:along?depth:d.width+.8};
 });
}
export function primaryFootprints(plan:Plan,room:Room):Footprint[]{
 const frame=furnishingFrame(plan,room),r=frame.local,swap=Math.abs(Math.sin(frame.angle))>.5;
 const box=(b:{x:number;z:number;w:number;d:number}):Footprint=>{const [x,z]=frame.transform(b.x,b.z);return {x,z,w:swap?b.d:b.w,d:swap?b.w:b.d};};
 if(room.kind==='bedroom')return [box(bedroomFurniture(r))];
 if(['living','lounge'].includes(room.kind)){const f=livingFurniture(r);return [box(f.sofa),box(f.coffee),box({...f.tv,d:1.8,w:Math.max(4,f.tv.w)})];}
 if(room.kind==='dining'){const f=diningFurniture(r);return [box({...f,w:f.w+4.4,d:f.d+2})];}
 if(room.kind==='kitchen'){const q=kitchenCounter(r);return [box({x:q.x,z:q.z,w:q.w+.1,d:1.9})];}
 return [];
}
type Slot={side:number;start:number;end:number};
function solidSlots(room:Room,layout:HouseLayout,bottom:number,top:number):Slot[]{
 const result:Slot[]=[];
 for(const w of layout.walls.filter(w=>w.floor===room.floor&&w.rooms?.includes(room.id)&&w.bottom<=bottom+.01&&w.bottom+w.height>=top-.01)){
  const along=w.w>w.d,cx=w.x+w.w/2,cz=w.z+w.d/2,side=along?(Math.abs(cz-room.y)<.3?0:2):(Math.abs(cx-room.x)<.3?3:1);
  const start=along?w.x:w.z,end=start+(along?w.w:w.d);result.push({side,start,end});
 }
 const merged:Slot[]=[];
 for(const side of [0,1,2,3])for(const s of result.filter(s=>s.side===side).sort((a,b)=>a.start-b.start)){
  const last=merged[merged.length-1];if(last?.side===side&&s.start<=last.end+.04)last.end=Math.max(last.end,s.end);else merged.push({...s});
 }return merged;
}
function mounted(room:Room,slot:Slot,along:number,width:number,depth:number):Footprint&{angle:number}{
 const off=depth/2+.18,side=slot.side;
 return {x:side===1?room.x+room.w-off:side===3?room.x+off:along,z:side===0?room.y+off:side===2?room.y+room.h-off:along,w:side%2?depth:width,d:side%2?width:depth,angle:[0,-Math.PI/2,Math.PI,Math.PI/2][side]};
}
export function roomFitments(plan:Plan,room:Room,layout:HouseLayout):Fitting[]{
 const opt=roomFitout(plan,room),home=fitoutOf(plan.design),items:Fitting[]=[],base=primaryFootprints(plan,room),doors=doorReservations(room,layout);
 const highObstacles:{box:Footprint;bottom:number;top:number}[]=[];
 if(room.kind==='kitchen'){
  const frame=furnishingFrame(plan,room),r=frame.local,swap=Math.abs(Math.sin(frame.angle))>.5,q=kitchenCounter(r);
  for(const v of [{x:q.hobX,z:r.y+r.h-1,w:2.9,d:1.7,bottom:3.1,top:8.7}]){
   const [x,z]=frame.transform(v.x,v.z);highObstacles.push({box:{x,z,w:swap?v.d:v.w,d:swap?v.w:v.d},bottom:v.bottom,top:v.top});
  }
 }
 if(['living','lounge'].includes(room.kind)){
  const frame=furnishingFrame(plan,room),j=tvJoinery(frame.local),[x,z]=frame.transform(j.x,frame.local.y+.6),swap=Math.abs(Math.sin(frame.angle))>.5;
  highObstacles.push({box:{x,z,w:swap?1.4:j.width+.2,d:swap?j.width+.2:1.4},bottom:0,top:6.75});
 }
 const place=(kind:Fitting['kind'],desired:number,depth:number,height:number,bottom=0,min=desired,avoidFurniture=true,preferredSide?:number)=>{
  const candidates:{v:Fitting;score:number}[]=[];
  for(const slot of solidSlots(room,layout,Math.max(.05,bottom),bottom+height)){
   for(const width of [...new Set([desired,desired*.65,min].map(n=>Math.min(n,slot.end-slot.start-.5)))]){if(width<min-.01)continue;
   const ends=[(slot.start+slot.end)/2,slot.start+width/2+.25,slot.end-width/2-.25];
   for(const at of ends){const p=mounted(room,slot,at,width,depth);
    const other=items.filter(f=>bottom<f.bottom+f.height&&bottom+height>f.bottom);
    if(other.some(f=>overlaps(p,f,.12)))continue;
    if(highObstacles.some(o=>bottom<o.top&&bottom+height>o.bottom&&overlaps(p,o.box,.15)))continue;
    if(bottom<7&&doors.some(d=>overlaps(p,d,.15)))continue;
    if(avoidFurniture&&bottom<3&&base.some(b=>overlaps(p,b,kind==='wardrobe'?1.8:kind==='fridge'?.15:.8)))continue;
    if(p.x-p.w/2<room.x+.12||p.x+p.w/2>room.x+room.w-.12||p.z-p.d/2<room.y+.12||p.z+p.d/2>room.y+room.h-.12)continue;
    candidates.push({v:{...p,id:kind+'-'+room.id,kind,width,depth,height,bottom,roomId:room.id},score:width+(slot.side===preferredSide?20:0)-Math.abs(at-(slot.start+slot.end)/2)*.01});
   }
  }
  }
  const found=candidates.sort((a,b)=>b.score-a.score)[0]?.v;if(found)items.push(found);return found;
 };
 const enclosed=!['terrace','portico','stairs','passage','foyer'].includes(room.kind),habitable=['living','lounge','bedroom','dining','pooja'].includes(room.kind);
 if(plan.design?.furnished!==false&&room.kind==='passage'&&room.attachedTo){
  const parent=plan.rooms.find(r=>r.id===room.attachedTo);if(parent&&!roomFitments(plan,parent,layout).some(f=>f.kind==='wardrobe'))place('wardrobe',6,2,7.5,0,3.2);
 }
 if(plan.design?.furnished!==false&&room.kind==='bedroom')place('wardrobe',6,2,7.5,0,3.2);
 if(plan.pooja&&home.prayerMode!=='room'&&room.id===(plan.rooms.find(r=>r.floor===0&&r.kind==='living')?.id))place('prayer',home.prayerMode==='cabinet'?3.6:3,home.prayerMode==='cabinet'?1.35:.75,home.prayerMode==='cabinet'?7.5:2.4,home.prayerMode==='cabinet'?0:3.2,2.3);
 if(room.kind==='pooja')place('prayer',Math.min(4.5,room.w-1),1.3,7.4,0,2);
 if(room.kind==='utility')place('laundry',2.3,2.2,3.1,0,2.3);
 if(room.kind==='kitchen'){place('fridge',2.3,2.2,5.4,0,2.3);place('upper',5,1.1,2.3,5.05,1.6,false);place('shelves',3.8,.85,2.5,4.5,1.6,false);}
 if(enclosed&&opt.loft)place('loft',room.kind==='bedroom'?8:6,1.75,1.05,8.55,2.4,false);
 if(enclosed&&opt.ac)place('ac',2.8,.72,.85,7.45,2.8,false);
 if(plan.design?.furnished!==false&&habitable&&opt.art)place('art',room.kind==='bedroom'?2.8:3.5,.10,2.2,3.9,2,false);
 if(plan.design?.furnished!==false&&room.kind==='lounge'&&room.w*room.h>190)place('sideboard',4.5,1.25,2.6,0,3);
 return items.filter(item=>plan.editor?.data.objects[item.id]!==null).map(item=>{const edit=plan.editor?.data.objects[item.id];return edit?{...item,x:edit.x,z:edit.y,angle:edit.angle}:item;});
}
export function bedsideTables(plan:Plan,room:Room,layout:HouseLayout):Footprint[]{
 if(room.kind!=='bedroom'||plan.design?.furnished===false)return [];
 const f=furnishingFrame(plan,room),bed=bedroomFurniture(f.local),swap=Math.abs(Math.sin(f.angle))>.5,doors=doorReservations(room,layout),storage=roomFitments(plan,room,layout).filter(v=>v.bottom<3);
 const tables:Footprint[]=[];
 for(const sign of [-1,1])for(const width of [1.3,1,.85]){
  const depth=width<1.1?1.1:1.4,[x,z]=f.transform(bed.x+sign*(bed.w/2+width/2+.12),bed.z-bed.d/2+.9),p={x,z,w:swap?depth:width,d:swap?width:depth};
  if(p.x-p.w/2>room.x+.18&&p.x+p.w/2<room.x+room.w-.18&&p.z-p.d/2>room.y+.18&&p.z+p.d/2<room.y+room.h-.18&&!doors.some(d=>overlaps(p,d,.1))&&!storage.some(s=>overlaps(p,s,.1))){tables.push(p);break;}
 }return tables;
}
