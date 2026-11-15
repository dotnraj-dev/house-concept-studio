import {FLOOR_HEIGHT} from './building-dimensions';
import {bathroomFixtures} from './house3d/bathroom';
import {furnishingFrame,makeHouseLayout} from './house3d/layout';
import { pointInPolygon, pointSegmentDistance } from './geometry';
import type { DesignCheck, Plan, Point, ServiceNode } from './types';
export type PipeRoute={id:string;system:'supply'|'waste'|'rain';points:[number,number,number][];label:string};
export const PIPE_COLORS={supply:'#2b83b7',waste:'#9b7249',rain:'#4c9a71'};
export function serviceLayout(plan:Plan){
 const d=plan.design;if(!d)return {nodes:[] as ServiceNode[],pipes:[] as PipeRoute[],checks:[] as DesignCheck[]};
 const wallLayout=makeHouseLayout(plan);
 const nodes=d.services,pipes:PipeRoute[]=[],checks:DesignCheck[]=[];
 const sx=plan.offsetX,sy=plan.offsetY,W=plan.width,H=plan.depth;
 const riser:Point={x:d.pipeSide==='west'?sx-.35:d.pipeSide==='east'?sx+W+.35:sx+W*.65,y:d.pipeSide==='north'?sy-.35:d.pipeSide==='south'?sy+H+.35:sy+H*.65};
 const tank=nodes.find(n=>n.type==='tank'||n.type==='sump'),outlet=nodes.find(n=>n.type===(d.sewerAvailable?'sewer':'septic'));
 const point=(n:ServiceNode):[number,number,number]=>[n.x-sx,n.level*FLOOR_HEIGHT+.6,n.y-sy];
 const rp=(level:number):[number,number,number]=>[riser.x-sx,level*FLOOR_HEIGHT+1,riser.y-sy];
 for(const node of nodes){
  const inPlot=plan.site?pointInPolygon(node,plan.site.polygon):node.x>=0&&node.x<=plan.plotWidth&&node.y>=0&&node.y<=plan.plotDepth;
  if(!inPlot)checks.push({id:node.id,title:node.label+' is outside the plot',detail:'Move this service node inside the surveyed boundary.',status:'conflict'});
  if(node.level>=(plan.levels||1)+1)checks.push({id:node.id+'-height',title:'Service level exceeds the house',detail:'Levels use 0 for ground and the floor count for terrace.',status:'conflict'});
  if((node.type==='tank'||node.type==='sump')&&node.level===0&&!nodes.some(n=>n.type==='pump'))checks.push({id:node.id+'-pump',title:'Pumping/head review needed',detail:'Ground-level storage needs a checked supply/pumping arrangement for upper fixtures.',status:'warning'});
  if(node.type==='septic'&&node.level!==0)checks.push({id:node.id+'-level',title:'Review septic containment level',detail:'Containment is represented at ground level; specialist design is required.',status:'conflict'});
 }
 if(tank)pipes.push({id:'tank-riser',system:'supply',label:'Storage to supply riser',points:[point(tank),[riser.x-sx,tank.level*FLOOR_HEIGHT+.6,tank.y-sy],rp(tank.level)]});
 for(const room of plan.rooms.filter(r=>['bathroom','kitchen','utility'].includes(r.kind))){
  const frame=furnishingFrame(plan,room),local=frame.local,cx=local.x+local.w/2;
  const fixture=room.kind==='bathroom'?bathroomFixtures(room,wallLayout).find(f=>f.kind==='basin'):null;
  const [x,z]=fixture?[fixture.x,fixture.z]:frame.transform(room.kind==='kitchen'?cx-1.3:room.kind==='bathroom'?cx+1.3:cx,room.kind==='bathroom'?local.y+local.h/2:local.y+local.h-1.1),level=room.floor;
  pipes.push({id:'supply-'+room.id,system:'supply',label:room.label+' water',points:[rp(level),[riser.x-sx,level*FLOOR_HEIGHT+1,z],[x,level*FLOOR_HEIGHT+1,z]]});
  pipes.push({id:'waste-'+room.id,system:'waste',label:room.label+' waste',points:[[x,level*FLOOR_HEIGHT+.3,z],[riser.x-sx,level*FLOOR_HEIGHT+.3,z],rp(level)]});
 }
 if(plan.rooms.length){
  pipes.push({id:'vertical-supply',system:'supply',label:'Supply riser',points:[rp(0),rp(Math.max(plan.levels||1,tank?.level||0))]});
  pipes.push({id:'vertical-waste',system:'waste',label:'Waste stack',points:[rp(0),rp(Math.max(0,(plan.levels||1)-1))]});
  if(outlet)pipes.push({id:'waste-outlet',system:'waste',label:'Waste outlet',points:[rp(0),[outlet.x-sx,.3,riser.y-sy],point(outlet)]});
  pipes.push({id:'rain-downpipe',system:'rain',label:'Rainwater downpipe',points:[[W+.6,(plan.levels||1)*FLOOR_HEIGHT,H-.5],[W+.6,.3,H-.5]]});
 }
 if(plan.site){
  const edgeClearance=Math.min(...plan.site.polygon.map((p,i)=>pointSegmentDistance(riser,p,plan.site!.polygon[(i+1)%plan.site!.polygon.length])));
  checks.push({id:'maintenance-clearance',title:'External service access',detail:`Riser-to-boundary clearance is approximately ${edgeClearance.toFixed(1)} ft; desired working clearance is ${d.maintenanceWidth} ft. Pipe/equipment sizes require final review.`,status:pointInPolygon(riser,plan.site.polygon)&&edgeClearance>=d.maintenanceWidth?'pass':'warning'});
 }
 if(!outlet)checks.push({id:'outlet-missing',title:'Choose the drainage destination',detail:d.sewerAvailable?'Place a sewer connection.':'Place septic containment and define the approved disposal arrangement.',status:'warning'});
 return {nodes,pipes,checks};
}

