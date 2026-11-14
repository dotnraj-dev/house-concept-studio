import assert from 'node:assert/strict';
import test from 'node:test';
import {Group} from 'three';
import {builtinModel} from './builtins';
import {modelFit} from './model-fit';
test('model fitting is stable after mounting, rotating and re-rendering furniture in a room',()=>{
 for(const category of ['basin','toilet','bed','coffee','plant']){
  const model=builtinModel(category)!,size:[number,number,number]=[1.85,2.85,1.5],before=modelFit(model,size),holder=new Group(),room=new Group();
  model.position.set(...before.offset);holder.scale.set(...before.scale);holder.add(model);room.position.set(19,9,30);room.rotation.y=Math.PI/2;room.add(holder);room.updateMatrixWorld(true);
  assert.deepEqual(modelFit(model,size),before,category+' changed after mounting');
  const after=modelFit(model,[3,4,2]);assert.ok(after.scale.every(Number.isFinite));assert.deepEqual(after.offset,before.offset);
 }
});
