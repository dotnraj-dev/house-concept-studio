import { totalArea } from './plan';
import { designOf, levelName, type Plan, type Requirements, type Settings } from './types';
import {externalStair,headroom} from './terrace';
const paise=(n:number)=>Math.round(n*100)/100;
export function quotation(plan:Plan,req:Requirements,settings:Settings){
 const d=designOf(req),rate=d.quoteOverride?d.quoteRate:settings.costPerSqft;
 const stair=externalStair(plan),externalStairArea=stair?stair.w*stair.h:0,headroomArea=headroom(plan).w*headroom(plan).h,dwellings=1+(d.terrace?.independentFloors.length||0);
 const floors=Array.from({length:req.floors},(_,floor)=>{
  const spaces=plan.rooms.filter(r=>r.floor===floor),enclosed=spaces.filter(r=>!['portico','terrace'].includes(r.kind)).reduce((s,r)=>s+r.w*r.h,0),portico=spaces.filter(r=>r.kind==='portico').reduce((s,r)=>s+r.w*r.h,0),terrace=spaces.filter(r=>r.kind==='terrace').reduce((s,r)=>s+r.w*r.h,0);
  const future=!!d.levels.find(l=>l.floor===floor)?.future,billable=future?0:enclosed+portico*d.porticoFactor+externalStairArea;
  return {floor,label:d.levels.find(l=>l.floor===floor)?.name||levelName(floor),enclosed,portico,terrace,externalStairArea,future,billable,rate,amount:future?0:paise(billable*rate)};
 });
 const extras=d.quoteExtras.filter(e=>!e.included&&(e.category!=='interior'||d.includeInteriors)),construction=paise(floors.reduce((s,f)=>s+f.amount,0)),extraTotal=paise(extras.reduce((s,e)=>s+e.quantity*e.rate,0)),subtotal=construction+extraTotal,discount=Math.min(subtotal,Math.max(0,d.quoteDiscount)),tax=paise((subtotal-discount)*d.quoteTax/100);
 return {floors,extras,rate,construction,extraTotal,subtotal,discount,tax,total:paise(subtotal-discount+tax),enclosed:totalArea(plan),billable:floors.reduce((s,f)=>s+f.billable,0),dwellings,externalStairArea,headroomArea,tankCapacity:d.terrace?.tankCapacity||1000,ready:rate>0&&plan.valid,notes:['Areas follow the designed building, not plot area.',`${dwellings} dwelling unit${dwellings===1?'':'s'}; external stair ${externalStairArea.toFixed(1)} sq ft per served floor is included in billable construction area.`, `Terrace headroom ${headroomArea.toFixed(1)} sq ft, roof waterproofing, drainage and ${d.terrace?.tankCapacity||1000} L tank support need itemised rates before a final quote.`, 'Enclosed floor plates include partitions and passage; stairs are counted once per floor.','Future provision floors are excluded; structural provision can be itemised as an extra.','Open terraces are excluded. Portico is billed at '+Math.round(d.porticoFactor*100)+'% of the construction rate.','Extras marked included are already covered by the base rate.','Concept estimate: quantities, structure, local approvals and contract scope require review.']};
}
export function money(value:number){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);}

