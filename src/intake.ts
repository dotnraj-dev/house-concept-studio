import {requirementsSchema,designSchema} from './schemas';
import { designOf, type Requirements } from './types';
export type IntakeField={key:string;value:string};
export function localExtract(text:string){
 const fields:IntakeField[]=[],questions:string[]=[];const add=(key:string,value:unknown)=>fields.push({key,value:String(value)});
 const dimensions=text.match(/(?:plot|land|site|மனை)[^\d]{0,25}(\d+(?:\.\d+)?)\s*(?:x|×|by|\*)\s*(\d+(?:\.\d+)?)/i);
 if(dimensions){add('plotWidth',dimensions[1]);add('plotDepth',dimensions[2]);}
 const floors=text.match(/\bG\s*\+\s*(\d+)/i);if(floors)add('floors',Number(floors[1])+1);else {const m=text.match(/(\d+)\s*(?:floors|storeys|levels)/i);if(m)add('floors',m[1]);}
 for(const [key,pattern] of [['bedrooms',/(\d+)\s*(?:bedrooms?|beds?|BHK)/i],['bathrooms',/(\d+)\s*(?:bathrooms?|toilets?|baths?)/i]] as const){const m=text.match(pattern);if(m)add(key,m[1]);}
 const road=text.match(/(?:road|plot|land)\s*(?:is|on|facing|faces|towards)?\s*(north|east|south|west)/i)||text.match(/(north|east|south|west)[ -]*(?:facing\s*)?(?:road|plot|land)/i);if(road)add('roadSide',road[1].toLowerCase());
 const door=text.match(/(?:main\s*)?(?:door|entrance)\s*(?:should|must)?\s*(?:be|is|to|face|facing|faces)?\s*(north|east|south|west)/i);if(door)add('design.mainDoorFacing',door[1].toLowerCase());
 if(/two\s*doors|2\s*doors|foyer|shoe\s*rack|இரண்டு\s*கதவ/i.test(text))add('design.twoDoors',true);
 if(/strict\s*(?:vasthu|vastu|vaastu)/i.test(text))add('design.vastuMode','strict');else if(/semi\s*(?:vasthu|vastu|vaastu)/i.test(text))add('design.vastuMode','semi');else if(/no\s*(?:vasthu|vastu|vaastu)/i.test(text))add('design.vastuMode','none');
 if(/kerala/i.test(text)){add('design.style','kerala-traditional');add('design.roof','kerala');}else if(/chettinad/i.test(text))add('design.style','chettinad');else if(/modern|contemporary/i.test(text))add('design.style','tn-contemporary');
 if(/(?:no|without)\s*(?:car\s*)?parking/i.test(text))add('parking',false);else if(/parking|portico/i.test(text))add('parking',true);
 if(/pooja|puja|பூஜை/i.test(text))add('pooja',true);
 if(/utility|washing|சலவை/i.test(text))add('utility',true);
 const hall=text.match(/(?:hall|living(?:\s*room)?|வரவேற்பறை)[^\d]{0,20}(\d+(?:\.\d+)?)\s*(?:x|×|by|\*)\s*(\d+(?:\.\d+)?)/i);
 if(hall)add('design.roomRequests',JSON.stringify([{id:'0-living-0',kind:'living',label:'Living room',floor:0,mode:'exact',w:Number(hall[1]),h:Number(hall[2]),zone:'any',facing:'any',priority:'required',toiletStyle:'western'}]));
 if(/(?:five|six|seven|5|6|7)[ -]*sided|irregular/i.test(text))questions.push('Add measured plot corners or trace a calibrated survey. Side lengths alone do not establish an irregular shape.');
 if(/tank|sump|septic/i.test(text))questions.push('Place the tank/service on the services drawing and confirm its level and maintenance access.');
 if(!dimensions)questions.push('Confirm the measured plot boundary in the site editor.');
 return {fields,questions:questions.slice(0,3),summary:'Local rule-based suggestions. Only recognised phrases are extracted; review each value. The full original description remains saved.',mode:'local' as const};
}
export function applyIntakeField(req:Requirements,key:string,value:string):Requirements{
 if(key.startsWith('design.')){
  const field=key.slice(7),d=designOf(req);
  if(field==='roomRequests'){try{const incoming=designSchema.shape.roomRequests.parse(JSON.parse(value));return {...req,design:{...d,roomRequests:[...d.roomRequests.filter(r=>!incoming.some(i=>i.id===r.id)),...incoming]}};}catch{return req;}}
  if(['mainDoorFacing','houseFacing','outerFacing'].includes(field)&&!['north','east','south','west'].includes(value))return req;
  if(field==='vastuMode'&&!['strict','semi','none'].includes(value))return req;
  if(!['mainDoorFacing','houseFacing','outerFacing','twoDoors','vastuMode','style','roof'].includes(field))return req;
  return {...req,design:{...d,[field]:field==='twoDoors'?value==='true':value}};
 }
 if(['plotWidth','plotDepth','bedrooms','bathrooms','floors','budgetLakhs'].includes(key)){const n=Number(value);if(!Number.isFinite(n)||n<0)return req;if(['bedrooms','bathrooms','floors'].includes(key)&&(!Number.isInteger(n)||n<1||n>100))return req;if(['plotWidth','plotDepth'].includes(key)&&n>10000)return req;return {...req,[key]:n};}
 if(['parking','pooja','utility','elderlyBedroom'].includes(key))return {...req,[key]:value==='true'};
 if(key==='roadSide'&&!['north','east','south','west'].includes(value))return req;
 if(['customerName','customerPhone','location','notes','roadSide','livingPriority','kitchenPriority','toiletStyle','vastu'].includes(key)){const candidate={...req,[key]:value};return requirementsSchema.safeParse(candidate).success?candidate:req;}
 return req;
}

