import assert from 'node:assert/strict';
import test from 'node:test';
import {generatePlan} from '../plan';
import {DEFAULT_SETTINGS,DEFAULT_RATIOS,designOf,normalizeRequirements} from '../types';
import {SHOWCASE_REQUIREMENTS as req} from '../showcase';
import {makeHouseLayout} from './layout';
import {bathroomFixtures} from './bathroom';
import {surroundings,defaultSite} from '../site-context';
import {sunPosition,windPaths} from './climate';
import {chooseStyle,regions,palette} from '../regions';
import {applyAnswer,answerValue} from '../guide';
import {requirementsSchema} from '../schemas';
const plan=generatePlan(req,DEFAULT_SETTINGS,1,DEFAULT_RATIOS),layout=makeHouseLayout(plan);
test('wardrobe-sized mirror and sanitary fixtures stay on a real wall and clear the door envelope',()=>{
 for(const room of plan.rooms.filter(r=>r.kind==='bathroom')){
 const fixtures=bathroomFixtures(room,layout);assert.equal(fixtures.length,2,room.id);
 for(const f of fixtures){const margins=[f.x-f.w/2-room.x,room.x+room.w-f.x-f.w/2,f.z-f.d/2-room.y,room.y+room.h-f.z-f.d/2];assert.ok(margins.every(m=>m>=.14));assert.ok(Math.min(...margins)<.18);for(const d of layout.doors.filter(d=>d.rooms?.includes(room.id)))assert.ok(Math.hypot(Math.max(0,Math.abs(d.x-f.x)-f.w/2),Math.max(0,Math.abs(d.z-f.z)-f.d/2))>d.width);}
 }});
test('sun direction in Chennai is east in the morning, west in the evening and below the horizon at midnight',()=>{
 const am=sunPosition('2026-03-20',8,13.08,80.27),pm=sunPosition('2026-03-20',16,13.08,80.27);assert.ok(am.direction[0]>.3&&pm.direction[0]<-.3);assert.ok(am.daylight&&pm.daylight);assert.equal(sunPosition('2026-03-20',0,13,80).daylight,false);
 assert.ok(sunPosition('2026-06-21',12,13,80).direction[2]<0);
});
test('airflow cannot cross a closed partition, even with openings on opposite facades',()=>{
 const mock={...plan,rooms:[{id:'a',kind:'living' as const,label:'A',x:0,y:0,w:6,h:6,floor:0},{id:'b',kind:'living' as const,label:'B',x:0,y:6,w:6,h:6,floor:0}]};
 const custom:typeof layout={walls:[],doors:[{id:'link',x:2,z:6,width:3,axis:'x',main:false,rooms:['a','b'],floor:0}],windows:[{id:'in',x:2,z:0,width:2,axis:'x',floor:0,roomId:'a',outward:[0,-1]},{id:'out',x:2,z:12,width:2,axis:'x',floor:0,roomId:'b',outward:[0,1]}]};
 assert.equal(windPaths(mock,custom,'north',0,new Set()).length,0);const a=windPaths(mock,custom,'north',0,new Set(['link']));assert.equal(a.length,1);assert.equal(a[0][2][2],6);assert.equal(windPaths(mock,custom,'east',0,new Set(['link'])).length,0);
});
test('clockwise and counterclockwise site edges place observations beyond the property',()=>{
 const edges=surroundings(plan);assert.ok(edges.every(e=>!e.blocked));const edge=edges.find(e=>e.use==='road')!;assert.ok(edge.z< -plan.offsetY);const site={...defaultSite,edges:[{edge:edge.edge,use:'road' as const,width:20,depth:30,height:10,along:.5,gap:3}]};const other=surroundings({...plan,design:{...plan.design!,siteContext:site}}).find(e=>e.edge===edge.edge)!;assert.equal(other.depth,30);assert.equal(other.observed,true);
 const rev={...plan,site:{...plan.site!,polygon:plan.site!.polygon.slice().reverse()}};assert.ok(surroundings(rev).every(e=>!e.blocked));
});
test('all 28 presets are selectable independently of the site; legacy styles remain usable',()=>{assert.equal(new Set(regions.map(r=>r.state)).size,28);for(const r of regions){const a=applyAnswer(req,'style',r.state);assert.equal(a.value?.design?.style,r.id);assert.equal(a.value?.location,req.location);assert.equal(requirementsSchema.safeParse(a.value).success,true);}assert.ok(palette('kerala-traditional').pitch>0);assert.equal(chooseStyle('state-rajasthan').roof,'flat');});
test('guide edits persist through the production schema and manual form edits update the recap',()=>{let r=normalizeRequirements(req);
 r=applyAnswer(r,'rooms','4 bedrooms and 3 bathrooms').value!;assert.equal(r.bedrooms,4);
 r=applyAnswer(r,'levels','G+3').value!;assert.equal(r.floors,4);
 r=applyAnswer(r,'road','North east corner').value!;assert.equal(r.roadSide,req.roadSide);assert.equal(designOf(r).guideAnswers?.road,'review:North east corner');
 r=applyAnswer(r,'extras','Keep a bench near the side gate').value!;assert.equal(answerValue('rooms',{...r,bedrooms:5}),'5 bed · 3 bath');assert.equal(requirementsSchema.safeParse(r).success,true);
});
