import {chooseStyle,regions,styleOptions} from './regions';
import {designOf,type Requirements,type Direction} from './types';
export const questions=[
 {id:'name',label:'Customer',ask:'Who are we designing for?',hint:'Start with the name you would like on the proposal.',choices:[]},
 {id:'location',label:'Location',ask:'Where is the plot?',hint:'A town or district is enough to begin.',choices:['Chennai','Coimbatore','Madurai']},
 {id:'plot',label:'Plot',ask:'What are the plot dimensions?',hint:'Use width × depth in feet. For an irregular plot, trace the boundary in the detailed form.',choices:['30 × 40 ft','40 × 60 ft','45 × 65 ft']},
 {id:'road',label:'Street',ask:'Which side is the road on?',hint:'The main door can face a different direction.',choices:['North','East','South','West']},
 {id:'levels',label:'Levels',ask:'How many floors would you like?',hint:'G+1 means ground plus one upper floor.',choices:['Ground only','G+1','G+2','G+3']},
 {id:'rooms',label:'Rooms',ask:'How many bedrooms and bathrooms?',hint:'Give the total across all floors. You can set sizes and room positions in the detailed form.',choices:['2 bed · 2 bath','3 bed · 2 bath','3 bed · 3 bath','4 bed · 4 bath']},
 {id:'style',label:'Architecture',ask:'Which regional style feels like home?',hint:'Choose any state, wherever the project is located.',choices:['Tamil Nadu contemporary','Kerala','Tamil Nadu','Goa','Rajasthan']},
 {id:'vastu',label:'Vastu',ask:'How closely should we follow Vastu?',hint:'Record specific placements in the form or in the final instructions.',choices:['Strict','Semi','None']},
 {id:'extras',label:'Final notes',ask:'Anything else you want us to know?',hint:'A second entrance, a shaded seat for parents, a particular view — tell us in your own words.',choices:['Nothing else']},
] as const;
export type Qid=typeof questions[number]['id'];
export function answerValue(id:Qid,r:Requirements):string{const d=designOf(r);switch(id){
 case 'name':return r.customerName;case 'location':return r.location;case 'plot':return d.plotMode==='polygon'?'Irregular · '+d.vertices.length+' corners':r.plotWidth+' × '+r.plotDepth+' ft';
 case 'road':return r.roadSide;case 'levels':return r.floors===1?'Ground only':'G+'+(r.floors-1);case 'rooms':return r.bedrooms+' bed · '+r.bathrooms+' bath';case 'style':return styleOptions.find(o=>o.id===d.style)?.label||d.style;case 'vastu':return d.vastuMode;case 'extras':return r.notes||'Nothing else';}}
export function applyAnswer(r:Requirements,id:Qid,input:string):{value?:Requirements;error?:string;custom?:boolean}{
 const txt=input.trim(),d=designOf(r),raw=txt.toLowerCase();if(!txt)return {error:'Choose an answer or type your own.'};
 let next={...r,design:{...d}},custom=false;
 if(txt.length>1750)return {error:'Keep this answer within 1,750 characters.'};
 if(id==='name'||id==='location'){if(txt.length>(id==='name'?160:200))return {error:'Please use a shorter name or location.'};if(id==='name')next.customerName=txt;else next.location=txt;}
 if(id==='plot'){
 if(d.plotMode==='polygon'&&txt===answerValue(id,r)){/* keep survey */}
 else if(/irregular|polygon/i.test(txt))custom=true;
 else {const m=raw.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet)?\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet)?$/);if(!m)custom=true;else{if(+m[1]<=0||+m[2]<=0||Math.max(+m[1],+m[2])>10000)return {error:'Enter positive dimensions up to 10,000 ft.'};next.plotWidth=+m[1];next.plotDepth=+m[2];next.design.plotMode='rectangle';}}}
 if(id==='road'){if(['north','east','south','west'].includes(raw))next.roadSide=raw as Direction;else custom=true;}
 if(id==='levels'){const m=raw.match(/^g\s*\+\s*(\d+)$/),n=raw==='ground only'?1:m?+m[1]+1:/^\d+(?: floors?)?$/.test(raw)?parseInt(raw):0;if(!n)custom=true;else if(n>100)return {error:'The maximum is 100 floors.'};else next.floors=n;}
 if(id==='rooms'){const m=raw.match(/^(\d+)\s*(?:bed(?:room)?s?)\s*(?:[·,/&]|and)?\s*(\d+)\s*bath(?:room)?s?$/);if(!m)custom=true;else if(Math.min(+m[1],+m[2])<1||Math.max(+m[1],+m[2])>100)return {error:'Use 1 to 100 rooms of each kind.'};else{next.bedrooms=+m[1];next.bathrooms=+m[2];}}
 if(id==='style'){const match=styleOptions.find(o=>o.label.toLowerCase()===raw||o.id===raw)||regions.find(o=>o.state.toLowerCase()===raw);if(match)Object.assign(next.design,chooseStyle(match.id));else custom=true;}
 if(id==='vastu'){if(raw==='none'||raw==='strict'||raw==='semi'){next.design.vastuMode=raw;next.vastu=raw==='strict'?'essential':raw==='semi'?'preferred':'none';}else custom=true;}
 if(id==='extras')next.notes=raw==='nothing else'?'':txt;
 // For unstructured requests preserve the exact wording for human review without silently changing dimensions.
 next.design.guideAnswers={...d.guideAnswers,[id]:custom?'review:'+txt:'confirmed'};
 return {value:next,custom};
}
