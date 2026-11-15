import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePlan} from '../plan';
import {SHOWCASE_REQUIREMENTS} from '../showcase';
import {DEFAULT_RATIOS,DEFAULT_SETTINGS} from '../types';
import {makeHouseLayout,furnishingFrame} from './layout';
import {bathroomFixtures} from './bathroom';
import {tvJoinery,showerZone} from './interior-layout';
test('showers fit inside attached bathrooms without covering sanitary fittings or door swings',()=>{
 const p=generatePlan(SHOWCASE_REQUIREMENTS,DEFAULT_SETTINGS,1,DEFAULT_RATIOS),layout=makeHouseLayout(p);
 for(const room of p.rooms.filter(r=>r.kind==='bathroom')){
  const s=showerZone(room,layout);assert.ok(s,'showcase bathrooms should have a shower');
  assert.ok(s.x-s.w/2>room.x&&s.x+s.w/2<room.x+room.w);assert.ok(s.z-s.d/2>room.y&&s.z+s.d/2<room.y+room.h);
  for(const f of bathroomFixtures(room,layout))assert.ok(Math.abs(s.x-f.x)>=(s.w+f.w)/2+.11||Math.abs(s.z-f.z)>=(s.d+f.d)/2+.11);
  for(const d of layout.doors.filter(d=>d.rooms?.includes(room.id)))assert.ok(Math.hypot(Math.max(0,Math.abs(d.x-s.x)-s.w/2),Math.max(0,Math.abs(d.z-s.z)-s.d/2))>=d.width+.19);
 }
});
test('TV storage stays within the selected solid feature wall',()=>{
 const p=generatePlan(SHOWCASE_REQUIREMENTS,DEFAULT_SETTINGS,1,DEFAULT_RATIOS);
 for(const r of p.rooms.filter(r=>['living','lounge'].includes(r.kind))){const local=furnishingFrame(p,r).local,j=tvJoinery(local);assert.ok(j.width<=local.featureWidth!);assert.ok(j.x-j.width/2>=local.x);assert.ok(j.x+j.width/2<=local.x+local.w);}
 const j=tvJoinery({id:'small',kind:'living',label:'small',floor:0,x:0,y:0,w:12,h:12,featureWidth:3.9,featureX:6});assert.equal(j.showcase,false);
});

