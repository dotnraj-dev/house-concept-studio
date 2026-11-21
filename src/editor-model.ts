import type {Plan,Room,RoomKind} from './types';
import type {DoorSpec,WindowSpec} from './house3d/layout';

export type EditorObject={id:string;kind:string;label:string;roomId:string;floor:number;x:number;y:number;w:number;h:number;angle:number};
export type EditData={rooms:Record<string,Room|null>;doors:Record<string,DoorSpec|null>;windows:Record<string,WindowSpec|null>;objects:Record<string,EditorObject|null>};
export type EditEntry={id:string;label:string;at:string;before:EditData;after:EditData};
export type PlanEdits={version:1;data:EditData;past:EditEntry[];future:EditEntry[]};
const empty=():EditData=>({rooms:{},doors:{},windows:{},objects:{}});
export const emptyEdits=():PlanEdits=>({version:1,data:empty(),past:[],future:[]});
export function migrateEdits(value:unknown):PlanEdits{
 if(!value||typeof value!=='object')return emptyEdits();
 const v=value as Partial<PlanEdits>;if(v.version!==1)return emptyEdits();
 return {version:1,data:{...empty(),...v.data},past:Array.isArray(v.past)?v.past:[],future:Array.isArray(v.future)?v.future:[]};
}
const copy=(data:EditData):EditData=>structuredClone(data);
function commit(edits:PlanEdits,label:string,change:(data:EditData)=>void):PlanEdits{
 const before=copy(edits.data),after=copy(before);change(after);
 if(JSON.stringify(before)===JSON.stringify(after))return edits;
 const entry={id:crypto.randomUUID(),label,at:new Date().toISOString(),before,after};
 return {...edits,data:after,past:[...edits.past.slice(-49),entry],future:[]};
}
const room=(plan:Plan,id:string)=>{const found=plan.rooms.find(r=>r.id===id);if(!found)throw Error('Room no longer exists.');return found;};
const finite=(n:number)=>{if(!Number.isFinite(n))throw Error('Enter a finite measurement in feet.');return n;};
const positive=(n:number)=>{finite(n);if(n<1)throw Error('Room dimensions must be at least 1 ft.');return n;};
const identity=(id:string)=>{if(!id||id.length>160)throw Error('An item ID is required.');return id;};
const level=(floor:number)=>{if(!Number.isInteger(floor)||floor<0)throw Error('Choose a valid floor.');return floor;};
const opening=(value:DoorSpec|WindowSpec)=>{identity(value.id);level(value.floor);finite(value.x);finite(value.z);positive(value.width);if(value.axis!=='x'&&value.axis!=='z')throw Error('Choose a wall axis.');};
const object=(value:EditorObject)=>{identity(value.id);level(value.floor);finite(value.x);finite(value.y);positive(value.w);finite(value.h);if(value.h<=0)throw Error('Object depth must be positive.');finite(value.angle);};
const nextRoom=(d:EditData,plan:Plan,id:string)=>d.rooms[id]||room(plan,id);
const updateRoom=(edits:PlanEdits,plan:Plan,id:string,label:string,update:(r:Room)=>Room)=>commit(edits,label,d=>{d.rooms[id]=update(nextRoom(d,plan,id));});
export function applyPlanEdits(base:Plan,edits:PlanEdits):Plan{
 const rooms=base.rooms.filter(r=>edits.data.rooms[r.id]!==null).map(r=>edits.data.rooms[r.id]||r);
 for(const [id,r] of Object.entries(edits.data.rooms))if(r&&!base.rooms.some(b=>b.id===id))rooms.push(r);
 const plan={...base,rooms,editor:edits,design:base.design?{...base.design,services:base.design.services.map(s=>{const v=edits.data.objects[s.id];return v?{...s,x:v.x,y:v.y,level:v.floor}:s;})}:undefined};
 const warnings=[...base.warnings],checks=[...(base.checks||[])];
 for(const r of rooms){
  const out=r.x<0||r.y<0||r.x+r.w>plan.width+.01||r.y+r.h>plan.depth+.01;
  if(out){const detail=`${r.label} extends beyond the buildable footprint.`;warnings.push(detail);checks.push({id:'editor-bound-'+r.id,title:'Room outside footprint',detail,status:'conflict' as const,target:r.id});}
  if(r.w*r.h<(r.kind==='bedroom'?75:r.kind==='kitchen'?50:r.kind==='bathroom'?25:16)&&!['passage','terrace','portico','stairs'].includes(r.kind)){
   const detail=`${r.label} is ${Math.round(r.w*r.h)} sq ft; review minimum usable area.`;warnings.push(detail);checks.push({id:'editor-size-'+r.id,title:'Small room',detail,status:'warning' as const,target:r.id});
  }
  for(const other of rooms)if(r.id<other.id&&r.floor===other.floor){const dx=Math.min(r.x+r.w,other.x+other.w)-Math.max(r.x,other.x),dy=Math.min(r.y+r.h,other.y+other.h)-Math.max(r.y,other.y);if(dx>.15&&dy>.15){const detail=`${r.label} overlaps ${other.label}.`;warnings.push(detail);checks.push({id:'editor-overlap-'+r.id+'-'+other.id,title:'Room overlap',detail,status:'conflict' as const,target:r.id});}}
  if(r.attachedTo&&!rooms.some(b=>b.id===r.attachedTo&&b.kind==='bedroom'&&b.floor===r.floor)){const detail=`${r.label} has no valid bedroom attachment.`;warnings.push(detail);checks.push({id:'editor-attach-'+r.id,title:'Bathroom attachment',detail,status:'conflict' as const,target:r.id});}
 }
 for(const obj of Object.values(edits.data.objects)){if(!obj||obj.kind==='service'||obj.kind==='external-stair')continue;const r=rooms.find(v=>v.id===obj.roomId);if(!r||obj.floor!==r.floor||obj.x-obj.w/2<r.x+.25||obj.x+obj.w/2>r.x+r.w-.25||obj.y-obj.h/2<r.y+.25||obj.y+obj.h/2>r.y+r.h-.25){const detail=`${obj.label} crosses a room wall or has lost its room.`;warnings.push(detail);checks.push({id:'editor-object-'+obj.id,title:'Object clearance',detail,status:'warning' as const,target:obj.roomId});}}
 return {...plan,warnings,checks};
}
export function addRoom(e:PlanEdits,plan:Plan,kind:RoomKind,floor:number,x:number,y:number,w=8,h=9):PlanEdits{
 positive(w);positive(h);finite(x);finite(y);level(floor);if(floor>=(plan.levels||1))throw Error('Choose an existing floor.');
 const id='room-'+crypto.randomUUID(),r:Room={id,kind,label:kind[0].toUpperCase()+kind.slice(1),floor,x,y,w,h};
 return commit(e,'Add '+r.label,d=>{d.rooms[id]=r;});
}
export function removeRoom(e:PlanEdits,plan:Plan,id:string):PlanEdits{return updateRoom(e,plan,id,'Remove '+room(plan,id).label,()=>null as unknown as Room);}
export function moveRoom(e:PlanEdits,plan:Plan,id:string,x:number,y:number):PlanEdits{return updateRoom(e,plan,id,'Move '+room(plan,id).label,r=>{finite(x);finite(y);
  const bedroom=r.kind==='bathroom'?plan.rooms.find(b=>b.kind==='bedroom'&&b.floor===r.floor&&b.id!==id&&((Math.min(x+r.w,b.x+b.w)-Math.max(x,b.x)>-.3&&Math.min(y+r.h,b.y+b.h)-Math.max(y,b.y)>1)||(Math.min(y+r.h,b.y+b.h)-Math.max(y,b.y)>-.3&&Math.min(x+r.w,b.x+b.w)-Math.max(x,b.x)>1))):undefined;
  if(bedroom){const b=bedroom,dx=Math.min(x+r.w,b.x+b.w)-Math.max(x,b.x),dy=Math.min(y+r.h,b.y+b.h)-Math.max(y,b.y);
   if(dx>.15&&dy>.15){const options=[{x:b.x-r.w,y:Math.max(b.y-r.h+2,Math.min(y,b.y+b.h-2))},{x:b.x+b.w,y:Math.max(b.y-r.h+2,Math.min(y,b.y+b.h-2))},{x:Math.max(b.x-r.w+2,Math.min(x,b.x+b.w-2)),y:b.y-r.h},{x:Math.max(b.x-r.w+2,Math.min(x,b.x+b.w-2)),y:b.y+b.h}];
    options.sort((a,c)=>{const cost=(p:typeof a)=>Math.abs(p.x-r.x)+Math.abs(p.y-r.y)+((p.x<0||p.y<0||p.x+r.w>plan.width||p.y+r.h>plan.depth)?100:0)+plan.rooms.filter(v=>v.id!==id&&v.id!==b.id&&v.floor===r.floor).reduce((sum,v)=>sum+Math.max(0,Math.min(p.x+r.w,v.x+v.w)-Math.max(p.x,v.x))*Math.max(0,Math.min(p.y+r.h,v.y+v.h)-Math.max(p.y,v.y)),0)*3;return cost(a)-cost(c);});x=options[0].x;y=options[0].y;}
  }
  return {...r,x,y,attachedTo:r.kind==='bathroom'?bedroom?.id:r.attachedTo};});}
export function moveRooms(e:PlanEdits,plan:Plan,ids:string[],dx:number,dy:number):PlanEdits{finite(dx);finite(dy);const unique=[...new Set(ids)];if(!unique.length)throw Error('Select rooms to move.');for(const id of unique)room(plan,id);return commit(e,`Move ${unique.length} rooms`,d=>{for(const id of unique){const r=nextRoom(d,plan,id);d.rooms[id]={...r,x:finite(r.x+dx),y:finite(r.y+dy)};}});}
export function resizeRoom(e:PlanEdits,plan:Plan,id:string,x:number,y:number,w:number,h:number):PlanEdits{return updateRoom(e,plan,id,'Resize '+room(plan,id).label,r=>({...r,x:finite(x),y:finite(y),w:positive(w),h:positive(h)}));}
export function renameRoom(e:PlanEdits,plan:Plan,id:string,label:string):PlanEdits{if(!label.trim()||label.length>120)throw Error('Enter a room name.');return updateRoom(e,plan,id,'Rename room',r=>({...r,label:label.trim()}));}
export function changeKind(e:PlanEdits,plan:Plan,id:string,kind:RoomKind):PlanEdits{return updateRoom(e,plan,id,'Change room type',r=>({...r,kind,attachedTo:kind==='bathroom'?r.attachedTo:undefined}));}
export function attachBathroom(e:PlanEdits,plan:Plan,id:string,bedroomId:string):PlanEdits{const b=room(plan,bedroomId),bath=room(plan,id);if(bath.kind!=='bathroom'||b.kind!=='bedroom'||b.floor!==bath.floor)throw Error('Choose a bathroom and bedroom on the same floor.');return updateRoom(e,plan,id,'Attach bathroom',r=>({...r,attachedTo:bedroomId}));}
export function detachBathroom(e:PlanEdits,plan:Plan,id:string):PlanEdits{if(room(plan,id).kind!=='bathroom')throw Error('Choose a bathroom.');return updateRoom(e,plan,id,'Detach bathroom',r=>({...r,attachedTo:undefined}));}
export function addDoor(e:PlanEdits,door:DoorSpec):PlanEdits{opening(door);return commit(e,'Add door',d=>{d.doors[door.id]=door;});}
export function removeDoor(e:PlanEdits,id:string):PlanEdits{identity(id);return commit(e,'Remove door',d=>{d.doors[id]=null;});}
export function moveDoor(e:PlanEdits,door:DoorSpec,x:number,z:number):PlanEdits{opening(door);return commit(e,'Move door',d=>{d.doors[door.id]={...door,x:finite(x),z:finite(z)};});}
export function resizeDoor(e:PlanEdits,door:DoorSpec,width:number):PlanEdits{opening(door);return commit(e,'Resize door',d=>{d.doors[door.id]={...door,width:positive(width)};});}
export function flipDoor(e:PlanEdits,door:DoorSpec):PlanEdits{opening(door);return commit(e,'Flip door swing',d=>{d.doors[door.id]={...door,swing:-(door.swing||1)};});}
export function addWindow(e:PlanEdits,window:WindowSpec):PlanEdits{opening(window);identity(window.roomId);return commit(e,'Add window',d=>{d.windows[window.id]=window;});}
export function removeWindow(e:PlanEdits,id:string):PlanEdits{identity(id);return commit(e,'Remove window',d=>{d.windows[id]=null;});}
export function moveWindow(e:PlanEdits,window:WindowSpec,x:number,z:number,axis=window.axis,outward=window.outward):PlanEdits{opening(window);if(axis!=='x'&&axis!=='z')throw Error('Choose a wall axis.');return commit(e,'Move window',d=>{d.windows[window.id]={...window,x:finite(x),z:finite(z),axis,outward};});}
export function resizeWindow(e:PlanEdits,window:WindowSpec,width:number):PlanEdits{opening(window);return commit(e,'Resize window',d=>{d.windows[window.id]={...window,width:positive(width)};});}
export function addObject(e:PlanEdits,value:EditorObject):PlanEdits{object(value);return commit(e,'Add '+value.label,d=>{d.objects[value.id]=value;});}
export function removeObject(e:PlanEdits,id:string):PlanEdits{identity(id);return commit(e,'Remove object',d=>{d.objects[id]=null;});}
export function moveObject(e:PlanEdits,value:EditorObject,x:number,y:number,roomId=value.roomId,floor=value.floor):PlanEdits{object(value);level(floor);return commit(e,'Move '+value.label,d=>{d.objects[value.id]={...value,x:finite(x),y:finite(y),roomId,floor};});}
export function rotateObject(e:PlanEdits,value:EditorObject,angle:number):PlanEdits{object(value);return commit(e,'Rotate '+value.label,d=>{d.objects[value.id]={...value,angle:finite(angle)};});}
export function setFloor(e:PlanEdits,plan:Plan,id:string,floor:number):PlanEdits{level(floor);if(floor>=(plan.levels||1))throw Error('Choose an existing floor.');return updateRoom(e,plan,id,'Move room to floor',r=>({...r,floor}));}
export function undo(e:PlanEdits):PlanEdits{const last=e.past.at(-1);return last?{...e,data:copy(last.before),past:e.past.slice(0,-1),future:[last,...e.future]}:e;}
export function redo(e:PlanEdits):PlanEdits{const next=e.future[0];return next?{...e,data:copy(next.after),past:[...e.past,next],future:e.future.slice(1)}:e;}
export const snap=(n:number)=>Math.round(n*4)/4;
