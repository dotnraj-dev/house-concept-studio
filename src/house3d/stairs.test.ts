import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePlan } from '../plan';
import { DEFAULT_RATIOS, DEFAULT_REQUIREMENTS, DEFAULT_SETTINGS } from '../types';
import { FLOOR_HEIGHT } from './layout';
import { stairDimensions, stairSurface } from './stairs';

test('both stair flights and their turning landing can be walked up and down without a jump',()=>{
  for(let variant=0;variant<3;variant++){
    const plan=generatePlan(DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,variant,DEFAULT_RATIOS);
    const room=plan.rooms.find(item=>item.floor===0&&item.kind==='stairs')!;
    const {front,back}=stairDimensions(room);
    const left=room.x+room.w*.25,right=room.x+room.w*.75;
    const path:[number,number][]=[];
    for(let z=.6;z<=back+.4;z+=.08)path.push([left,room.y+z]);
    for(let x=left;x<=right;x+=.08)path.push([x,room.y+back+.4]);
    for(let z=back+.4;z>=front-.4;z-=.08)path.push([right,room.y+z]);
    let height=0;
    for(const [x,z] of path){
      const next=stairSurface(room,x,z,height);
      assert.notEqual(next,null,`Blocked ascending route in variant ${variant}`);
      height=next!;
    }
    assert.equal(height,FLOOR_HEIGHT);
    for(const [x,z] of [...path].reverse()){
      const next=stairSurface(room,x,z,height);
      assert.notEqual(next,null,`Blocked descending route in variant ${variant}`);
      height=next!;
    }
    assert.equal(height,0);
    assert.equal(stairSurface(room,right,room.y+front+.2,0),null,'Cannot enter the top flight from ground level');
    assert.equal(stairSurface(room,left,room.y+front+.2,FLOOR_HEIGHT),null,'Upper guard prevents stepping into the lower flight');
  }
});
