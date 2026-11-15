import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePlan } from '../plan';
import { DEFAULT_RATIOS, DEFAULT_REQUIREMENTS, DEFAULT_SETTINGS } from '../types';
import { collidesAt, makeHouseLayout, makeInteractions, shelfSpot } from './layout';

test('house scene includes stacked levels, entrance, windows, and interactable furniture',()=>{
  const plan=generatePlan(DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
  const layout=makeHouseLayout(plan);
  const actions=makeInteractions(plan,layout);
  assert.ok(layout.walls.some(wall=>wall.floor===0));
  assert.ok(layout.walls.some(wall=>wall.floor===1));
  assert.ok(layout.doors.some(door=>door.main));
  assert.ok(layout.windows.length>=4);
  assert.ok(actions.some(action=>action.action==='seat'));
  assert.ok(actions.some(action=>action.action==='window'));
  assert.ok(actions.some(action=>action.action==='chimney'));
  assert.ok(actions.some(action=>action.action==='stairs'&&action.floor===1));
});

test('closed entrance blocks movement, and opening it clears the doorway',()=>{
  const plan=generatePlan(DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
  const layout=makeHouseLayout(plan);
  const door=layout.doors.find(item=>item.main)!;
  const center=door.x+door.width/2;
  assert.equal(collidesAt(plan,layout,center,door.z,0,new Set()),true);
  assert.equal(collidesAt(plan,layout,center,door.z,0,new Set([door.id])),false);
});

test('ground and upper stairs align in each concept variant',()=>{
  for(let variant=0;variant<3;variant++){
    const plan=generatePlan(DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,variant,DEFAULT_RATIOS);
    const ground=plan.rooms.find(room=>room.floor===0&&room.kind==='stairs')!;
    const upper=plan.rooms.find(room=>room.floor===1&&room.kind==='stairs')!;
    assert.equal(ground.x,upper.x);
    assert.equal(ground.y,upper.y);
  }
});

test('furniture clears doors, stairs enter through the landing, and no inaccessible balconies are invented',()=>{
 for(let variant=0;variant<3;variant++){
  const plan=generatePlan(DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,variant,DEFAULT_RATIOS),layout=makeHouseLayout(plan),items=makeInteractions(plan,layout);
  for(const balcony of plan.rooms.filter(r=>r.kind==='terrace'))assert.ok(layout.doors.some(d=>d.balcony&&d.rooms?.includes(balcony.id)),'Balcony lacks an access door');
  for(const item of items.filter(i=>['tv','shelf'].includes(i.action)&&i.y-i.size[1]/2<7))for(const d of layout.doors.filter(d=>d.floor===item.floor)){
   const dx=Math.abs(item.x-(d.x+(d.axis==='x'?d.width/2:0))),dz=Math.abs(item.z-(d.z+(d.axis==='z'?d.width/2:0)));
   assert.ok(dx>(item.size[0]+(d.axis==='x'?d.width:.28))/2||dz>(item.size[2]+(d.axis==='z'?d.width:.28))/2,'Furniture overlaps '+d.id);
  }
  for(const r of plan.rooms.filter(r=>r.kind==='stairs')){const opening=layout.doors.find(d=>d.rooms?.includes(r.id));assert.ok(opening);assert.ok(opening.z>=r.y&&opening.z+opening.width<=r.y+4.01);assert.equal(opening.arch,true);}
 }
});
