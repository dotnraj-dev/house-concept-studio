import {roomFitments} from './fitout-layout';
import {roomFitout,fitoutOf,windowDesignFor,windowOpenableFraction,type WindowDesign} from '../fitout';
import {livingFurniture,kitchenCounter} from './furniture';
import type {Direction,Plan,Room} from '../types';
import {pointInPolygon,pointSegmentDistance} from '../geometry';
import {doorBlocks,doorTargetAngle} from './doors';
import {FLOOR_HEIGHT,WALL_HEIGHT} from '../building-dimensions';
export {FLOOR_HEIGHT};
export type Axis='x'|'z';
export type WallPiece={id:string;floor:number;x:number;z:number;w:number;d:number;bottom:number;height:number;exterior:boolean;rooms?:string[]};
export type DoorSpec={id:string;floor:number;x:number;z:number;axis:Axis;width:number;main:boolean;balcony?:boolean;facing?:Direction;rooms?:string[];arch?:boolean;inner?:boolean;swing?:number};
export type WindowSpec={id:string;floor:number;x:number;z:number;axis:Axis;width:number;outward:[number,number];sill?:number;height?:number;openableFraction?:number;roomId:string;style?:WindowDesign};
export type HouseLayout={walls:WallPiece[];doors:DoorSpec[];windows:WindowSpec[]};
export type Interaction={id:string;label:string;action:'seat'|'window'|'door'|'shelf'|'tv'|'chimney'|'stairs'|'table';floor:number;x:number;y:number;z:number;size:[number,number,number];view?:[number,number,number];look?:[number,number,number]};
type Segment={axis:Axis;at:number;start:number;end:number;floor:number;owners:Room[];facing?:Direction};
const T=.28,H=WALL_HEIGHT,near=(a:number,b:number)=>Math.abs(a-b)<.035;
export function makeHouseLayout(plan:Plan):HouseLayout{
 const walls:WallPiece[]=[],doors:DoorSpec[]=[],windows:WindowSpec[]=[],segments:Segment[]=[];
 for(let f=0;f<(plan.levels||Math.max(1,...plan.rooms.map(r=>r.floor+1)));f++)for(const axis of ['x','z'] as Axis[]){
  const sides=plan.rooms.filter(r=>r.floor===f).flatMap(r=>axis==='x'?[{at:r.y,start:r.x,end:r.x+r.w,r},{at:r.y+r.h,start:r.x,end:r.x+r.w,r}]:[{at:r.x,start:r.y,end:r.y+r.h,r},{at:r.x+r.w,start:r.y,end:r.y+r.h,r}]);
  for(const at of [...new Set(sides.map(s=>Math.round(s.at*100)/100))]){const group=sides.filter(s=>near(s.at,at)),cuts=[...new Set(group.flatMap(s=>[s.start,s.end]))].sort((a,b)=>a-b);
   for(let i=0;i<cuts.length-1;i++){const start=cuts[i],end=cuts[i+1],mid=(start+end)/2,owners=group.filter(s=>mid>s.start-.01&&mid<s.end+.01).map(s=>s.r);if(!owners.length||end-start<.05)continue;
    let facing:Direction|undefined;if(axis==='x'&&near(at,0))facing='north';if(axis==='x'&&near(at,plan.depth))facing='south';if(axis==='z'&&near(at,0))facing='west';if(axis==='z'&&near(at,plan.width))facing='east';segments.push({axis,at,start,end,floor:f,owners,facing});
   }
  }
 }
 const ext=segments.filter(s=>s.floor===0&&s.facing&&!s.owners.some(r=>r.kind==='portico')),requested=plan.design?.twoDoors?plan.design.outerFacing:plan.mainDoorFacing||plan.roadSide;
 const score=(s:Segment)=>s.owners.some(r=>r.kind==='foyer')?100:s.owners.some(r=>r.kind==='passage')?80:s.owners.some(r=>r.kind==='living')?60:s.owners.some(r=>r.kind==='bedroom')?10:0;
 const entrance=ext.filter(s=>s.facing===requested&&s.end-s.start>=3.1).sort((a,b)=>score(b)-score(a))[0]||ext.filter(s=>s.end-s.start>=3.1).sort((a,b)=>score(b)-score(a))[0];
 const inner=segments.find(s=>{const foyer=s.owners.find(r=>r.kind==='foyer');if(!foyer||s.owners.length<2||s.end-s.start<3.1)return false;return plan.mainDoorFacing==='east'?s.axis==='z'&&near(foyer.x,s.at):plan.mainDoorFacing==='west'?s.axis==='z'&&near(foyer.x+foyer.w,s.at):plan.mainDoorFacing==='north'?s.axis==='x'&&near(foyer.y+foyer.h,s.at):s.axis==='x'&&near(foyer.y,s.at);});
 const openingAllowed=(s:Segment)=>{if(!plan.site)return true;const x=(s.axis==='x'?(s.start+s.end)/2:s.at)+plan.offsetX,y=(s.axis==='z'?(s.start+s.end)/2:s.at)+plan.offsetY;return Math.min(...plan.site.polygon.map((a,i)=>pointSegmentDistance({x,y},a,plan.site!.polygon[(i+1)%plan.site!.polygon.length])))>.35;};
 const add=(s:Segment,id:string,start:number,length:number,bottom=0,height=H)=>{if(length<.015)return;walls.push({id,floor:s.floor,x:s.axis==='x'?start:s.facing==='west'?s.at:s.facing==='east'?s.at-T:s.at-T/2,z:s.axis==='x'?(s.facing==='north'?s.at:s.facing==='south'?s.at-T:s.at-T/2):start,w:s.axis==='x'?length:T,d:s.axis==='x'?T:length,bottom,height,exterior:!!s.facing,rooms:s.owners.map(r=>r.id)});};
 for(const [i,s] of segments.entries()){
  const id=`edge-${s.floor}-${i}`,len=s.end-s.start,passage=s.owners.some(r=>['passage','foyer'].includes(r.kind)),stairs=s.owners.find(r=>r.kind==='stairs');
  const foyerBoundary=s.owners.length>1&&s.owners.some(r=>r.kind==='foyer')&&s.owners.some(r=>r.kind==='passage');
  const attached=s.owners.find(r=>r.attachedTo),related=attached&&s.owners.some(r=>r.id===attached.attachedTo);
  const forbiddenSuite=attached&&s.owners.length>1&&!related;
  if(forbiddenSuite){add(s,id,s.start,len);continue;}
  const openConnection=s.owners.length>1&&(s.owners.some(r=>r.kind==='kitchen')?(fitoutOf(plan.design).openKitchen&&s.owners.some(r=>r.kind==='dining')&&s.owners.every(r=>['kitchen','dining'].includes(r.kind))):s.owners.every(r=>['living','lounge','dining','passage'].includes(r.kind)))&&!s.owners.some(r=>r.attachedTo)&&s!==inner&&!foyerBoundary;
  const ensuiteDoor=!!attached&&!!related;
  if(s.owners.length>1&&s.owners.every(r=>['passage','foyer'].includes(r.kind))&&s!==inner&&!foyerBoundary&&!attached)continue;
  if(s.facing&&s.owners.every(r=>['portico','terrace'].includes(r.kind)))continue;
  if((s===entrance||s===inner||ensuiteDoor||openConnection||(s.owners.length>1&&passage&&!foyerBoundary))&&len>=3.05){
   const balcony=s.owners.some(r=>r.kind==='terrace'),width=Math.min(openConnection?len-.5:balcony?4.5:s===entrance?3.6:2.9,len-.3);let center=(s.start+s.end)/2;if(stairs){const direction=plan.design?.twoDoors?plan.design.outerFacing:plan.design?.houseFacing||'north',landingX=direction==='east'?stairs.x+stairs.w-2:direction==='west'?stairs.x+2:stairs.x+stairs.w/2,landingZ=direction==='north'?stairs.y+2:direction==='south'?stairs.y+stairs.h-2:stairs.y+stairs.h/2;center=Math.max(s.start+width/2+.15,Math.min(s.end-width/2-.15,s.axis==='x'?landingX:landingZ));}
   const target=s.owners.find(r=>!['passage','foyer'].includes(r.kind))||s.owners[0],swing=s.axis==='z'?(target.x+target.w/2<s.at?-1:1):(target.y+target.h/2>s.at?-1:1);
   if(ensuiteDoor&&s.owners.some(r=>r.kind==='bathroom'))center=s.start+width/2+.2;
   const left=center-width/2,right=center+width/2;add(s,id+'a',s.start,left-s.start);add(s,id+'b',right,s.end-right);add(s,id+'lintel',left,width,7,H-7);
   doors.push({id:'door-'+id,floor:s.floor,x:s.axis==='x'?left:s.at,z:s.axis==='x'?s.at:left,axis:s.axis,width,swing,balcony,main:s===entrance,inner:s===inner,facing:s===inner?plan.mainDoorFacing:s.facing,rooms:s.owners.map(r=>r.id),arch:(ensuiteDoor&&s.owners.every(r=>r.kind!=='bathroom'))||openConnection||(fitoutOf(plan.design).openKitchen&&passage&&s.owners.some(r=>r.kind==='kitchen'))||(!balcony&&!!stairs)||(!balcony&&!s.facing&&s!==inner&&s.owners.some(r=>['living','lounge','dining','portico'].includes(r.kind)))});continue;
  }
  const owner=s.owners[0];if(s.facing&&openingAllowed(s)&&len>=5&&!['stairs','passage','foyer'].includes(owner.kind)){
   const wet=owner.kind==='bathroom',sill=wet?5.8:owner.kind==='kitchen'?3.35:2.1,height=wet?1.5:owner.kind==='kitchen'?4:5.4,style=windowDesignFor(plan,owner),openableFraction=windowOpenableFraction(style),count=segments.filter(v=>v.floor===s.floor&&v.facing&&openingAllowed(v)&&v.owners[0]?.id===owner.id&&v.end-v.start>=5&&v!==entrance).length||1,need=(wet?.3/(.3048*.3048):owner.w*owner.h/8*(owner.kind==='kitchen'?1.25:1))/count/openableFraction/height,width=Math.min(wet?4:16,len-.8,Math.max(wet?2.2:4,need)),left=(s.start+s.end-width)/2,right=left+width;add(s,id+'a',s.start,left-s.start);add(s,id+'b',right,s.end-right);add(s,id+'sill',left,width,0,sill);add(s,id+'head',left,width,sill+height,H-sill-height);
   const outward:[number,number]=s.facing==='west'?[-1,0]:s.facing==='east'?[1,0]:s.facing==='north'?[0,-1]:[0,1];windows.push({id:'window-'+id,floor:s.floor,x:s.axis==='x'?left:s.at,z:s.axis==='x'?s.at:left,axis:s.axis,width,outward,sill,height,openableFraction,style,roomId:owner.id});
  }else add(s,id,s.start,len);
 }
 return {walls,doors,windows};
}
export function collidesAt(plan:Plan,layout:HouseLayout,x:number,z:number,floor:number,openDoors:Set<string>,radius=.3,doorAngles?:ReadonlyMap<string,number>){
 if(floor>0&&(x<radius||x>plan.width-radius||z<radius||z>plan.depth-radius))return true;
 if(floor===0&&plan.site&&!pointInPolygon({x:x+plan.offsetX,y:z+plan.offsetY},plan.site.polygon))return true;
 for(const w of layout.walls)if(w.floor===floor&&w.bottom<6&&x+radius>w.x&&x-radius<w.x+w.w&&z+radius>w.z&&z-radius<w.z+w.d)return true;
 for(const d of layout.doors)if(d.floor===floor&&!d.arch&&doorBlocks(d,doorAngles?.get(d.id)??doorTargetAngle(d,openDoors.has(d.id)),x,z,radius))return true;
 for(const n of plan.design?.services||[])if(n.type==='tank'&&n.level===floor&&Math.hypot(x-(n.x-plan.offsetX),z-(n.y-plan.offsetY))<1.15+radius)return true;
 return false;
}
export const worldX=(plan:Plan,x:number)=>x-plan.width/2;
export const worldZ=(plan:Plan,z:number)=>z-plan.depth/2;
export const shelfSpot=(r:Room):[number,number]=>[r.x+1.05,r.kind==='kitchen'?r.y+r.h-3.15:r.y+r.h-1.4];
const furnishingLayouts=new WeakMap<Plan,HouseLayout>();
export function furnishingFrame(plan:Plan,room:Room){
 const request=plan.design?.roomRequests.find(q=>q.id===room.id)||plan.design?.roomRequests.find(q=>q.kind===room.kind&&q.floor===room.floor),target=room.kind==='living'?'sofa':room.kind;
 const rule=plan.design?.vastuMode!=='none'?plan.design?.vastuRules.find(v=>v.target===room.id||v.target===target||(room.kind==='pooja'&&['pooja-deity','pooja-worshipper'].includes(v.target))||(room.kind==='kitchen'&&v.target==='cooking')):undefined;
 const opposite={north:'south',south:'north',east:'west',west:'east'} as const;
 const ruleFacing=rule?.facing&&rule.facing!=='any'?(rule.target==='pooja-worshipper'?opposite[rule.facing]:rule.facing):'north';
 const lockedFacing=request?.facing&&request.facing!=='any'||rule?.facing&&rule.facing!=='any';
 let feature:{facing:Direction;x:number;z:number;score:number;length:number}|undefined;
 if(!lockedFacing&&['living','lounge','bedroom'].includes(room.kind)){
 let layout=furnishingLayouts.get(plan);if(!layout){layout=makeHouseLayout(plan);furnishingLayouts.set(plan,layout);}
 for(const wall of layout.walls.filter(w=>w.floor===room.floor&&w.rooms?.includes(room.id)&&w.bottom<.2&&w.height>5.3)){
 const along=wall.w>wall.d,len=along?wall.w:wall.d;if(len<(room.kind==='bedroom'?5.8:3.8))continue;
 const x=wall.x+wall.w/2,z=wall.z+wall.d/2;
 const f:Direction=along?(Math.abs(z-room.y)<.3?'north':'south'):(Math.abs(x-room.x)<.3?'west':'east'),score=len-(wall.exterior?1:0);
 if(!feature||score>feature.score)feature={facing:f,x,z,score,length:len};
 }}
 const facing=room.kind==='stairs'?(plan.design?.twoDoors?plan.design.outerFacing:plan.design?.houseFacing||'north'):request?.facing&&request.facing!=='any'?request.facing:lockedFacing?ruleFacing:feature?.facing||ruleFacing,angle={north:0,east:-Math.PI/2,south:Math.PI,west:Math.PI/2}[facing]+(room.kind==='kitchen'?Math.PI:0);
 const swap=facing==='east'||facing==='west',w=swap?room.h:room.w,h=swap?room.w:room.h,local={...room,x:-w/2,y:-h/2,w,h,featureWidth:feature?.length,featureX:feature?Math.cos(angle)*(feature.x-room.x-room.w/2)-Math.sin(angle)*(feature.z-room.y-room.h/2):undefined};
 const transform=(x:number,z:number):[number,number]=>[room.x+room.w/2+Math.cos(angle)*x+Math.sin(angle)*z,room.y+room.h/2-Math.sin(angle)*x+Math.cos(angle)*z];return {facing,angle,local,transform};
}
export function makeInteractions(plan:Plan,layout:HouseLayout):Interaction[]{
 const items:Interaction[]=[];
 for(const d of layout.doors)if(!d.arch)items.push({id:d.id,label:d.main?'Open entrance door':'Open room door',action:'door',floor:d.floor,x:d.x+(d.axis==='x'?d.width/2:0),y:3.4,z:d.z+(d.axis==='z'?d.width/2:0),size:d.axis==='x'?[d.width,6.8,.5]:[.5,6.8,d.width]});
 for(const w of layout.windows){const x=w.x+(w.axis==='x'?w.width/2:0),z=w.z+(w.axis==='z'?w.width/2:0);const y=(w.sill??3)+(w.height??3.4)/2;items.push({id:w.id,label:'Look through the window',action:'window',floor:w.floor,x,y,z,size:w.axis==='x'?[w.width,w.height||3.5,.5]:[.5,w.height||3.5,w.width],view:[x-w.outward[0]*2,5.2,z-w.outward[1]*2],look:[x+w.outward[0]*10,y,z+w.outward[1]*10]});}
 for(const room of plan.rooms){const frame=furnishingFrame(plan,room),r=frame.local,cx=r.x+r.w/2,cz=r.y+r.h/2;
  const push=(item:Omit<Interaction,'floor'>)=>{const [x,z]=frame.transform(item.x,item.z),convert=(p:[number,number,number]):[number,number,number]=>{const [a,b]=frame.transform(p[0],p[2]);return [a,p[1],b];};items.push({...item,floor:room.floor,x,z,size:Math.abs(Math.sin(frame.angle))>.5?[item.size[2],item.size[1],item.size[0]]:item.size,view:item.view?convert(item.view):undefined,look:item.look?convert(item.look):undefined});};
  const furnished=plan.design?.furnished!==false;
  if(r.kind==='stairs')push({id:'stairs-'+r.id,label:room.floor===(plan.levels||1)-1?'Go down one floor':'Go up one floor',action:'stairs',x:cx,y:1.5,z:r.y+2,size:[Math.min(3,r.w-1),2,2]});
  if(furnished&&['living','lounge'].includes(r.kind)){const {sofa,tv}=livingFurniture(r),x=sofa.x,z=sofa.z;push({id:'sofa-'+r.id,label:'Sit on the sofa',action:'seat',x,y:1.2,z,size:[Math.min(6.3,r.w*.6),2.7,2.9],view:[x,2.9,z-.25],look:[tv.x,3.8,tv.z]});push({id:'tv-'+r.id,label:'Switch TV on / off',action:'tv',x:tv.x,y:4.1,z:tv.z,size:[3.5,2.2,.5]});}

  if(r.kind==='kitchen')push({id:'shelf-'+r.id,label:'Open kitchen storage',action:'shelf',x:kitchenCounter(r).x,y:1.5,z:r.y+r.h-1.75,size:[kitchenCounter(r).w,2.8,.6]});
  if(r.kind==='kitchen')push({id:'chimney-'+r.id,label:'Switch chimney on / off',action:'chimney',x:kitchenCounter(r).hobX,y:5.8,z:r.y+r.h-1,size:[2.4,2.4,1.5]});
  if(furnished&&r.kind==='dining')push({id:'table-'+r.id,label:'Sit at the dining table',action:'table',x:cx,y:1.4,z:cz,size:[4.5,2.8,3.2],view:[cx,3.1,cz+3],look:[cx,3,cz]});
  for(const fit of roomFitments(plan,room,layout))if(['fridge','wardrobe','loft','prayer','upper','sideboard','ac'].includes(fit.kind))items.push({id:fit.id,label:fit.kind==='ac'?'Switch AC on / off':'Open / close '+fit.kind,action:'shelf',floor:room.floor,x:fit.x,y:fit.bottom+fit.height/2,z:fit.z,size:[fit.w+.12,fit.height,fit.d+.15]});
  if(!['bathroom','terrace','portico','stairs','passage','foyer'].includes(r.kind)&&roomFitout(plan,room).fan)items.push({id:'fan-'+room.id,label:'Switch ceiling fan on / off',action:'shelf',floor:room.floor,x:room.x+room.w/2,y:8.5,z:room.y+room.h/2,size:[3.8,.7,3.8]});
 }return items;
}
export function entrancePose(plan:Plan,layout:HouseLayout){const d=layout.doors.find(d=>d.main),f=d?.facing||'north',n:[number,number]=f==='north'?[0,-1]:f==='south'?[0,1]:f==='east'?[1,0]:[-1,0],x=d?d.x+(d.axis==='x'?d.width/2:0):plan.width/2,z=d?d.z+(d.axis==='z'?d.width/2:0):0;return {x,z,n};}
