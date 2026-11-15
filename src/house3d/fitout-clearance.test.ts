import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePlan} from '../plan';
import {SHOWCASE_REQUIREMENTS} from '../showcase';
import {DEFAULT_RATIOS,DEFAULT_SETTINGS,designOf} from '../types';
import {fitoutOf} from '../fitout';
import {roomFitments,doorReservations,overlaps} from './fitout-layout';
import {makeHouseLayout,furnishingFrame} from './layout';
import {tvJoinery} from './interior-layout';
test('wall art never overlaps the TV display unit and refrigerators clear open kitchen entries',()=>{
 for(let v=0;v<3;v++){
  const d=designOf(SHOWCASE_REQUIREMENTS),p=generatePlan({...SHOWCASE_REQUIREMENTS,design:{...d,fitout:{...fitoutOf(d),openKitchen:true,prayerMode:'cabinet'}}},DEFAULT_SETTINGS,v,DEFAULT_RATIOS),l=makeHouseLayout(p);
  for(const r of p.rooms.filter(r=>['living','lounge'].includes(r.kind))){
   const frame=furnishingFrame(p,r),j=tvJoinery(frame.local),[x,z]=frame.transform(j.x,frame.local.y+.6),swap=Math.abs(Math.sin(frame.angle))>.5;
   for(const art of roomFitments(p,r,l).filter(f=>f.kind==='art'))assert.equal(overlaps(art,{x,z,w:swap?1.4:j.width+.2,d:swap?j.width+.2:1.4}),false,'TV must not cover the painting');
  }
  for(const r of p.rooms.filter(r=>r.kind==='kitchen')){
   const fridge=roomFitments(p,r,l).find(f=>f.kind==='fridge');assert.ok(fridge,'A showcase kitchen should have a fitted fridge');
   for(const opening of doorReservations(r,l))assert.equal(overlaps(fridge,opening),false,'Fridge must not block an open kitchen entry');
  }
 }
});

