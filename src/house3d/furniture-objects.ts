import type {Plan,Room} from '../types';
import type {EditorObject} from '../editor-model';
import {furnishingFrame} from './layout';
import {bedroomFurniture,diningFurniture,livingFurniture} from './furniture';

/** Stable, measured furniture identities shared by the plan and scene. Coordinates are feet. */
export function furnitureObjects(plan:Plan,room:Room):EditorObject[]{
 if(plan.design?.furnished===false)return [];
 const frame=furnishingFrame(plan,room),items:EditorObject[]=[];
 const put=(key:string,label:string,kind:string,x:number,z:number,w:number,h:number)=>{const [px,py]=frame.transform(x,z);items.push({id:`furniture-${room.id}-${key}`,kind,label,roomId:room.id,floor:room.floor,x:px,y:py,w,h,angle:frame.angle});};
 if(room.kind==='living'||room.kind==='lounge'){
  const {sofa,rug,coffee,tv}=livingFurniture(frame.local);
  put('sofa','Sofa','sofa',sofa.x,sofa.z,sofa.w,sofa.d);
  put('rug','Rug','rug',rug.x,rug.z,rug.w,rug.d);
  put('coffee','Coffee table','coffee',coffee.x,coffee.z,coffee.w,coffee.d);
  put('tv','TV','tv',tv.x,tv.z,tv.w,tv.d);
  put('plant','Plant','plant',frame.local.x+frame.local.w-1.05,frame.local.y+frame.local.h-1.1,.9,.9);
 }else if(room.kind==='bedroom'){
  const bed=bedroomFurniture(frame.local);put('bed','Bed','bed',bed.x,bed.z,bed.w,bed.d);
  put('plant','Plant','plant',frame.local.x+frame.local.w-1.05,frame.local.y+frame.local.h-1.05,.8,.8);
 }else if(room.kind==='dining'){
  const table=diningFurniture(frame.local);put('table','Dining table','dining',table.x,table.z,table.w,table.d);
  table.chairs.forEach((chair,i)=>put(`chair-${i}`,`Dining chair ${i+1}`,'chair',chair.x,chair.z,chair.w,chair.d));
 }
 return items.flatMap(item=>{const override=plan.editor?.data.objects[item.id];return override===null?[]:[override||item];});
}
