import {FLOOR_HEIGHT} from './building-dimensions';
import {pointInPolygon} from './geometry';
import {facadeStyle} from './house3d/facade-styles';
import type {DesignCheck,Plan,Room,ServiceNode,TerraceOptions} from './types';

export const terraceOptions=(plan:Plan):TerraceOptions=>({stairLocation:'internal',stairType:'dogleg',independentFloors:[],tankMount:plan.design?.services.some(s=>s.type==='tank')?'slab':'headroom',tankCapacity:1000,...plan.design?.terrace});
export const terraceLevel=(plan:Plan)=>plan.levels||1;
export const pitchedRoof=(plan:Plan)=>facadeStyle(plan.design?.style)?.pitched??(!!plan.design?.roof&&plan.design.roof!=='flat');
export const openTerraceDepth=(plan:Plan)=>Math.min(Math.max(0,plan.depth-14),Math.max(10,plan.depth-headroom(plan).y+1));
export function headroom(plan:Plan):Room{
 const top=terraceLevel(plan)-1,core=plan.rooms.find(r=>r.kind==='stairs'&&r.floor===top);
 if(core)return {...core,id:'terrace-headroom',floor:top+1,label:'Stair headroom'};
 const stair=externalStair(plan);if(stair)return {id:'terrace-headroom',kind:'stairs',label:'Stair headroom',floor:top+1,x:Math.max(0,Math.min(plan.width-7,stair.x-stair.w/2)),y:Math.max(0,Math.min(plan.depth-9,stair.y-stair.h/2)),w:7,h:9};
 return {id:'terrace-headroom',kind:'stairs',label:'Stair headroom',floor:top+1,x:Math.max(0,plan.width-7),y:Math.max(0,plan.depth-10),w:7,h:10};
}
export function externalStair(plan:Plan){
 const options=terraceOptions(plan);if(options.stairLocation==='internal')return null;
 const placed=plan.editor?.data.objects['external-stair'];if(placed)return placed;
 const w=options.stairType==='spiral'?6:6.8,h=options.stairType==='spiral'?6:15;
 const x=options.stairLocation==='side'?plan.width+.3:Math.max(.3,plan.width/2-w/2);
 const y=options.stairLocation==='front'?-h-.3:options.stairLocation==='rear'?plan.depth+.3:Math.max(.3,plan.depth-h-2);
 return {id:'external-stair',kind:'external-stair',label:'External stair',roomId:'',floor:0,x:x+w/2,y:y+h/2,w,h,angle:0};
}
export function roofTank(plan:Plan):ServiceNode{
 const existing=plan.design?.services.find(n=>n.type==='tank');if(existing)return existing;
 const options=terraceOptions(plan),c=headroom(plan),edited=plan.editor?.data.objects['default-roof-tank'];
 const x=edited?.x??(options.tankMount==='headroom'?c.x+c.w/2+plan.offsetX:plan.offsetX+Math.max(4,plan.width-4));
 const y=edited?.y??(options.tankMount==='headroom'?c.y+c.h/2+plan.offsetY:plan.offsetY+Math.max(4,plan.depth-4));
 return {id:'default-roof-tank',type:'tank',label:'Overhead water tank',x,y,level:terraceLevel(plan),capacity:options.tankCapacity,side:'east',locked:false};
}
export function effectiveServices(plan:Plan):ServiceNode[]{const nodes=plan.design?.services||[];return nodes.some(n=>n.type==='tank')?nodes:[...nodes,roofTank(plan)];}
export function terraceChecks(plan:Plan):DesignCheck[]{
 const checks:DesignCheck[]=[],options=terraceOptions(plan),stair=externalStair(plan),c=headroom(plan),core=plan.rooms.find(r=>r.kind==='stairs'&&r.floor===terraceLevel(plan)-1),tank=roofTank(plan),rise=FLOOR_HEIGHT/18,tread=stair?(options.stairType==='spiral'?Math.PI*stair.w*.32*1.8/9:Math.max(0,(stair.h-4)/9)):core?Math.max(0,(core.h-2.3-4)/9):0,width=stair?(options.stairType==='spiral'?stair.w/2:stair.w/2-.4):(core?.w||c.w)/2-.4;
 if(rise> .624||tread<.82||width<2.95)checks.push({id:'terrace-stair-geometry',title:'Stair geometry needs review',detail:`Rise ${rise.toFixed(2)} ft, tread ${tread.toFixed(2)} ft and clear flight about ${width.toFixed(2)} ft; adjust the stair footprint before approval.`,status:'conflict',target:stair?.id||c.id});
 if(!stair&&!plan.rooms.some(r=>r.kind==='stairs'))checks.push({id:'terrace-access-core',title:'Terrace access needs a stair core',detail:'The floor programme has no internal stair. Place a compliant external stair or revise the rooms.',status:'conflict',target:c.id});
 if(stair){const corners=[[stair.x-stair.w/2,stair.y-stair.h/2],[stair.x+stair.w/2,stair.y-stair.h/2],[stair.x+stair.w/2,stair.y+stair.h/2],[stair.x-stair.w/2,stair.y+stair.h/2]],allowed=plan.site?.footprint;if(corners.some(([x,y])=>x>=0&&x<=plan.width&&y>=0&&y<=plan.depth)||corners.some(([x,y])=>{const px=x+plan.offsetX,py=y+plan.offsetY;return !pointInPolygon({x:px,y:py},plan.site?.polygon||[{x:0,y:0},{x:plan.plotWidth,y:0},{x:plan.plotWidth,y:plan.plotDepth},{x:0,y:plan.plotDepth}])||!!allowed&&(px<allowed.x-.01||px>allowed.x+allowed.w+.01||py<allowed.y-.01||py>allowed.y+allowed.h+.01);}))checks.push({id:'terrace-external-setback',title:'External stair footprint needs review',detail:'The external stair must fit outside the main walls and inside the surveyed plot with the required clearances. Move it in 2D or revise the setbacks.',status:'conflict',target:stair.id});}
 if(tank.capacity<=0)checks.push({id:'terrace-tank-capacity',title:'Set tank capacity',detail:'Choose a positive overhead water tank capacity.',status:'warning',target:tank.id});
 const tx=tank.x-plan.offsetX,tz=tank.y-plan.offsetY,edge=Math.min(tx,plan.width-tx,tz,plan.depth-tz)-1.25,headClear=Math.min(tx-c.x,c.x+c.w-tx,tz-c.y,c.y+c.h-tz)-1.25,available=options.tankMount==='headroom'?headClear:edge;
 if(available<(plan.design?.maintenanceWidth||2.5))checks.push({id:'terrace-tank-clearance',title:'Tank maintenance clearance',detail:`About ${Math.max(0,available).toFixed(2)} ft clear around the tank; move it or revise its support to meet the ${plan.design?.maintenanceWidth||2.5} ft working target.`,status:'warning',target:tank.id});
 if(options.independentFloors.some(f=>f<=0||f>=terraceLevel(plan)))checks.push({id:'terrace-unit-level',title:'Independent floor selection',detail:'Select an existing upper floor for a separate dwelling.',status:'conflict'});
 if(options.independentFloors.length&&options.stairLocation==='internal')checks.push({id:'terrace-unit-access',title:'Independent unit needs external access',detail:'Choose an external stair before marking an upper floor as independent.',status:'conflict'});
 return checks;
}
