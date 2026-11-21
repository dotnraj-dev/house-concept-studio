import type {Plan,Room,RoomKind,Direction} from './types';
import type {DoorSpec,WindowSpec} from './house3d/layout';
import {validInterior,type RoomInterior} from './interior-options';

export type EditorObject={id:string;kind:string;label:string;roomId:string;floor:number;x:number;y:number;w:number;h:number;angle:number};
export type EditData={rooms:Record<string,Room|null>;doors:Record<string,DoorSpec|null>;windows:Record<string,WindowSpec|null>;objects:Record<string,EditorObject|null>;preferences?:{adaptPlan?:boolean;moveFurniture?:boolean}};
export type EditEntry={id:string;label:string;at:string;before:EditData;after:EditData};
export type PlanEdits={version:1;data:EditData;past:EditEntry[];future:EditEntry[]};
const empty=():EditData=>({rooms:{},doors:{},windows:{},objects:{}});
export const emptyEdits=():PlanEdits=>({version:1,data:empty(),past:[],future:[]});
export function setEditorPreference(e:PlanEdits,key:'adaptPlan'|'moveFurniture',value:boolean):PlanEdits{return commit(e,`Turn ${key==='adaptPlan'?'adapt plan':'move furniture'} ${value?'on':'off'}`,d=>{d.preferences={...d.preferences,[key]:value};});}
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
const clamp=(n:number,lo:number,hi:number)=>Math.min(Math.max(n,lo),hi);
const overlaps=(a:Room,b:Room)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.01&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.01;
const overlapArea=(a:Room,b:Room)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const inside=(plan:Plan,r:Room)=>r.x>=-.001&&r.y>=-.001&&r.x+r.w<=plan.width+.001&&r.y+r.h<=plan.depth+.001;
function contained(plan:Plan,r:Room){if(!inside(plan,r))throw Error(`${r.label} cannot extend outside the buildable footprint inside the setbacks.`);}
function fitRoom(plan:Plan,r:Room,x:number,y:number):Room{
 if(r.w>plan.width||r.h>plan.depth)throw Error(`${r.label} does not fit inside the setbacks.`);
 return {...r,x:clamp(finite(x),0,plan.width-r.w),y:clamp(finite(y),0,plan.depth-r.h)};
}
function shiftContents(d:EditData,plan:Plan,old:Room,next:Room){
 const dx=next.x-old.x,dy=next.y-old.y;
 for(const [id,o] of Object.entries(d.objects))if(o&&o.roomId===old.id){const moved={...o,x:o.x+dx,y:o.y+dy};d.objects[id]=fitObject(moved,next);}
 for(const [id,w] of Object.entries(d.windows))if(w&&w.roomId===old.id)d.windows[id]=onSide({...w,x:w.x+dx,z:w.z+dy},next,openingSide(w,old));
 for(const [id,door] of Object.entries(d.doors))if(door&&door.rooms?.includes(old.id)&&door.rooms.length===1)d.doors[id]=onSide({...door,x:door.x+dx,z:door.z+dy},next,openingSide(door,old));
}
function fitObject(o:EditorObject,r:Room):EditorObject{
 const c=Math.abs(Math.cos(o.angle)),s=Math.abs(Math.sin(o.angle)),halfW=(o.w*c+o.h*s)/2,halfH=(o.w*s+o.h*c)/2;
 if(halfW*2>r.w-.2||halfH*2>r.h-.2)throw Error(`${o.label} does not fit inside ${r.label}.`);
 return {...o,roomId:r.id,floor:r.floor,x:clamp(o.x,r.x+.1+halfW,r.x+r.w-.1-halfW),y:clamp(o.y,r.y+.1+halfH,r.y+r.h-.1-halfH)};
}
/** Adjust rooms touching the changed edges. Reject layouts that cannot keep shared walls. */
export function adaptedRooms(plan:Plan,old:Room,next:Room):Room[]{
 contained(plan,next);const changed:Room[]=[next],eps=.05;
 for(const r of plan.rooms.filter(v=>v.floor===old.floor&&v.id!==old.id)){
  let x=r.x,y=r.y,w=r.w,h=r.h;
  const yShare=Math.min(old.y+old.h,r.y+r.h)-Math.max(old.y,r.y)>eps;
  const xShare=Math.min(old.x+old.w,r.x+r.w)-Math.max(old.x,r.x)>eps;
  if(yShare&&Math.abs(r.x+r.w-old.x)<eps)w=next.x-r.x;
  else if(yShare&&Math.abs(r.x-old.x-old.w)<eps){x=next.x+next.w;w=r.x+r.w-x;}
  if(xShare&&Math.abs(r.y+r.h-old.y)<eps)h=next.y-r.y;
  else if(xShare&&Math.abs(r.y-old.y-old.h)<eps){y=next.y+next.h;h=r.y+r.h-y;}
  if(x!==r.x||y!==r.y||w!==r.w||h!==r.h){const v={...r,x,y,w,h};if(w<1||h<1||!inside(plan,v))throw Error('No valid adaptation: a neighbouring room would become too small or cross the setbacks.');changed.push(v);}
 }
 const all=plan.rooms.filter(r=>r.floor===old.floor).map(r=>changed.find(v=>v.id===r.id)||r);
 const before=plan.rooms.filter(r=>r.floor===old.floor);
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)if(overlapArea(all[i],all[j])>overlapArea(before[i],before[j])+.01)throw Error('No valid adaptation: rooms would overlap.');
 return changed;
}
function changeGeometry(e:PlanEdits,plan:Plan,id:string,next:Room,label:string,adapt:boolean){
 const old=room(plan,id);const changes=adapt?adaptedRooms(plan,old,next):[next];contained(plan,next);
 return commit(e,`${label}${changes.length>1?` · adjusted ${changes.slice(1).map(r=>r.label).join(', ')}`:''}`,d=>{
  for(const v of changes){const prior=nextRoom(d,plan,v.id);d.rooms[v.id]=v;shiftContents(d,plan,prior,v);}
 });
}
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
 const id='room-'+crypto.randomUUID(),r=fitRoom(plan,{id,kind,label:kind[0].toUpperCase()+kind.slice(1),floor,x,y,w,h},x,y);
 if(plan.rooms.some(v=>v.floor===floor&&overlaps(v,r)))throw Error('No free space for this room inside the setbacks.');
 return commit(e,'Add '+r.label,d=>{d.rooms[id]=r;});
}
export function removeRoom(e:PlanEdits,plan:Plan,id:string):PlanEdits{return commit(e,'Remove '+room(plan,id).label,d=>{d.rooms[id]=null;for(const [key,o] of Object.entries(d.objects))if(o?.roomId===id)d.objects[key]=null;for(const [key,w] of Object.entries(d.windows))if(w?.roomId===id)d.windows[key]=null;for(const [key,door] of Object.entries(d.doors))if(door?.rooms?.includes(id))d.doors[key]=null;});}
export function moveRoom(e:PlanEdits,plan:Plan,id:string,x:number,y:number,adapt=false):PlanEdits{const r=room(plan,id);finite(x);finite(y);let target=fitRoom(plan,r,x,y);{
  const bedroom=r.kind==='bathroom'?plan.rooms.find(b=>b.kind==='bedroom'&&b.floor===r.floor&&b.id!==id&&((Math.min(x+r.w,b.x+b.w)-Math.max(x,b.x)>-.3&&Math.min(y+r.h,b.y+b.h)-Math.max(y,b.y)>1)||(Math.min(y+r.h,b.y+b.h)-Math.max(y,b.y)>-.3&&Math.min(x+r.w,b.x+b.w)-Math.max(x,b.x)>1))):undefined;
  if(bedroom){const b=bedroom,dx=Math.min(x+r.w,b.x+b.w)-Math.max(x,b.x),dy=Math.min(y+r.h,b.y+b.h)-Math.max(y,b.y);
   if(dx>.15&&dy>.15){const options=[{x:b.x-r.w,y:Math.max(b.y-r.h+2,Math.min(y,b.y+b.h-2))},{x:b.x+b.w,y:Math.max(b.y-r.h+2,Math.min(y,b.y+b.h-2))},{x:Math.max(b.x-r.w+2,Math.min(x,b.x+b.w-2)),y:b.y-r.h},{x:Math.max(b.x-r.w+2,Math.min(x,b.x+b.w-2)),y:b.y+b.h}].filter(p=>inside(plan,{...r,...p}));
    if(!options.length)throw Error('Bathroom cannot attach here inside the setbacks.');
    options.sort((a,c)=>{const cost=(p:typeof a)=>Math.abs(p.x-r.x)+Math.abs(p.y-r.y)+plan.rooms.filter(v=>v.id!==id&&v.id!==b.id&&v.floor===r.floor).reduce((sum,v)=>sum+Math.max(0,Math.min(p.x+r.w,v.x+v.w)-Math.max(p.x,v.x))*Math.max(0,Math.min(p.y+r.h,v.y+v.h)-Math.max(p.y,v.y)),0)*3;return cost(a)-cost(c);});x=options[0].x;y=options[0].y;}
  }
  target={...fitRoom(plan,r,x,y),attachedTo:r.kind==='bathroom'?bedroom?.id:r.attachedTo};}
 return changeGeometry(e,plan,id,target,'Move '+r.label,adapt);}
export function moveRooms(e:PlanEdits,plan:Plan,ids:string[],dx:number,dy:number):PlanEdits{finite(dx);finite(dy);const unique=[...new Set(ids)];if(!unique.length)throw Error('Select rooms to move.');for(const id of unique)room(plan,id);const minX=Math.min(...unique.map(id=>room(plan,id).x)),minY=Math.min(...unique.map(id=>room(plan,id).y)),maxX=Math.max(...unique.map(id=>{const r=room(plan,id);return r.x+r.w;})),maxY=Math.max(...unique.map(id=>{const r=room(plan,id);return r.y+r.h;}));dx=clamp(dx,-minX,plan.width-maxX);dy=clamp(dy,-minY,plan.depth-maxY);return commit(e,`Move ${unique.length} rooms`,d=>{for(const id of unique){const r=nextRoom(d,plan,id),next={...r,x:r.x+dx,y:r.y+dy};d.rooms[id]=next;shiftContents(d,plan,r,next);}});}
export function resizeRoom(e:PlanEdits,plan:Plan,id:string,x:number,y:number,w:number,h:number,adapt=false):PlanEdits{const r=room(plan,id);positive(w);positive(h);finite(x);finite(y);const right=clamp(x+w,1,plan.width),bottom=clamp(y+h,1,plan.depth),left=clamp(x,0,right-1),top=clamp(y,0,bottom-1);return changeGeometry(e,plan,id,{...r,x:left,y:top,w:right-left,h:bottom-top},'Resize '+r.label,adapt);}
type RoomContents={objects:EditorObject[];doors:DoorSpec[];windows:WindowSpec[]};
const sideOrder:Direction[]=['north','east','south','west'];
function openingSide(v:DoorSpec|WindowSpec,r:Room):Direction{
 if(v.axis==='x')return Math.abs(v.z-r.y)<Math.abs(v.z-r.y-r.h)?'north':'south';
 return Math.abs(v.x-r.x)<Math.abs(v.x-r.x-r.w)?'west':'east';
}
function onSide<T extends DoorSpec|WindowSpec>(v:T,r:Room,side:Direction):T{
 const horizontal=side==='north'||side==='south',span=horizontal?r.w:r.h,width=Math.min(v.width,span-.4);
 if(width<1)throw Error('This wall is too short for the opening.');
 const oldAlong=v.axis==='x'?v.x:v.z,oldSpan=v.axis==='x'?r.w:r.h,oldStart=v.axis==='x'?r.x:r.y;
 const fraction=clamp((oldAlong-oldStart+v.width/2)/oldSpan,0,1),along=(horizontal?r.x:r.y)+clamp(fraction*span-width/2,.2,span-width-.2);
 return {...v,axis:horizontal?'x':'z',width,x:horizontal?along:side==='west'?r.x:r.x+r.w,z:horizontal?(side==='north'?r.y:r.y+r.h):along,...('outward' in v?{outward:side==='north'?[0,-1]:side==='south'?[0,1]:side==='west'?[-1,0]:[1,0]}:{facing:side})} as T;
}
function saveOpenings(d:EditData,old:Room,next:Room,contents:RoomContents,turn:boolean,doorSide?:Direction){
 let sideChosen=false;
 for(const source of contents.doors.filter(v=>v.rooms?.includes(old.id))){
  const id=source.id.startsWith('manual-')?source.id:`manual-${source.id}`;if(id!==source.id)d.doors[source.id]=null;
  const prior=openingSide(source,old),side=doorSide&&!sideChosen?doorSide:(turn?sideOrder[(sideOrder.indexOf(prior)+1)%4]:prior);sideChosen=true;
  d.doors[id]={...onSide(source,next,side),id};
 }
 for(const source of contents.windows.filter(v=>v.roomId===old.id)){
  const id=source.id.startsWith('manual-')?source.id:`manual-${source.id}`;if(id!==source.id)d.windows[source.id]=null;
  const prior=openingSide(source,old),side=turn?sideOrder[(sideOrder.indexOf(prior)+1)%4]:prior;
  d.windows[id]={...onSide(source,next,side),id};
 }
}
export function rotateRoom(e:PlanEdits,plan:Plan,id:string,contents:RoomContents={objects:[],doors:[],windows:[]},adapt=false):PlanEdits{
 const r=room(plan,id),cx=r.x+r.w/2,cy=r.y+r.h/2;
 const next=fitRoom(plan,{...r,w:r.h,h:r.w,customOpenings:true,furnitureFacing:sideOrder[(sideOrder.indexOf(r.furnitureFacing||'north')+1)%4]},cx-r.h/2,cy-r.w/2);
 const changes=adapt?adaptedRooms(plan,r,next):[next];
 return commit(e,`Rotate ${r.label}${changes.length>1?` · adjusted ${changes.slice(1).map(v=>v.label).join(', ')}`:''}`,d=>{
  for(const v of changes){const old=nextRoom(d,plan,v.id);d.rooms[v.id]=v;if(v.id!==id)shiftContents(d,plan,old,v);}
  for(const o of contents.objects.filter(v=>v.roomId===id)){
   const px=o.x-cx,py=o.y-cy,centerX=next.x+next.w/2,centerY=next.y+next.h/2;
   d.objects[o.id]=fitObject({...o,x:centerX-py,y:centerY+px,angle:o.angle-Math.PI/2},next);
  }
  saveOpenings(d,r,next,contents,true);
 });
}
export function setRoomDoorSide(e:PlanEdits,plan:Plan,id:string,side:Direction,contents:RoomContents):PlanEdits{
 const r=room(plan,id);if(!contents.doors.some(v=>v.rooms?.includes(id)))throw Error('Add a door to this room before choosing its side.');
 return commit(e,`Move ${r.label} door to ${side}`,d=>{d.rooms[id]={...r,customOpenings:true};saveOpenings(d,r,r,contents,false,side);});
}
export function renameRoom(e:PlanEdits,plan:Plan,id:string,label:string):PlanEdits{if(!label.trim()||label.length>120)throw Error('Enter a room name.');return updateRoom(e,plan,id,'Rename room',r=>({...r,label:label.trim()}));}
export function changeKind(e:PlanEdits,plan:Plan,id:string,kind:RoomKind):PlanEdits{return updateRoom(e,plan,id,'Change room type',r=>({...r,kind,attachedTo:kind==='bathroom'?r.attachedTo:undefined}));}
export function setRoomInterior(e:PlanEdits,plan:Plan,id:string,patch:RoomInterior):PlanEdits{const clean=validInterior(patch);if(!Object.keys(clean).length)throw Error('Choose an interior option.');return updateRoom(e,plan,id,'Change interior of '+room(plan,id).label,r=>({...r,interior:{...r.interior,...clean}}));}
export function attachBathroom(e:PlanEdits,plan:Plan,id:string,bedroomId:string):PlanEdits{const b=room(plan,bedroomId),bath=room(plan,id);if(bath.kind!=='bathroom'||b.kind!=='bedroom'||b.floor!==bath.floor)throw Error('Choose a bathroom and bedroom on the same floor.');return updateRoom(e,plan,id,'Attach bathroom',r=>({...r,attachedTo:bedroomId}));}
export function detachBathroom(e:PlanEdits,plan:Plan,id:string):PlanEdits{if(room(plan,id).kind!=='bathroom')throw Error('Choose a bathroom.');return updateRoom(e,plan,id,'Detach bathroom',r=>({...r,attachedTo:undefined}));}
function fitOpening(plan:Plan,v:DoorSpec|WindowSpec){
 const id='roomId' in v?v.roomId:v.rooms?.[0],r=id&&plan.rooms.find(q=>q.id===id&&q.floor===v.floor);
 if(!r)throw Error('Choose an opening on an existing room.');
 const side=v.axis==='x'?Math.abs(v.z-r.y)<.15||Math.abs(v.z-r.y-r.h)<.15:Math.abs(v.x-r.x)<.15||Math.abs(v.x-r.x-r.w)<.15;
 const start=v.axis==='x'?v.x:v.z,lo=v.axis==='x'?r.x:r.y,hi=lo+(v.axis==='x'?r.w:r.h);
 if(!side||start<lo-.01||start+v.width>hi+.01||!inside(plan,r))throw Error('Opening must remain on a room wall inside the setbacks.');
}
export function addDoor(e:PlanEdits,door:DoorSpec,plan?:Plan):PlanEdits{opening(door);if(plan)fitOpening(plan,door);return commit(e,'Add door',d=>{d.doors[door.id]=door;});}
export function removeDoor(e:PlanEdits,id:string):PlanEdits{identity(id);return commit(e,'Remove door',d=>{d.doors[id]=null;});}
export function moveDoor(e:PlanEdits,door:DoorSpec,x:number,z:number,plan?:Plan):PlanEdits{opening(door);const next={...door,x:finite(x),z:finite(z)};if(plan)fitOpening(plan,next);return commit(e,'Move door',d=>{d.doors[door.id]=next;});}
export function resizeDoor(e:PlanEdits,door:DoorSpec,width:number,plan?:Plan):PlanEdits{opening(door);const next={...door,width:positive(width)};if(plan)fitOpening(plan,next);return commit(e,'Resize door',d=>{d.doors[door.id]=next;});}
export function flipDoor(e:PlanEdits,door:DoorSpec):PlanEdits{opening(door);return commit(e,'Flip door swing',d=>{d.doors[door.id]={...door,swing:-(door.swing||1)};});}
export function addWindow(e:PlanEdits,window:WindowSpec,plan?:Plan):PlanEdits{opening(window);identity(window.roomId);if(plan)fitOpening(plan,window);return commit(e,'Add window',d=>{d.windows[window.id]=window;});}
export function removeWindow(e:PlanEdits,id:string):PlanEdits{identity(id);return commit(e,'Remove window',d=>{d.windows[id]=null;});}
export function moveWindow(e:PlanEdits,window:WindowSpec,x:number,z:number,axis=window.axis,outward=window.outward,plan?:Plan):PlanEdits{opening(window);if(axis!=='x'&&axis!=='z')throw Error('Choose a wall axis.');const next={...window,x:finite(x),z:finite(z),axis,outward};if(plan)fitOpening(plan,next);return commit(e,'Move window',d=>{d.windows[window.id]=next;});}
export function resizeWindow(e:PlanEdits,window:WindowSpec,width:number,plan?:Plan):PlanEdits{opening(window);const next={...window,width:positive(width)};if(plan)fitOpening(plan,next);return commit(e,'Resize window',d=>{d.windows[window.id]=next;});}
export function addObject(e:PlanEdits,value:EditorObject,plan?:Plan):PlanEdits{object(value);const r=plan?.rooms.find(v=>v.id===value.roomId);if(r)value=fitObject(value,r);return commit(e,'Add '+value.label,d=>{d.objects[value.id]=value;});}
export function removeObject(e:PlanEdits,id:string):PlanEdits{identity(id);return commit(e,'Remove object',d=>{d.objects[id]=null;});}
export function moveObject(e:PlanEdits,value:EditorObject,x:number,y:number,roomId=value.roomId,floor=value.floor,plan?:Plan):PlanEdits{object(value);level(floor);let next={...value,x:finite(x),y:finite(y),roomId,floor};if(plan&&value.kind!=='service'&&value.kind!=='external-stair'){const r=plan.rooms.find(v=>v.id===roomId&&v.floor===floor);if(!r)throw Error('Furniture must stay inside its room.');next=fitObject(next,r);}return commit(e,'Move '+value.label,d=>{d.objects[value.id]=next;});}
export function rotateObject(e:PlanEdits,value:EditorObject,angle:number,plan?:Plan):PlanEdits{object(value);let next={...value,angle:finite(angle)};if(plan){const r=plan.rooms.find(v=>v.id===value.roomId);if(r)next=fitObject(next,r);}return commit(e,'Rotate '+value.label,d=>{d.objects[value.id]=next;});}
export function setFloor(e:PlanEdits,plan:Plan,id:string,floor:number):PlanEdits{level(floor);if(floor>=(plan.levels||1))throw Error('Choose an existing floor.');return updateRoom(e,plan,id,'Move room to floor',r=>({...r,floor}));}
export function undo(e:PlanEdits):PlanEdits{const last=e.past.at(-1);return last?{...e,data:copy(last.before),past:e.past.slice(0,-1),future:[last,...e.future]}:e;}
export function redo(e:PlanEdits):PlanEdits{const next=e.future[0];return next?{...e,data:copy(next.after),past:[...e.past,next],future:e.future.slice(1)}:e;}
export const snap=(n:number)=>Math.round(n*4)/4;
