import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,BoxGeometry,Group,Mesh,MeshStandardMaterial,Vector3} from 'three';
import {FEET_TO_METRES,packedMetalRoughPixels,prepareExport} from './export';

test('export has physical metre dimensions and leaves the live scene intact',()=>{
  const root=new Group();root.position.set(-10,0,-15);
  const material=new MeshStandardMaterial({roughness:.7}),house=new Mesh(new BoxGeometry(20,18,30),material);house.position.set(10,9,15);root.add(house);
  const marker=new Mesh(new BoxGeometry(100,100,100),material);marker.userData.interactionId='test';root.add(marker);
  const exported=prepareExport(root),size=new Box3().setFromObject(exported.root).getSize(new Vector3());
  assert.ok(Math.abs(size.y-18*FEET_TO_METRES)<1e-6);
  assert.ok(Math.abs(size.x-20*FEET_TO_METRES)<1e-6);
  assert.equal(exported.root.children.length,1);
  assert.equal(root.children.length,2);assert.equal(root.scale.x,1);
  assert.notEqual((exported.root.children[0] as Mesh).material,material);
  assert.equal(exported.root.userData.hcsUnits,'metres');
  exported.dispose();
});
test('roughness packing preserves roughness and does not invent metallic surfaces',()=>{
  const rough=new Uint8ClampedArray([12,88,9,255,0,220,0,255]);
  assert.deepEqual([...packedMetalRoughPixels(rough)],[0,88,255,255,0,220,255,255]);
  assert.deepEqual([...packedMetalRoughPixels(rough,new Uint8ClampedArray([0,0,17,255,0,0,31,255]))],[0,88,17,255,0,220,31,255]);
});
