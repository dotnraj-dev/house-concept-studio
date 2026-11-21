import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,DEFAULT_RATIOS,designOf,normalizeRequirements} from './types';
import {requirementsSchema} from './schemas';
import {generatePlan} from './plan';
import {externalStair,headroom,openTerraceDepth,pitchedRoof,roofTank,terraceChecks,terraceLevel} from './terrace';
import {makeHouseLayout} from './house3d/layout';
import {migrateEdits,moveObject} from './editor-model';
import {quotation} from './quote';
import {tnSite} from './tn-rules';

test('editor mode defaults to view only and survives project validation',()=>{
 const req=normalizeRequirements(DEFAULT_REQUIREMENTS);
 assert.equal(req.design?.editorEnabled,undefined);
 const parsed=requirementsSchema.parse({...req,design:{...designOf(req),editorEnabled:true}});
 assert.equal(parsed.design?.editorEnabled,true);
});
test('G+1 internal stair continues to a terrace and roof tank',()=>{
 const req=normalizeRequirements(DEFAULT_REQUIREMENTS),plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS),room=headroom(plan),tank=roofTank(plan);
 assert.equal(terraceLevel(plan),2);
 assert.ok(plan.rooms.some(r=>r.kind==='stairs'&&r.floor===1));
 assert.ok(room.w>=4&&room.h>=4);
 assert.equal(tank.level,2);
 assert.ok(!terraceChecks(plan).some(c=>c.id==='terrace-access-core'));
});
test('external side stair yields an independent first-floor entrance and quote unit count',()=>{
 const req=normalizeRequirements({...DEFAULT_REQUIREMENTS,plotWidth:55,plotDepth:70});
 req.design={...designOf(req),terrace:{stairLocation:'side',stairType:'dogleg',independentFloors:[1],tankMount:'slab',tankCapacity:1500},setbacks:{north:5,east:8,south:5,west:8},customSetbacks:true};
 const plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS),layout=makeHouseLayout(plan),stair=externalStair(plan);
 assert.ok(stair);
 assert.equal(plan.rooms.some(r=>r.kind==='stairs'),false);
 assert.ok(plan.rooms.some(r=>r.floor===1&&r.kind==='kitchen'));
 assert.ok(plan.rooms.some(r=>r.floor===1&&r.kind==='bathroom'));
 assert.ok(layout.doors.some(d=>d.floor===1&&d.unitEntrance));
 assert.equal(tnSite(req).dwellings,2);
 assert.equal(quotation(plan,req,{...DEFAULT_SETTINGS,costPerSqft:2000}).dwellings,2);
});
test('tank drag is stored as a B1 object edit and changes roof position',()=>{
 const req=normalizeRequirements(DEFAULT_REQUIREMENTS),plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS),tank=roofTank(plan);
 const object={id:tank.id,kind:'service',label:tank.label,roomId:'',floor:tank.level,x:tank.x,y:tank.y,w:1,h:1,angle:0};
 const edits=moveObject(migrateEdits(undefined),object,tank.x-3,tank.y-4);
 const moved=generatePlan({...req,design:{...designOf(req),editor:edits,terrace:{...designOf(req).terrace!,tankMount:'slab'}}},DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
 assert.equal(roofTank(moved).x,tank.x-3);
 assert.equal(roofTank(moved).y,tank.y-4);
 assert.equal(edits.past.at(-1)?.label,'Move '+tank.label);
});
test('a single-storey tiled bungalow retains a real stair and an open rear roof terrace',()=>{
 const req=normalizeRequirements({...DEFAULT_REQUIREMENTS,floors:1,plotWidth:45,plotDepth:65,bedrooms:1,bathrooms:1});
 req.design={...designOf(req),style:'tn-tiled-bungalow',roof:'kerala'};
 const plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
 assert.ok(plan.rooms.some(r=>r.kind==='stairs'&&r.floor===0));
 assert.equal(headroom(plan).floor,1);
 assert.equal(pitchedRoof(plan),true);
 assert.ok(openTerraceDepth(plan)>=10);
 assert.ok(!terraceChecks(plan).some(c=>c.id==='terrace-access-core'));
});
test('front, side and rear external stairs reserve setback space; spiral tread uses its walking line',()=>{
 for(const position of ['front','side','rear'] as const){
  const req=normalizeRequirements({...DEFAULT_REQUIREMENTS,plotWidth:70,plotDepth:90});
  req.design={...designOf(req),terrace:{stairLocation:position,stairType:'spiral',independentFloors:[],tankMount:'headroom',tankCapacity:1000}};
  const plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
  assert.ok(externalStair(plan));
  assert.ok(!terraceChecks(plan).some(c=>c.id==='terrace-external-setback'||c.id==='terrace-stair-geometry'),position);
 }
});
