import test from 'node:test';
import assert from 'node:assert/strict';
import {SHOWCASE_REQUIREMENTS} from './showcase';
import {DEFAULT_RATIOS,DEFAULT_SETTINGS} from './types';
import {generatePlan} from './plan';
test('the hosted showcase has three bedrooms on two levels and no unresolved geometry conflict',()=>{
  const plan=generatePlan(SHOWCASE_REQUIREMENTS,DEFAULT_SETTINGS,1,DEFAULT_RATIOS);
  assert.equal(plan.valid,true);assert.equal(plan.levels,2);
  assert.equal(plan.rooms.filter(room=>room.kind==='bedroom').length,3);
  assert.deepEqual(plan.checks?.filter(check=>check.status==='conflict'),[]);
});
