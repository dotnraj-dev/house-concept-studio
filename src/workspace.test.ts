import test from 'node:test';
import assert from 'node:assert/strict';
import {deviceClass,panelPrefs,readDevice,saveDevice} from './workspace-state';
import {headingDegrees,facingLabel,compassRotation} from './house3d/compass';
import {nextQuality,QUALITY,qualityChoice} from './house3d/viewer-quality';
import {makeHouseLayout,entrancePose} from './house3d/layout';
import {generatePlan} from './plan';
import {DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,DEFAULT_RATIOS,designOf,type Direction} from './types';
test('workspace breakpoints and stored sizes are bounded and device-specific',()=>{
 assert.equal(deviceClass(1440),'desktop');assert.equal(deviceClass(1280),'desktop');
 for(const w of [768,820,1180,1279])assert.equal(deviceClass(w),'tablet');
 assert.equal(deviceClass(390),'phone');assert.equal(deviceClass(767),'phone');
 assert.deepEqual(panelPrefs({left:-4,right:500,dock:null,sheet:Infinity,leftOpen:false}).left,190);
 assert.equal(panelPrefs({right:500}).right,420);assert.equal(panelPrefs({sheet:Infinity}).sheet,360);
 assert.equal(readDevice('not-present','phone',42),42);assert.doesNotThrow(()=>saveDevice('not-present','phone',42));
});
test('true north bearings agree with all four actual generated entrance outward normals',()=>{
 for(const facing of ['north','east','south','west'] as Direction[]){
  const req={...DEFAULT_REQUIREMENTS,plotWidth:40,plotDepth:60,roadSide:facing,vastu:'none' as const,design:{...designOf(DEFAULT_REQUIREMENTS),houseFacing:facing,mainDoorFacing:facing,vastuMode:'none' as const}};
  const plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS),layout=makeHouseLayout(plan),door=layout.doors.find(d=>d.main);
  assert.ok(door);const {n}=entrancePose(plan,layout);
  assert.equal(facingLabel(headingDegrees(n[0],n[1])),facing[0].toUpperCase());
 }
});
test('compass rotates exactly 90 degrees and handles all intermediate headings',()=>{
 assert.equal(headingDegrees(0,-1),0);assert.equal(headingDegrees(1,0),90);assert.equal(headingDegrees(0,1),180);assert.equal(headingDegrees(-1,0),270);
 assert.equal(compassRotation(90)-compassRotation(0),-90);
 assert.equal(facingLabel(45),'NE');assert.equal(facingLabel(359),'N');assert.equal(facingLabel(-90),'W');
});
test('automatic quality reduces rendering cost only and respects manual choices',()=>{
 assert.equal(nextQuality('high',18),'balanced');assert.equal(nextQuality('balanced',30),'low');
 assert.equal(nextQuality('low',14),'low');assert.equal(nextQuality('high',45),'high');
 assert.equal(qualityChoice('broken'),'auto');assert.equal(qualityChoice('high'),'high');
 assert.ok(QUALITY.low.dpr<QUALITY.balanced.dpr&&QUALITY.balanced.dpr<QUALITY.high.dpr);
 assert.equal(QUALITY.high.ssao,true);assert.equal(QUALITY.balanced.reflections,false);assert.equal(QUALITY.low.shadow,512);assert.equal(QUALITY.low.distant,false);
});
