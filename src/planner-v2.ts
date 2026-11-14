import {makeHouseLayout,furnishingFrame} from './house3d/layout';
import {serviceLayout} from './services';
import { analyseSite, rounded } from './geometry';
import { designOf, type DesignCheck, type Plan, type Ratios, type Requirements, type Room, type RoomKind, type Settings, type Zone } from './types';
const MIN:Partial<Record<RoomKind,[number,number]>>={living:[10,11],lounge:[9,9],bedroom:[9,10],kitchen:[8,8],dining:[7,8],bathroom:[4,6],pooja:[3,4],utility:[4,5],portico:[8,14],stairs:[7,14]};
const floorId=(f:number,side:number)=>f+'-'+side+'-flexible';
const AREA:Partial<Record<RoomKind,number>>={living:190,lounge:130,bedroom:145,kitchen:110,dining:100,bathroom:40,pooja:22,utility:35,portico:135};
export function zoneMatches(zone:Zone,x:number,y:number,w:number,h:number){
 const nx=x/w,ny=y/h;if(zone==='any')return true;if(zone==='centre')return nx>=.3&&nx<=.7&&ny>=.3&&ny<=.7;
 return (!zone.includes('north')||ny<=.45)&&(!zone.includes('south')||ny>=.55)&&(!zone.includes('east')||nx>=.55)&&(!zone.includes('west')||nx<=.45);
}
export function generatePlan(req:Requirements,settings:Settings,variant:number,ratios:Ratios):Plan{
 const original=designOf(req),site=analyseSite(req,settings),actual=site.footprint;
 const turn={north:0,east:1,south:2,west:3}[original.twoDoors?original.outerFacing:original.houseFacing];
 const order=['north','north-east','east','south-east','south','south-west','west','north-west'];
 const localZone=(z:Zone):Zone=>order.includes(z)?order[(order.indexOf(z)-turn*2+8)%8] as Zone:z;
 let d={...original,vastuRules:original.vastuRules.map(v=>({...v,zone:localZone(v.zone)})),roomRequests:original.roomRequests.map(q=>({...q,zone:localZone(q.zone),w:turn%2?q.h:q.w,h:turn%2?q.w:q.h}))};
 let fp={...actual,w:turn%2?actual.h:actual.w,h:turn%2?actual.w:actual.h};
 const levels=Math.max(1,Math.min(100,Math.floor(req.floors||1))),rooms:Room[]=[],checks:DesignCheck[]=[];
 if(req.bedrooms+req.bathrooms+d.levels.reduce((s,l)=>s+l.bedrooms+l.bathrooms,0)>1000)return {rooms:[],valid:false,width:actual.w,depth:actual.h,plotWidth:req.plotWidth,plotDepth:req.plotDepth,offsetX:actual.x,offsetY:actual.y,roadSide:req.roadSide,toiletStyle:req.toiletStyle,pooja:req.pooja,variantName:'Concept',site,design:original,levels,checks:[],warnings:['This brief exceeds the interactive scene limit. Split large buildings into separate projects.']};
 const warnings=[...site.issues],plotWidth=site.polygon.length?Math.max(...site.polygon.map(p=>p.x)):req.plotWidth,plotDepth=site.polygon.length?Math.max(...site.polygon.map(p=>p.y)):req.plotDepth;
 const base={rooms,width:Math.max(1,actual.w),depth:Math.max(1,actual.h),plotWidth,plotDepth,offsetX:fp.x,offsetY:fp.y,roadSide:req.roadSide,toiletStyle:req.toiletStyle,pooja:req.pooja,variantName:['Balanced home','Open living','Private rooms'][variant]||'Balanced home',site,design:original,checks,levels,mainDoorFacing:d.mainDoorFacing};
 if(fp.w<16||fp.h<20)return {...base,valid:false,warnings};
 const add=(r:Room)=>rooms.push({...r,x:rounded(r.x),y:rounded(r.y),w:rounded(r.w),h:rounded(r.h)});
 const rules=d.vastuMode==='none'?[]:d.vastuRules;
 const stairWest=rules.some(r=>r.target==='stairs'&&r.zone.includes('west'))||rules.some(r=>r.target==='kitchen'&&r.zone==='south-east')||variant===2;
 const corridor=4,split=Math.max(.38,Math.min(.62,ratios.livingShare+(variant===1?.04:0)));
 let leftW=(fp.w-corridor)*split,rightW=fp.w-corridor-leftW;
 const exactWidth=d.roomRequests.find(r=>r.mode==='exact'&&r.w>0&&r.w<fp.w-corridor-7);
 if(exactWidth){if(exactWidth.zone.includes('east')||exactWidth.kind==='portico'){rightW=exactWidth.w;leftW=fp.w-corridor-rightW;}else{leftW=exactWidth.w;rightW=fp.w-corridor-leftW;}}
 const corridorX=leftW,rightX=leftW+corridor,stairD=Math.min(16,fp.h*.43);
 let bedIndex=0;
 const requestFor=(r:Room)=>d.roomRequests.find(q=>q.id===r.id);
 for(let f=0;f<levels;f++){
  const custom=d.levels.find(l=>l.floor===f),beds=custom?custom.bedrooms:Math.floor(req.bedrooms/levels)+(f<req.bedrooms%levels?1:0),baths=custom?custom.bathrooms:Math.floor(req.bathrooms/levels)+(f<req.bathrooms%levels?1:0);
  const foyerDepth=f===0&&d.twoDoors?5:0;
  if(foyerDepth)add({id:'0-foyer',kind:'foyer',label:'Entrance foyer',floor:f,x:corridorX,y:0,w:corridor,h:foyerDepth});
  add({id:`${f}-passage`,kind:'passage',label:'Clear passage',floor:f,x:corridorX,y:foyerDepth,w:corridor,h:fp.h-foyerDepth});
  if(levels>1)add({id:`${f}-stairs`,kind:'stairs',label:f===levels-1?'Stair landing':'Stairs',floor:f,x:stairWest?0:rightX,y:fp.h-stairD,w:stairWest?leftW:rightW,h:stairD});
  const items:Room[]=[];const put=(kind:RoomKind,label:string,index=0)=>items.push({id:`${f}-${kind}-${index}`,kind,label,floor:f,x:0,y:0,w:0,h:0});
  if(f===0||custom?.living||(!custom&&f>0))put(f===0?'living':'lounge',f===0?'Living room':'Family lounge');
  if(f===0||custom?.kitchen){put('kitchen',custom?.rental?'Rental kitchen':'Kitchen');put('dining','Dining');}
  for(let n=0;n<beds;n++)put('bedroom',f===0&&n===0&&req.elderlyBedroom?'Parents bedroom':`Bedroom ${++bedIndex}`,n);
  for(let n=0;n<baths;n++)put('bathroom',`Bathroom ${n+1}`,n);
  if(f===0&&req.pooja)put('pooja','Pooja room');if(f===0&&req.utility)put('utility','Utility');if(f===0&&req.parking)put('portico','Car portico');
  for(const q of d.roomRequests.filter(q=>q.floor===f))if(!items.some(r=>r.id===q.id||r.kind===q.kind))put(q.kind,q.label||q.kind);
  if(!items.length)put('terrace','Open terrace');
  const suiteFor=new Map<string,Room>();
  if(d.bathroomAccess!=='common'&&Math.max(leftW,rightW)>=14.5){
   const bedrooms=items.filter(r=>r.kind==='bedroom'&&!requestFor(r)),bathrooms=items.filter(r=>r.kind==='bathroom'&&!requestFor(r)&&!rules.some(v=>(v.target===r.id||v.target==='bathroom')&&v.zone!=='any'));
   const count=Math.min(bedrooms.length,Math.max(0,bathrooms.length-(d.bathroomAccess==='mixed'&&f===0?1:0)));
   for(let i=0;i<count;i++){const bath=bathrooms[i];suiteFor.set(bedrooms[i].id,bath);items.splice(items.indexOf(bath),1);}
  }
  const weights=(r:Room)=>{const q=requestFor(r),t=req.requestedSizes[r.kind as keyof Requirements['requestedSizes']];return q&&q.w>0&&q.h>0?q.w*q.h:t?.w&&t?.h?t.w*t.h:((AREA[r.kind]||80)+(suiteFor.has(r.id)?80:0))*(r.kind==='living'&&req.livingPriority==='spacious'?1.3:r.kind==='kitchen'&&req.kitchenPriority==='spacious'?1.25:1);};
  const ruleFor=(r:Room)=>rules.find(v=>v.target===r.id||v.target===r.kind||(r.kind==='pooja'&&v.target.startsWith('pooja-'))||(r.kind==='kitchen'&&v.target==='cooking'));
  const west:Room[]=[],east:Room[]=[],capacity=[leftW*(fp.h-(levels>1&&stairWest?stairD:0)),rightW*(fp.h-(levels>1&&!stairWest?stairD:0))];
  for(const item of [...items].sort((a,b)=>weights(b)-weights(a))){
   const q=requestFor(item),zone=q?.zone&&q.zone!=='any'?q.zone:ruleFor(item)?.zone||'any';
   let side=zone.includes('west')?0:zone.includes('east')?1:item.kind==='portico'?1:item.kind==='living'?0:-1;
   if(side<0)side=west.reduce((s,r)=>s+weights(r),0)/capacity[0]<=east.reduce((s,r)=>s+weights(r),0)/capacity[1]?0:1;
   if(suiteFor.has(item.id)&&(side?rightW:leftW)<14.5)side=leftW>=14.5?0:1;
   (side?east:west).push(item);
  }
  const minDepth=(r:Room)=>requestFor(r)?.mode==='exact'?requestFor(r)!.h:suiteFor.has(r.id)?11.5:MIN[r.kind]?.[1]||4;
  for(let attempt=0;attempt<items.length;attempt++){
   const groups=[west,east],caps=[fp.h-(levels>1&&stairWest?stairD:0),fp.h-(levels>1&&!stairWest?stairD:0)],totals=groups.map(g=>g.reduce((s,r)=>s+minDepth(r),0));
   const side=totals[0]>caps[0]+.01?0:totals[1]>caps[1]+.01?1:-1;if(side<0)break;
   const other=1-side,candidate=groups[side].filter(r=>!['living','portico'].includes(r.kind)&&!(requestFor(r)?.zone||ruleFor(r)?.zone||'any').includes(side?'east':'west')).sort((a,b)=>minDepth(a)-minDepth(b)).find(r=>totals[other]+minDepth(r)<=caps[other]&&(!suiteFor.has(r.id)||(other?rightW:leftW)>=14.5));
   if(!candidate)break;groups[side].splice(groups[side].indexOf(candidate),1);groups[other].push(candidate);
  }
  [west,east].forEach((group,side)=>{
   const x=side?rightX:0,w=side?rightW:leftW,h=fp.h-(levels>1&&(side===0?stairWest:!stairWest)?stairD:0);
   const order=(r:Room)=>{const q=requestFor(r),z=q?.zone&&q.zone!=='any'?q.zone:ruleFor(r)?.zone||'any';return z.includes('north')?-4:z.includes('south')?4:r.kind==='living'||r.kind==='lounge'||r.kind==='portico'?-3:r.kind==='bedroom'?2:0;};
   group.sort((a,b)=>order(a)-order(b)||(variant===2?b.kind.localeCompare(a.kind):a.kind.localeCompare(b.kind)));
   const minimum=group.filter(r=>requestFor(r)?.mode!=='exact').reduce((s,r)=>s+minDepth(r),0);
   const fixed=group.reduce((s,r)=>{const q=requestFor(r);return s+(q?.mode==='exact'?q.h:0);},0),flex=group.filter(r=>requestFor(r)?.mode!=='exact'),weight=flex.reduce((s,r)=>s+weights(r),0),tooLarge=fixed+minimum>h+.01;
   if(tooLarge)checks.push({id:`sizes-${f}-${side}`,title:'Rooms do not fit comfortably',detail:`Floor ${f}: minimum room depths and locked sizes exceed the available wing. Reduce this floor programme or revise the plot.`,status:'conflict'});
   let y=0;
   group.forEach((item,index)=>{
    const q=requestFor(item),length=tooLarge?h*weights(item)/Math.max(1,group.reduce((s,r)=>s+weights(r),0)):q?.mode==='exact'?q.h:minDepth(item)+Math.max(0,h-fixed-minimum)*weights(item)/Math.max(1,weight);
    const rh=q?.mode==='exact'&&!tooLarge?Math.min(length,h-y):index===group.length-1?Math.max(.1,h-y):Math.min(length,h-y),rw=q?.mode==='exact'?Math.min(w,q.w||w):w,rx=side?x+w-rw:x;
    const bath=suiteFor.get(item.id);
    if(bath&&rw>=14.5&&rh>=11.4){
     const bw=Math.min(6.1,rw-9),bh=Math.min(7.8,rh-3.4),bx=side?rx+rw-bw:rx,bedX=side?rx:rx+bw;
     add({...item,label:q?.label||item.label,x:bedX,y,w:rw-bw,h:rh});
     add({...bath,label:'Attached bath · '+item.label,attachedTo:item.id,x:bx,y:y+rh-bh,w:bw,h:bh});
     add({id:item.id+'-dressing',attachedTo:item.id,kind:'passage',label:'Dressing',floor:f,x:bx,y,w:bw,h:rh-bh});
    }else if(bath){add({...item,x:rx,y,w:rw,h:Math.max(.1,rh-6)});add({...bath,attachedTo:item.id,label:'Attached bath · '+item.label,x:rx,y:y+Math.max(.1,rh-6),w:rw,h:Math.min(6,rh-.1)});checks.push({id:'suite-'+item.id,title:'Bedroom suite needs more space',detail:'Increase the footprint or reduce the floor programme.',status:'conflict'});}
    else add({...item,label:q?.label||item.label,x:rx,y,w:rw,h:rh});
    if(rw<w-.05)add({id:`${item.id}-clearance`,kind:'passage',label:'Clearance',floor:f,x:side?x:rx+rw,y,w:w-rw,h:rh});y+=rh;
    const min=MIN[item.kind];if(min&&(rw+.05<min[0]||rh+.05<min[1]))checks.push({id:`comfort-${item.id}`,title:`${item.label} needs more space`,detail:`${rounded(rw)} × ${rounded(rh)} ft falls below the concept comfort target of ${min[0]} × ${min[1]} ft.`,status:'warning',target:item.id});
   });
   if(y<h-.05)add({id:floorId(f,side),kind:'passage',label:'Flexible space',floor:f,x,y,w,h:h-y});
  });
 }
 for(let f=1;f<levels;f++){
  const lounge=rooms.find(r=>r.floor===f&&r.kind==='lounge'&&r.y<.05&&r.h>=14);
  if(lounge){const depth=4.5;add({id:f+'-balcony',kind:'terrace',label:'Sit-out balcony',floor:f,x:lounge.x,y:0,w:lounge.w,h:depth});lounge.y=depth;lounge.h=rounded(lounge.h-depth);}
 }
 // Keep north-up survey coordinates; the entrance/front can be on any side.
 if(turn)for(const r of rooms){const {x,y,w,h}=r;if(turn===1)Object.assign(r,{x:fp.h-y-h,y:x,w:h,h:w});else if(turn===2)Object.assign(r,{x:fp.w-x-w,y:fp.h-y-h});else Object.assign(r,{x:y,y:fp.w-x-w,w:h,h:w});r.x=rounded(r.x);r.y=rounded(r.y);}
 fp=actual;d=original;
 for(const q of d.roomRequests){
  const r=rooms.find(r=>r.id===q.id)||rooms.find(r=>r.kind===q.kind&&r.floor===q.floor);
  if(!r){checks.push({id:q.id,title:'Requested room is missing',detail:q.label,status:'conflict'});continue;}
  const ok=q.mode==='auto'||((!q.w||Math.abs(r.w-q.w)<.12)&&(!q.h||Math.abs(r.h-q.h)<.12));
  checks.push({id:q.id,title:`${q.label||r.label}: ${q.mode} size`,detail:`Designed ${r.w} × ${r.h} ft${q.mode!=='auto'?`; requested ${q.w} × ${q.h} ft`:''}.`,status:ok?'pass':q.mode==='exact'?'conflict':'warning',target:r.id});
  if(q.zone!=='any')checks.push({id:`zone-${q.id}`,title:`${r.label} position`,detail:`Requested ${q.zone}.`,status:zoneMatches(q.zone,r.x+r.w/2,r.y+r.h/2,fp.w,fp.h)?'pass':q.priority==='required'?'conflict':'warning'});
 }
 if(d.vastuMode!=='none')for(const rule of d.vastuRules){
  const r=rooms.find(r=>r.id===rule.target)||rooms.find(r=>r.kind===(rule.target==='sofa'?'living':rule.target.startsWith('pooja-')?'pooja':rule.target==='cooking'?'kitchen':rule.target)),service=d.services.find(s=>s.id===rule.target||s.type===rule.target);
  const x=r?r.x+r.w/2:service?service.x-fp.x:NaN,y=r?r.y+r.h/2:service?service.y-fp.y:NaN;
  const positional=!!(r||service)&&zoneMatches(rule.zone,x,y,fp.w,fp.h);
  const facingOK=rule.facing==='any'||(rule.target==='mainDoor'?d.mainDoorFacing===rule.facing:!!r&&['living','lounge','kitchen','bedroom','pooja'].includes(r.kind)&&(rule.target==='pooja-worshipper'?({north:'south',south:'north',east:'west',west:'east'} as const)[furnishingFrame({...base,valid:true,warnings,design:original},r).facing]:furnishingFrame({...base,valid:true,warnings,design:original},r).facing)===rule.facing);
  const matched=rule.target==='mainDoor'?(rule.zone==='any'&&facingOK):positional&&facingOK;
  checks.push({id:rule.id,title:`Vastu: ${rule.target}`,detail:`${rule.zone} · facing ${rule.facing}. ${rule.note}`,status:matched?'pass':d.vastuMode==='strict'||rule.priority==='required'?'conflict':'warning'});
 }
 if(d.measurement==='approximate')warnings.push('Plot measurements are approximate. Confirm a survey before construction.');
 if(!site.rectangular)warnings.push('The real polygon is retained. This concept fits a conservative orthogonal footprint within all setbacks; unused wedges remain outside space.');
 if(d.vastuMode!=='none'&&!d.vastuRules.length)warnings.push('Add the customer’s Vastu instructions. No unconfirmed directions are assumed.');
 if(d.levels.some(l=>l.rental))warnings.push('Rental levels use the shared stair core in this concept. Confirm independent access, fire separation, utility meters and approvals with the architect.');
 if(d.levels.some(l=>l.future))warnings.push('Future floors require structural capacity and approval review.');
 const physical={...base,valid:true,warnings,design:original},layout=makeHouseLayout(physical),entry=layout.doors.find(v=>v.main),main=d.twoDoors?layout.doors.find(v=>v.inner):entry;
 checks.push({id:'main-door-facing',title:'Main-door direction',detail:main?'Requested '+d.mainDoorFacing+'; designed '+main.facing+'.':'The requested entrance arrangement could not be connected. Change the directions or foyer.',status:main?.facing===d.mainDoorFacing?'pass':'conflict'});
 for(const rule of d.vastuRules.filter(v=>v.target==='mainDoor'))if(d.vastuMode!=='none'){const check=checks.find(c=>c.id===rule.id);if(check){const px=main?main.x+(main.axis==='x'?main.width/2:0):NaN,py=main?main.z+(main.axis==='z'?main.width/2:0):NaN,matched=!!main&&(rule.facing==='any'||main.facing===rule.facing)&&zoneMatches(rule.zone,px,py,actual.w,actual.h);check.status=matched?'pass':d.vastuMode==='strict'||rule.priority==='required'?'conflict':'warning';}}
 if(d.twoDoors)checks.push({id:'outer-door-facing',title:'Outer entrance direction',detail:'Outer entrance must connect the site to the foyer.',status:entry?.facing===d.outerFacing&&entry.rooms?.some(id=>rooms.find(r=>r.id===id)?.kind==='foyer')?'pass':'conflict'});
 for(let f=0;f<levels;f++){
   const reached=new Set(rooms.filter(r=>r.floor===f&&['passage','foyer'].includes(r.kind)).map(r=>r.id));let changed=true;
   while(changed){changed=false;for(const door of layout.doors.filter(v=>v.floor===f))if(door.rooms?.some(id=>reached.has(id)))for(const id of door.rooms||[])if(!reached.has(id)){reached.add(id);changed=true;}}
   for(const r of rooms.filter(r=>r.floor===f&&!['passage','foyer'].includes(r.kind)))if(!reached.has(r.id))checks.push({id:'access-'+r.id,title:r.label+' has no connected doorway',detail:'Revise the room size or floor programme to provide a clear entrance.',status:'conflict',target:r.id});
 }
 checks.push(...serviceLayout(physical).checks);
 for(const c of checks.filter(c=>c.status!=='pass'))if(!warnings.includes(c.title+': '+c.detail))warnings.push(c.title+': '+c.detail);
 const valid=rooms.every(r=>r.w>0&&r.h>0&&r.x>=-.01&&r.y>=-.01&&r.x+r.w<=fp.w+.05&&r.y+r.h<=fp.h+.05);
 return {...base,valid,warnings:[...new Set(warnings)]};
}

