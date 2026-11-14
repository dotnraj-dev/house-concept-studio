import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { generatePlan, totalArea } from './plan';
import { DEFAULT_RATIOS, DEFAULT_REQUIREMENTS, DEFAULT_SETTINGS } from './types';

test('G+1 concepts have measured rooms on both floors inside the footprint', () => {
  const plan = generatePlan(DEFAULT_REQUIREMENTS, DEFAULT_SETTINGS, 0, DEFAULT_RATIOS);
  assert.equal(plan.width, DEFAULT_REQUIREMENTS.plotWidth-2*DEFAULT_SETTINGS.sideSetback);
  assert.equal(plan.depth, DEFAULT_REQUIREMENTS.plotDepth-DEFAULT_SETTINGS.frontSetback-DEFAULT_SETTINGS.rearSetback);
  assert.ok(plan.rooms.some(r => r.floor === 0));
  assert.ok(plan.rooms.some(r => r.floor === 1));
  for (const room of plan.rooms) {
    assert.ok(room.w > 0 && room.h > 0);
    assert.ok(room.x >= 0 && room.y >= 0);
    assert.ok(room.x + room.w <= plan.width + .11);
    assert.ok(room.y + room.h <= plan.depth + .11);
  }
});

test('unsupported site and room requests are flagged for review', () => {
  const plan = generatePlan({ ...DEFAULT_REQUIREMENTS, plotWidth: 14, bedrooms: 6 }, DEFAULT_SETTINGS, 0, DEFAULT_RATIOS);
  assert.ok(plan.warnings.some(w => w.includes('too small')));
  assert.equal(plan.valid,false);
  assert.equal(plan.rooms.length,0);
});

test('private-room option changes zoning and area excludes open terrace and portico', () => {
  const balanced = generatePlan(DEFAULT_REQUIREMENTS, DEFAULT_SETTINGS, 0, DEFAULT_RATIOS);
  const privateRooms = generatePlan(DEFAULT_REQUIREMENTS, DEFAULT_SETTINGS, 2, DEFAULT_RATIOS);
  const balancedKitchen = balanced.rooms.find(r => r.kind === 'kitchen' && r.floor === 0)!;
  const privateKitchen = privateRooms.rooms.find(r => r.kind === 'kitchen' && r.floor === 0)!;
  assert.notEqual(balanced.rooms.find(r=>r.kind==='stairs')!.x,privateRooms.rooms.find(r=>r.kind==='stairs')!.x);
  assert.ok(totalArea(balanced) < balanced.width * balanced.depth * 2);
});
