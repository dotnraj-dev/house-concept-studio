import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePlan} from '../plan';
import {DEFAULT_REQUIREMENTS,DEFAULT_RATIOS,DEFAULT_SETTINGS,designOf} from '../types';
import {makeHouseLayout} from './layout';
import {facadePieces} from './facade';
test('facade details follow the real entrance and window positions in every facing',()=>{
  for(const facing of ['north','east','south','west'] as const){
    const req={...DEFAULT_REQUIREMENTS,design:{...designOf(DEFAULT_REQUIREMENTS),houseFacing:facing,mainDoorFacing:facing}};
    const plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS),layout=makeHouseLayout(plan),pieces=facadePieces(plan,layout);
    const canopy=pieces.find(p=>p.id==='entrance-canopy')!,door=layout.doors.find(d=>d.main)!;
    assert.ok(canopy);assert.ok(canopy.position[1]-canopy.size[1]/2>7);
    if(facing==='north')assert.ok(canopy.position[2]<door.z);
    if(facing==='south')assert.ok(canopy.position[2]>door.z);
    if(facing==='east')assert.ok(canopy.position[0]>door.x);
    if(facing==='west')assert.ok(canopy.position[0]<door.x);
    assert.equal(pieces.filter(p=>p.id.endsWith('-chajja')).length,layout.windows.length);
    for(const piece of pieces)assert.ok([...piece.position,...piece.size].every(Number.isFinite));
  }
});
