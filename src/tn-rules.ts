import type {Requirements,Plan,PlotVertex,DesignCheck} from './types';
import {METRES_PER_FOOT,FLOOR_HEIGHT,PLINTH_HEIGHT,CEILING_LEVEL} from './building-dimensions';
import type {HouseLayout} from './house3d/layout';
import {stairDimensions} from './house3d/stairs';
export const TN_RULESET='TN residential review · 15 Nov 2026';
export type TNSiteRules={
 area:'unknown'|'other'|'cba'|'ews';access:'unknown'|'direct'|'passage';roadWidthM:number;dwellings:number;
 restrictions:'unknown'|'none'|'special';sideChoice:'balanced'|'left'|'right';alignmentM:number;alignmentConfirmed:boolean;frontageM:number;
 edgeRoles:Record<string,'front'|'rear'|'left'|'right'>;
};
export const DEFAULT_TN_SITE:TNSiteRules={area:'unknown',access:'unknown',roadWidthM:0,dwellings:1,restrictions:'unknown',sideChoice:'balanced',alignmentM:0,alignmentConfirmed:false,frontageM:0,edgeRoles:{}};
export function tnSite(req:Requirements):TNSiteRules{return {...DEFAULT_TN_SITE,...req.design?.tnRules,dwellings:Math.max(req.design?.tnRules?.dwellings||1,1+(req.design?.terrace?.independentFloors.length||0)),edgeRoles:{...req.design?.tnRules?.edgeRoles}};}
const ft=(m:number)=>m/METRES_PER_FOOT;
export function tnSetbackMinimums(req:Requirements){
 const t=tnSite(req),height=(req.floors*FLOOR_HEIGHT+PLINTH_HEIGHT)*METRES_PER_FOOT;
 if(req.design?.roof&&req.design.roof!=='flat')return null;
 if(t.area!=='other'||t.access!=='direct'||t.restrictions!=='none'||t.roadWidthM<=0||!t.alignmentConfirmed||t.dwellings>16||height>14)return null;
 const frontage=req.design?.plotMode==='polygon'?t.frontageM:(['north','south'].includes(req.roadSide)?req.plotWidth:req.plotDepth)*METRES_PER_FOOT;
 if(!frontage)return null;
 const front=t.roadWidthM<=9?1.5:t.roadWidthM<=18?3:t.roadWidthM<=30.5?4.5:6;
 const side=height<=7?1:frontage<=6?1:1.5;
 let left=side,right=side;
 if(frontage<=9||t.sideChoice!=='balanced'){
  const total=frontage>9?side*2:side;
  left=t.sideChoice==='left'?total:0;right=t.sideChoice==='left'?0:total;
 }
 return {front:ft(front+t.alignmentM),rear:ft(height<=7?0:1.5),left:ft(left),right:ft(right),height};
}
export function tnBoundaryRoles(req:Requirements):Record<string,'front'|'rear'|'left'|'right'>{
 const t=tnSite(req);if(req.design?.plotMode==='polygon')return t.edgeRoles;
 const sides=['north','east','south','west'],i=sides.indexOf(req.roadSide),names=['A','B','C','D'];
 return Object.fromEntries(names.map((id,k)=>[id,(['front','right','rear','left'] as const)[(k-i+4)%4]]));
}
export function applyTNSetbacks(req:Requirements,vertices:PlotVertex[]){
 const min=tnSetbackMinimums(req),roles=tnBoundaryRoles(req);
 if(!min||vertices.some(v=>!roles[v.id]))return vertices;
 return vertices.map(v=>({...v,setback:Math.max(v.setback,min[roles[v.id]])}));
}
export function tnReview(req:Requirements,plan:Plan,layout:HouseLayout):DesignCheck[]{
 const t=tnSite(req),out:DesignCheck[]=[],height=(req.floors*FLOOR_HEIGHT+PLINTH_HEIGHT)*METRES_PER_FOOT;
 const add=(id:string,title:string,detail:string,status:DesignCheck['status']='warning')=>out.push({id:'tn-'+id,title,detail,status});
 add('dwellings','Dwelling-unit count',`${t.dwellings} dwelling unit${t.dwellings===1?'':'s'} counted, including separately accessed upper floors. Confirm unit doors, stair access and parking with the authority.`,'pass');
 if(req.design?.roof&&req.design.roof!=='flat')add('roof','Check the sloping roof section','Automatic site-table selection is withheld for a sloping roof. Verify roof crown, eaves, habitable roof space and applicable height exclusions in the building section before using this profile.');
 if(!req.design?.authority.trim()||t.area==='unknown'||t.access==='unknown'||!t.roadWidthM||t.restrictions==='unknown'||!t.alignmentConfirmed)
  add('missing','Tamil Nadu site details needed','Record the approving authority, notified area category, road width, access, street alignment and special restrictions before applying the site tables.');
 if(t.area==='cba'||t.area==='ews'||t.access==='passage'||t.restrictions==='special')add('special','Authority-specific rules need review','CBA/EWS, private access, coastal, hill, aquifer, airport, heritage or other restricted sites need a verified project-specific profile. Standard-area setbacks are not applied automatically.');
 if(req.design?.plotMode==='polygon'&&(!t.frontageM||plan.site?.polygon.some(v=>!t.edgeRoles[v.id])))add('edges','Classify every surveyed boundary','Set the surveyed frontage and each edge’s front, rear, left or right legal role before automatic Tamil Nadu setbacks can be applied.');
 if(t.roadWidthM>0&&t.area==='other'&&t.roadWidthM<3)add('road','Access road is too narrow','Rule 35(1)(a), amended table: the standard-area profile requires at least a 3 m road.','conflict');
 if(t.roadWidthM>=3&&t.roadWidthM<6&&(height>10||t.dwellings>8))add('narrow-road','Building exceeds the narrow-road profile','For a standard-area road below 6 m, review the 10 m height / 8-dwelling category before proceeding.','conflict');
 if(height>14||t.dwellings>16||req.floors>3)add('tall','Taller or larger residential building needs review','Do not infer permission from the floor count. Apply the relevant amended Rule 35/39, road continuity, setbacks, parking, fire and structural provisions. G.O.194/2026 changes the upper non-high-rise category to 19.50 m; this app does not certify that category.');
 const area=plan.site?.area||req.plotWidth*req.plotDepth;
 // Conservative gross model area. Statutory exclusions/premium FSI require a professional area statement.
 const gross=plan.rooms.filter(r=>r.kind!=='terrace').reduce((a,r)=>a+r.w*r.h,0),fsi=area?gross/area:0;
 add('fsi','Base FSI envelope',`Conservative model ratio ${fsi.toFixed(2)}; base standard residential profile 2.00. Covered portico and stairs are counted. Statutory exclusions and premium FSI are not assumed.`,fsi>2+.002?'conflict':'pass');
 const min=tnSetbackMinimums(req),roles=tnBoundaryRoles(req);
 if(min&&plan.site?.polygon.every(v=>roles[v.id])){
  const tooSmall=plan.site.polygon.some(v=>v.setback+.002<min[roles[v.id]]);
  add('setbacks','Minimum site setbacks',`Effective boundary offsets include the entered clearances and the greater applicable Rule 35 minimum, measured after the entered street alignment. Building profile height: ${height.toFixed(2)} m.`,tooSmall?'conflict':'pass');
 }
 add('height','Clear room height',`${((CEILING_LEVEL-.085)*METRES_PER_FOOT).toFixed(2)} m clear to the model ceiling; Rule 52 requires 2.75 m for ordinary habitable rooms/kitchens. Beams, ducts and sloped roofs still need detailed sections.`,'pass');
 for(const r of plan.rooms){
  const width=Math.max(0,Math.min(r.w,r.h)-.56)*METRES_PER_FOOT,a=Math.max(0,r.w-.56)*Math.max(0,r.h-.56)*METRES_PER_FOOT**2;
  const hab=['living','lounge','bedroom','dining'].includes(r.kind),k=r.kind==='kitchen',b=r.kind==='bathroom';
  if((hab&&(a<7.5||width<2.4))||(k&&(a<5||width<1.8))||(b&&(a<2.4||width<1.2)))add('size-'+r.id,'Room below the minimum clear size',`${r.label}, floor ${r.floor}: approximately ${a.toFixed(2)} m² clear and ${width.toFixed(2)} m minimum width. Rule 52: habitable 7.5 m² / 2.4 m; separate kitchen 5 m² / 1.8 m; combined bath/WC 2.4 m² / 1.2 m.`,'conflict');
  if(hab||k||b){
   const windows=layout.windows.filter(w=>w.roomId===r.id),opening=windows.reduce((s,w)=>s+w.width*(w.height||3.4)*(w.openableFraction??(b?1:.5)),0)*METRES_PER_FOOT**2;
   const needed=b?.3:r.w*r.h*METRES_PER_FOOT**2/8*(k?1.25:1);
   if(opening+.001<needed)add('vent-'+r.id,'More opening area is needed',`${r.label}, floor ${r.floor}: ${opening.toFixed(2)} m² counted opening; ${needed.toFixed(2)} m² preliminary target. Add adequate openable windows or a compliant open-to-sky/shaft solution. Rule 52(7),(16). Only modelled external openings count.`,'conflict');
   if(Math.max(r.w,r.h)*METRES_PER_FOOT>7.5)add('depth-'+r.id,'Check daylight reach',`${r.label}: check that no occupied portion lies beyond 7.5 m from its daylight opening. Rule 52(16).`);
  }
  if(r.kind==='bathroom'&&layout.doors.some(d=>d.rooms?.includes(r.id)&&d.rooms.some(id=>plan.rooms.some(q=>q.id===id&&q.kind==='kitchen'))))add('wc-'+r.id,'Bathroom opens directly into a kitchen','Rule 52(7) prohibits this connection. Change the access.','conflict');
  if(r.kind==='stairs'&&r.floor<(plan.levels||1)-1){
   const frame=['east','west'].includes(req.design?.houseFacing||req.roadSide)?{...r,w:r.h,h:r.w}:r,s=stairDimensions(frame);
   if(s.flightWidth*METRES_PER_FOOT<.9||s.run/s.steps*METRES_PER_FOOT<.25||s.rise*METRES_PER_FOOT>.19||s.steps>15)add('stairs-'+r.id,'Stair geometry needs correction','Rule 52(17): this concept uses at least 0.90 m clear flight width, 250 mm treads, at most 190 mm risers and 15 risers per flight. Headroom must be checked in a detailed section.','conflict');
  }
 }
 add('plinth','Raised plinth and drainage',`Model plinth ${(PLINTH_HEIGHT*METRES_PER_FOOT).toFixed(3)} m above the example site ground. Rule 52(1) minimum 0.45 m; a notified flood level can require more. Site levels and drainage are not surveyed.`);
 add('parking','Parking schedule needs review','The one-car option is a customer preference, not a statutory parking calculation. Apply Annexure IV including G.O.156/2025 and later EV provisions; record dwelling floor areas, required car/two-wheeler spaces and access.');
 if(!req.design?.services.some(n=>n.type==='rainwater'))add('rwh','Rainwater harvesting provision needed','Rule 63 / Annexure XXII: place and design the harvesting, filtration, overflow and recharge arrangement for roof and paved areas; the drawn downpipe alone is not a complete system.');
 const nodes=req.design?.services||[];for(const tank of nodes.filter(n=>n.type==='septic'))for(const well of nodes.filter(n=>n.type==='borewell'))if(Math.hypot(tank.x-well.x,tank.y-well.y)*METRES_PER_FOOT<18)add('septic-'+tank.id,'Check the disposal system near a drinking-water source','Rule 54 recommends that the subsoil dispersion system preferably be no closer than 18 m to a drinking-water source. Tank markers alone do not locate the absorption system; obtain a wastewater design before fixing positions.');
 add('services','Services and safety review','Confirm rainwater harvesting, wastewater/septic clearances, waterproofing, flood level, fire/escape access, structural design, electrical safety and all required NOCs before approval.');
 return out;
}

