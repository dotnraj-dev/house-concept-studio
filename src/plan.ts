import type { Plan, Ratios, Requirements, Room, RoomKind, Settings } from './types';
import {generatePlan as generateBasePlan} from './planner-v2';
import {applyPlanEdits,migrateEdits} from './editor-model';
import {makeHouseLayout} from './house3d/layout';
import {tnReview} from './tn-rules';
import {terraceChecks} from './terrace';

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const roomArea = (room: Room) => round(room.w * room.h);
export const totalArea = (plan: Plan) => Math.round(plan.rooms.filter(r => r.kind !== 'portico' && r.kind !== 'terrace').reduce((sum,r)=>sum+r.w*r.h,0)*100)/100;

export function generatePlan(req:Requirements,settings:Settings,variant:number,ratios:Ratios):Plan{
 const base=generateBasePlan(req,settings,variant,ratios);
 const edited=applyPlanEdits(base,migrateEdits(req.design?.editor));
 if(!req.design?.editor)return {...edited,checks:[...(edited.checks||[]),...terraceChecks(edited)]};
 const layout=makeHouseLayout(edited),rules=tnReview(req,edited,layout);
 const checks=[...(edited.checks||[]).filter(c=>!c.id.startsWith('tn-')),...rules,...terraceChecks(edited)];
 const links=new Map(edited.rooms.map(r=>[r.id,new Set<string>()]));
 for(const door of layout.doors)for(const a of door.rooms||[])for(const b of door.rooms||[])if(a!==b){links.get(a)?.add(b);links.get(b)?.add(a);}
 const stairs=edited.rooms.filter(r=>r.kind==='stairs');for(const a of stairs)for(const b of stairs)if(a.floor+1===b.floor){links.get(a.id)?.add(b.id);links.get(b.id)?.add(a.id);}
 const root=layout.doors.find(d=>d.main)?.rooms?.[0]||edited.rooms[0]?.id,seen=new Set<string>(),queue=[...(root?[root]:[]),...layout.doors.filter(d=>d.unitEntrance).flatMap(d=>d.rooms||[])];while(queue.length){const id=queue.shift()!;if(seen.has(id))continue;seen.add(id);for(const next of links.get(id)||[])if(!seen.has(next))queue.push(next);}
 for(const r of edited.rooms)if(!seen.has(r.id)&&!['terrace','portico'].includes(r.kind))checks.push({id:'editor-connect-'+r.id,title:'Room may be unreachable',detail:`${r.label} has no modelled door path from the entrance.`,status:'warning',target:r.id});
 if(req.design?.vastuMode!=='none')for(const r of edited.rooms){const desired=r.kind==='pooja'?'north-east':r.kind==='kitchen'?'south-east':r.kind==='bedroom'&&/master/i.test(r.label)?'south-west':null;if(!desired)continue;const east=r.x+r.w/2>=edited.width/2,south=r.y+r.h/2>=edited.depth/2,actual=`${south?'south':'north'}-${east?'east':'west'}`;if(actual!==desired)checks.push({id:'editor-vastu-'+r.id,title:'Vastu preference',detail:`${r.label} is ${actual}; the overridable preference is ${desired}.`,status:'warning',target:r.id});}
 const warnings=[...new Set([...edited.warnings,...rules.filter(c=>c.status!=='pass').map(c=>c.title+': '+c.detail)])];
 for(const c of checks.filter(c=>c.id.startsWith('editor-connect-')||c.id.startsWith('editor-vastu-')))warnings.push(c.title+': '+c.detail);
 return {...edited,checks,warnings};
}
export function generateLegacyPlan(req: Requirements, settings: Settings, variant: number, ratios: Ratios): Plan {
  const warnings: string[] = [];
  const plotWidth = Number(req.plotWidth) || 0;
  const plotDepth = Number(req.plotDepth) || 0;
  const width = round(plotWidth - 2 * settings.sideSetback);
  const depth = round(plotDepth - settings.frontSetback - settings.rearSetback);
  if (plotWidth <= 0 || plotDepth <= 0) warnings.push('Enter measured plot width and depth.');
  if (width < 18 || depth < 22) warnings.push('This plot is too small for the starter layout; architect review is required.');
  if (req.bedrooms > (req.floors === 2 ? 4 : 2)) warnings.push('The requested bedroom count exceeds this template. Use an architect-designed layout.');
  if (req.vastu !== 'none') warnings.push('Vastu preferences are recorded but require an architect to verify the orientation and layout.');
  const safeW = Math.max(1, width), safeD = Math.max(1, depth);
  const valid = plotWidth > 0 && plotDepth > 0 && width >= 18 && depth >= 22;
  const rooms: Room[] = [];
  const add = (kind: RoomKind, label: string, floor: number, x: number, y: number, w: number, h: number) => {
    rooms.push({ id: `${floor}-${kind}-${rooms.length}`, kind, label, floor, x: round(x), y: round(y), w: round(w), h: round(h) });
  };
  const variantName = ['Balanced home', 'Open living', 'Private rooms'][clamp(variant, 0, 2)];
  if (!valid) return { rooms, valid, width:safeW, depth:safeD, plotWidth, plotDepth,
    offsetX:settings.sideSetback, offsetY:settings.frontSetback, roadSide:req.roadSide,
    toiletStyle:req.toiletStyle, pooja:req.pooja, warnings, variantName };
  const frontRatio = clamp(ratios.front + (variant === 1 ? .035 : variant === 2 ? -.035 : 0), .25, .42);
  const middleRatio = clamp(ratios.middle, .22, .36);
  const frontD = round(safeD * frontRatio);
  const middleD = round(safeD * middleRatio);
  const rearD = round(safeD - frontD - middleD);
  const livingShare = clamp(ratios.livingShare + (variant === 1 ? .05 : variant === 2 ? -.03 : 0), .47, .68);
  const livingW = round(safeW * livingShare);
  const kitchenW = round(safeW * clamp(ratios.kitchenShare + (req.kitchenPriority === 'spacious' ? .07 : req.kitchenPriority === 'compact' ? -.06 : 0), .40, .60));
  const kitchenX = safeW - kitchenW;

  add('living', 'Living room', 0, 0, 0, req.parking ? livingW : safeW, frontD);
  if (req.parking) add('portico', 'Car portico', 0, livingW, 0, safeW - livingW, frontD);
  if (variant === 2) {
    add('kitchen', 'Kitchen', 0, 0, frontD, kitchenW, middleD);
    add('dining', 'Dining', 0, kitchenW, frontD, safeW-kitchenW, middleD);
  } else {
    add('dining', 'Dining', 0, 0, frontD, kitchenX, middleD);
    add('kitchen', 'Kitchen', 0, kitchenX, frontD, kitchenW, middleD);
  }
  const rearY = frontD + middleD;
  const stairW = round(safeW * .31);
  const bedroomW = round(safeW - stairW);
  if (variant === 2) {
    add(req.floors === 2 ? 'stairs' : 'bathroom', req.floors === 2 ? 'Stairs + bath' : 'Bathroom / utility', 0, 0, rearY, stairW, rearD);
    add('bedroom', req.elderlyBedroom ? 'Parents bedroom' : 'Bedroom 1', 0, stairW, rearY, bedroomW, rearD);
  } else {
    add('bedroom', req.elderlyBedroom ? 'Parents bedroom' : 'Bedroom 1', 0, 0, rearY, bedroomW, rearD);
    add(req.floors === 2 ? 'stairs' : 'bathroom', req.floors === 2 ? 'Stairs + bath' : 'Bathroom / utility', 0, bedroomW, rearY, stairW, rearD);
  }
  if (req.floors === 1 && req.bedrooms > 1) warnings.push('A second ground-floor bedroom needs a custom layout; this concept shows one bedroom.');
  if (req.floors === 2) {
    const halfW = round(safeW * .52);
    add('bedroom', 'Bedroom 2', 1, 0, 0, halfW, frontD);
    add(req.bedrooms >= 3 ? 'bedroom' : 'terrace', req.bedrooms >= 3 ? 'Bedroom 3' : 'Terrace', 1, halfW, 0, safeW-halfW, frontD);
    add('lounge', 'Family lounge', 1, 0, frontD, kitchenX, middleD);
    add('bathroom', 'Bathroom', 1, kitchenX, frontD, kitchenW, middleD);
    const upperStairX=variant===2?0:bedroomW;
    const upperRoomX=variant===2?stairW:0;
    if (req.bedrooms >= 4) add('bedroom', 'Bedroom 4', 1, upperRoomX, rearY, bedroomW, rearD);
    else add('terrace', 'Open terrace', 1, upperRoomX, rearY, bedroomW, rearD);
    add('stairs', 'Stair landing', 1, upperStairX, rearY, stairW, rearD);
  }
  if (req.bathrooms > (req.floors === 2 ? 2 : 1)) warnings.push('Additional bathrooms are requirements to resolve in detailed design; this concept shows shared wet zones.');
  if (req.pooja) warnings.push('Pooja space is requested; final placement needs review with the customer.');
  if (req.utility) warnings.push('Utility space is requested; final placement needs review with the customer.');
  for (const room of rooms) {
    const target = req.requestedSizes?.[room.kind as keyof typeof req.requestedSizes];
    if (target && ((target.w > 0 && room.w < target.w) || (target.h > 0 && room.h < target.h)))
      warnings.push(`${room.label} is smaller than the requested ${target.w || 'any'} × ${target.h || 'any'} ft. Review the layout.`);
  }
  return { rooms, valid, width: safeW, depth: safeD, plotWidth, plotDepth, offsetX: settings.sideSetback, offsetY: settings.frontSetback, roadSide: req.roadSide, toiletStyle: req.toiletStyle, pooja: req.pooja, warnings, variantName };
}
