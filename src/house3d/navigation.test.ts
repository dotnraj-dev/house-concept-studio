import assert from 'node:assert/strict';
import test from 'node:test';
import {Vector3} from 'three';
import {generatePlan} from '../plan';
import {DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,DEFAULT_RATIOS,designOf,type Plan} from '../types';
import {collidesAt,FLOOR_HEIGHT,furnishingFrame,makeHouseLayout,type DoorSpec} from './layout';
import {doorBlocks,doorLeaf,doorTargetAngle} from './doors';
import {walkingSurface} from './navigation';
import {stairDimensions} from './stairs';

test('opened and partly opened door leaves remain solid at their actual animated angle',()=>{
  for(const axis of ['x','z'] as const)for(const swing of [-1,1]){
    const door:DoorSpec={id:'leaf',floor:0,x:8,z:10,axis,width:3.3,main:false,swing};
    for(const angle of [0,.4*swing,doorTargetAngle(door,true)]){
      // Transform a point on the rendered leaf with Three.js, independently of the collision helper.
      const point=new Vector3(axis==='x'?1.6:0,0,axis==='z'?1.6:0).applyAxisAngle(new Vector3(0,1,0),angle);
      point.add(new Vector3(door.x+(axis==='x'?.06:0),0,door.z+(axis==='z'?.06:0)));
      assert.equal(doorBlocks(door,angle,point.x,point.z,.3),true);
      assert.equal(doorBlocks(door,angle,point.x+5,point.z+5,.3),false);
    }
    const midpoint={x:door.x+(axis==='x'?door.width/2:0),z:door.z+(axis==='z'?door.width/2:0)};
    assert.equal(doorBlocks(door,doorTargetAngle(door,true),midpoint.x,midpoint.z,.3),false,'Open doorway must be usable');
  }
});

test('movement uses the animated door pose rather than its requested open state',()=>{
  const plan=generatePlan(DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
  const door:DoorSpec={id:'test-leaf',floor:0,x:5,z:5,axis:'x',width:3.3,main:false};
  const layout={walls:[],windows:[],doors:[door]},opened=new Set([door.id]);
  assert.equal(collidesAt(plan,layout,6.65,5,0,opened,.3,new Map([[door.id,0]])),true,'Toggling open does not instantly remove a still-closed leaf');
  assert.equal(collidesAt(plan,layout,6.65,5,0,opened,.3,new Map([[door.id,1.52]])),false);
  const leaf=doorLeaf(door,1.52);
  assert.equal(collidesAt(plan,layout,(leaf.x1+leaf.x2)/2,(leaf.z1+leaf.z2)/2,0,opened,.3,new Map([[door.id,1.52]])),true);
});

test('stair voids never become flat floors when the next stair position is unsafe',()=>{
  for(const facing of ['north','east','south','west'] as const){
    const req={...DEFAULT_REQUIREMENTS,floors:4,design:{...designOf(DEFAULT_REQUIREMENTS),houseFacing:facing,mainDoorFacing:facing}};
    const plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
    for(const room of plan.rooms.filter(r=>r.kind==='stairs'&&r.floor<3)){
      const frame=furnishingFrame(plan,room),local=frame.local,{front}=stairDimensions(local);
      const wrongFlight=frame.transform(local.x+local.w*.75,local.y+front+.25);
      if(room.floor===0)assert.equal(walkingSurface(plan,...wrongFlight,0,0),null,'Cannot walk on an imaginary floor below the upper flight');
      // On higher floors this position legitimately belongs to the descending flight below.
      const shaft=frame.transform(local.x+.1,local.y+front+1);
      assert.equal(walkingSurface(plan,...shaft,(room.floor+1)*FLOOR_HEIGHT,room.floor+1),null,'Cannot step through the stairwell perimeter');
    }
  }
});

test('the actual movement resolver supports continuous ascent and descent on four floors in every facing',()=>{
  for(const facing of ['north','east','south','west'] as const){
    const req={...DEFAULT_REQUIREMENTS,floors:4,design:{...designOf(DEFAULT_REQUIREMENTS),houseFacing:facing,mainDoorFacing:facing}};
    const plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
    for(const room of plan.rooms.filter(r=>r.kind==='stairs'&&r.floor<3)){
      const frame=furnishingFrame(plan,room),local=frame.local,{front,back}=stairDimensions(local),left=local.x+local.w*.25,right=local.x+local.w*.75;
      const path:[number,number][]=[];
      for(let z=.6;z<=back+.4;z+=.08)path.push(frame.transform(left,local.y+z));
      for(let x=left;x<=right;x+=.08)path.push(frame.transform(x,local.y+back+.4));
      for(let z=back+.4;z>=front-.4;z-=.08)path.push(frame.transform(right,local.y+z));
      let height=room.floor*FLOOR_HEIGHT,floor=room.floor;
      for(const route of [path,[...path].reverse()]){
        for(const [x,z] of route){
          const next=walkingSurface(plan,x,z,height,floor);
          assert.notEqual(next,null,`${facing} floor ${room.floor} blocked at ${x}, ${z}`);
          height=next!;
          const nearest=Math.round(height/FLOOR_HEIGHT);if(Math.abs(nearest*FLOOR_HEIGHT-height)<.65)floor=nearest;
        }
      }
      assert.equal(height,room.floor*FLOOR_HEIGHT);
    }
  }
});

test('ordinary floors remain walkable and cannot be entered from mid-flight at another elevation',()=>{
  const plan:Plan={rooms:[],width:20,depth:20,plotWidth:30,plotDepth:30,offsetX:3,offsetY:3,valid:true,roadSide:'north',toiletStyle:'western',pooja:false,warnings:[],variantName:'Test',levels:3};
  assert.equal(walkingSurface(plan,5,5,9,1),9);
  assert.equal(walkingSurface(plan,5,5,4.5,0),null);
});
