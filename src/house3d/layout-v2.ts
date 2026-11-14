import type {Direction,Plan,Room} from '../types';
import {pointInPolygon} from '../geometry';
import {doorBlocks,doorTargetAngle} from './doors';
export const FLOOR_HEIGHT=9;
export type Axis='x'|'z';
export type WallPiece={id:string;floor:number;x:number;z:number;w:number;d:number;bottom:number;height:number;exterior:boolean};
export type DoorSpec={id:string;floor:number;x:number;z:number;axis:Axis;width:number;main:boolean;balcony?:boolean;facing?:Direction;rooms?:string[];arch?:boolean;inner?:boolean;swing?:number};
export type WindowSpec={id:string;floor:number;x:number;z:number;axis:Axis;width:number;outward:[number,number];roomId:string};
export type HouseLayout={walls:WallPiece[];doors:DoorSpec[];windows:WindowSpec[]};
export type Interaction={id:string;label:string;action:'seat'|'window'|'door'|'shelf'|'tv'|'chimney'|'stairs'|'table';floor:number;x:number;y:number;z:number;size:[number,number,number];view?:[number,number,number];look?:[number,number,number]};
type Segment={axis:Axis;at:number;start:number;end:number;floor:number;owners:Room[];facing?:Direction};
const T=.28,H=8.5,near=(a:number,b:number)=>Math.abs(a-b)<.035;
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
 const add=(s:Segment,id:string,start:number,length:number,bottom=0,height=H)=>{if(length<.015)return;walls.push({id,floor:s.floor,x:s.axis==='x'?start:s.facing==='west'?s.at:s.facing==='east'?s.at-T:s.at-T/2,z:s.axis==='x'?(s.facing==='north'?s.at:s.facing==='south'?s.at-T:s.at-T/2):start,w:s.axis==='x'?length:T,d:s.axis==='x'?T:length,bottom,height,exterior:!!s.facing});};
 for(const [i,s] of segments.entries()){
  const id=`edge-${s.floor}-${i}`,len=s.end-s.start,passage=s.owners.some(r=>['passage','foyer'].includes(r.kind)),stairs=s.owners.find(r=>r.kind==='stairs');
  const foyerBoundary=s.owners.length>1&&s.owners.some(r=>r.kind==='foyer')&&s.owners.some(r=>r.kind==='passage');
  if(s.owners.length>1&&s.owners.every(r=>['passage','foyer'].includes(r.kind))&&s!==inner&&!foyerBoundary)continue;
  if(s.facing&&s.owners.every(r=>['portico','terrace'].includes(r.kind)))continue;
  if((s===entrance||s===inner||(s.owners.length>1&&passage&&!foyerBoundary))&&len>=3.05){
   const width=Math.min(s===entrance?3.3:2.9,len-.3);let center=(s.start+s.end)/2;if(stairs){const direction=plan.design?.twoDoors?plan.design.outerFacing:plan.design?.houseFacing||'north',landingX=direction==='east'?stairs.x+stairs.w-2:direction==='west'?stairs.x+2:stairs.x+stairs.w/2,landingZ=direction==='north'?stairs.y+2:direction==='south'?stairs.y+stairs.h-2:stairs.y+stairs.h/2;center=Math.max(s.start+width/2+.15,Math.min(s.end-width/2-.15,s.axis==='x'?landingX:landingZ));}
   const target=s.owners.find(r=>!['passage','foyer'].includes(r.kind))||s.owners[0],swing=s.axis==='z'?(target.x+target.w/2<s.at?-1:1):(target.y+target.h/2>s.at?-1:1);
   const left=center-width/2,right=center+width/2;add(s,id+'a',s.start,left-s.start);add(s,id+'b',right,s.end-right);add(s,id+'lintel',left,width,7,H-7);
   doors.push({id:'door-'+id,floor:s.floor,x:s.axis==='x'?left:s.at,z:s.axis==='x'?s.at:left,axis:s.axis,width,swing,main:s===entrance,inner:s===inner,facing:s===inner?plan.mainDoorFacing:s.facing,rooms:s.owners.map(r=>r.id),arch:!!stairs||(!s.facing&&s!==inner&&s.owners.some(r=>['living','lounge','dining','portico','terrace'].includes(r.kind)))});continue;
  }
  const owner=s.owners[0];if(s.facing&&len>=5&&!['stairs','passage','foyer'].includes(owner.kind)){
   const width=Math.min(4.5,len*.45),left=(s.start+s.end-width)/2,right=left+width;add(s,id+'a',s.start,left-s.start);add(s,id+'b',right,s.end-right);add(s,id+'sill',left,width,0,3);add(s,id+'head',left,width,6.4,H-6.4);
   const outward:[number,number]=s.facing==='west'?[-1,0]:s.facing==='east'?[1,0]:s.facing==='north'?[0,-1]:[0,1];windows.push({id:'window-'+id,floor:s.floor,x:s.axis==='x'?left:s.at,z:s.axis==='x'?s.at:left,axis:s.axis,width,outward,roomId:owner.id});
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
export const shelfSpot=(r:Room):[number,number]=>[r.x+1.05,r.y+r.h-1.4];
export function furnishingFrame(plan:Plan,room:Room){
 const request=plan.design?.roomRequests.find(q=>q.id===room.id)||plan.design?.roomRequests.find(q=>q.kind===room.kind&&q.floor===room.floor),target=room.kind==='living'?'sofa':room.kind;
 const rule=plan.design?.vastuMode!=='none'?plan.design?.vastuRules.find(v=>v.target===room.id||v.target===target||(room.kind==='pooja'&&['pooja-deity','pooja-worshipper'].includes(v.target))||(room.kind==='kitchen'&&v.target==='cooking')):undefined;
 const opposite={north:'south',south:'north',east:'west',west:'east'} as const;
 const ruleFacing=rule?.facing&&rule.facing!=='any'?(rule.target==='pooja-worshipper'?opposite[rule.facing]:rule.facing):'north';
 const facing=room.kind==='stairs'?(plan.design?.twoDoors?plan.design.outerFacing:plan.design?.houseFacing||'north'):request?.facing&&request.facing!=='any'?request.facing:ruleFacing,angle={north:0,east:-Math.PI/2,south:Math.PI,west:Math.PI/2}[facing]+(room.kind==='kitchen'?Math.PI:0);
 const swap=facing==='east'||facing==='west',w=swap?room.h:room.w,h=swap?room.w:room.h,local={...room,x:-w/2,y:-h/2,w,h};
 const transform=(x:number,z:number):[number,number]=>[room.x+room.w/2+Math.cos(angle)*x+Math.sin(angle)*z,room.y+room.h/2-Math.sin(angle)*x+Math.cos(angle)*z];return {facing,angle,local,transform};
}
export function makeInteractions(plan:Plan,layout:HouseLayout):Interaction[]{
 const items:Interaction[]=[];
 for(const d of layout.doors)if(!d.arch)items.push({id:d.id,label:d.main?'Open entrance door':'Open room door',action:'door',floor:d.floor,x:d.x+(d.axis==='x'?d.width/2:0),y:3.4,z:d.z+(d.axis==='z'?d.width/2:0),size:d.axis==='x'?[d.width,6.8,.5]:[.5,6.8,d.width]});
 for(const w of layout.windows){const x=w.x+(w.axis==='x'?w.width/2:0),z=w.z+(w.axis==='z'?w.width/2:0);items.push({id:w.id,label:'Look through the window',action:'window',floor:w.floor,x,y:4.6,z,size:w.axis==='x'?[w.width,3.5,.5]:[.5,3.5,w.width],view:[x-w.outward[0]*2,5.2,z-w.outward[1]*2],look:[x+w.outward[0]*10,5.2,z+w.outward[1]*10]});}
 for(const room of plan.rooms){const frame=furnishingFrame(plan,room),r=frame.local,cx=r.x+r.w/2,cz=r.y+r.h/2;
  const push=(item:Omit<Interaction,'floor'>)=>{const [x,z]=frame.transform(item.x,item.z),convert=(p:[number,number,number]):[number,number,number]=>{const [a,b]=frame.transform(p[0],p[2]);return [a,p[1],b];};items.push({...item,floor:room.floor,x,z,size:Math.abs(Math.sin(frame.angle))>.5?[item.size[2],item.size[1],item.size[0]]:item.size,view:item.view?convert(item.view):undefined,look:item.look?convert(item.look):undefined});};
  const furnished=plan.design?.furnished!==false;
  if(r.kind==='stairs')push({id:'stairs-'+r.id,label:room.floor===(plan.levels||1)-1?'Go down one floor':'Go up one floor',action:'stairs',x:cx,y:1.5,z:r.y+2,size:[Math.min(3,r.w-1),2,2]});
  if(furnished&&['living','lounge'].includes(r.kind)){const x=r.x+r.w*.55,z=r.y+r.h*.67;push({id:'sofa-'+r.id,label:'Sit on the sofa',action:'seat',x,y:1.2,z,size:[Math.min(6.3,r.w*.6),2.7,2.9],view:[x,2.9,z-.25],look:[x,3.8,r.y+.8]});push({id:'tv-'+r.id,label:'Switch TV on / off',action:'tv',x,y:4.1,z:r.y+.62,size:[3.5,2.2,.5]});}
  if((furnished&&['living','lounge','bedroom'].includes(r.kind))||r.kind==='kitchen'){const [x,z]=shelfSpot(r);push({id:'shelf-'+r.id,label:'Open cabinet',action:'shelf',x,y:2.4,z,size:[1.3,4.7,1.8]});}
  if(r.kind==='kitchen')push({id:'chimney-'+r.id,label:'Switch chimney on / off',action:'chimney',x:cx+1,y:5,z:r.y+r.h-1,size:[2.4,2.4,1.5]});
  if(furnished&&r.kind==='dining')push({id:'table-'+r.id,label:'Sit at the dining table',action:'table',x:cx,y:1.4,z:cz,size:[4.5,2.8,3.2],view:[cx,3.1,cz+3],look:[cx,3,cz]});
 }return items;
}
export function entrancePose(plan:Plan,layout:HouseLayout){const d=layout.doors.find(d=>d.main),f=d?.facing||'north',n:[number,number]=f==='north'?[0,-1]:f==='south'?[0,1]:f==='east'?[1,0]:[-1,0],x=d?d.x+(d.axis==='x'?d.width/2:0):plan.width/2,z=d?d.z+(d.axis==='z'?d.width/2:0):0;return {x,z,n};}
