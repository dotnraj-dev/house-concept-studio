import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_REQUIREMENTS, DEFAULT_SETTINGS, DEFAULT_RATIOS, type Project} from './types';
import {generatePlan} from './plan';
import {terraceLevel} from './terrace';
import {pdfFloors} from './plan-pdf';

const project = {id: 'p', title: 'Test house', requirements: {...DEFAULT_REQUIREMENTS}, paragraph: '', transcript: '', selectedVariant: 0, ratios: DEFAULT_RATIOS, status: 'draft', createdAt: '', updatedAt: '', ownerId: 'u'} as Project;

test('plan PDF lists every habitable floor once, then the terrace, with floor areas', () => {
  const plan = generatePlan(project.requirements, DEFAULT_SETTINGS, 0, DEFAULT_RATIOS);
  const floors = pdfFloors(plan, project);
  assert.equal(floors.at(-1)!.floor, terraceLevel(plan));
  assert.equal(floors.at(-1)!.label, 'Terrace');
  const habitable = floors.slice(0, -1);
  assert.deepEqual(habitable.map(f => f.floor), habitable.map((_, i) => i));
  assert.equal(habitable[0].label, 'Ground floor');
  for (const f of habitable) assert.ok(f.area > 0, `${f.label} has an area`);
});
