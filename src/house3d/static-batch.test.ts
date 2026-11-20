import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3} from 'three';
import {buildBatches, collectCandidates, materialSignature, sceneFingerprint} from './static-batch';

function scene() {
  const root = new Group(); root.name = 'HouseExport';
  const plaster = () => new MeshStandardMaterial({color: '#f2efe8', roughness: .8});
  for (let i = 0; i < 5; i++) { const m = new Mesh(new BoxGeometry(1, 1, 1), plaster()); m.position.set(i * 3, 0, 0); m.castShadow = true; root.add(m); }
  const stone = new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial({color: '#8a6b4f'})); root.add(stone);
  const stone2 = new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial({color: '#8a6b4f'})); stone2.position.y = 10; root.add(stone2);
  const glass = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({color: '#cde', transparent: true, opacity: .3})); root.add(glass);
  const door = new Group(); door.userData.actionId = 'door-1'; door.add(new Mesh(new BoxGeometry(1, 2, .1), plaster())); root.add(door);
  const hidden = new Mesh(new BoxGeometry(1, 1, 1), plaster()); hidden.visible = false; root.add(hidden);
  const fan = new Mesh(new BoxGeometry(1, .1, 1), plaster()); fan.userData.dynamic = true; root.add(fan);
  root.updateMatrixWorld(true);
  return root;
}

test('identical-looking materials share a signature; different colours do not', () => {
  const a = new MeshStandardMaterial({color: '#ffffff', roughness: .5});
  const b = new MeshStandardMaterial({color: '#ffffff', roughness: .5});
  const c = new MeshStandardMaterial({color: '#fffffe', roughness: .5});
  assert.equal(materialSignature(a), materialSignature(b));
  assert.notEqual(materialSignature(a), materialSignature(c));
});

test('only static, visible, opaque meshes outside doors and dynamic groups are batched', () => {
  const candidates = collectCandidates(scene());
  assert.equal(candidates.length, 7, 'five plaster boxes and two stone boxes');
  const {group, batched, drawCalls} = buildBatches(candidates);
  assert.equal(drawCalls, 2, 'one draw call per material look and shadow setting');
  assert.equal(batched.length, 7);
  assert.equal(group.userData.runtimeOnly, true, 'batches are never exported');
});

test('merged geometry keeps every original in its world position', () => {
  const {group} = buildBatches(collectCandidates(scene()));
  const plaster = group.children.find(m => (m as Mesh).castShadow) as Mesh;
  const box = plaster.geometry.boundingBox!;
  assert.ok(box.min.distanceTo(new Vector3(-.5, -.5, -.5)) < 1e-6);
  assert.ok(box.max.distanceTo(new Vector3(12.5, .5, .5)) < 1e-6);
  assert.equal(plaster.geometry.attributes.position.count, 5 * 24);
});

test('moving a batched mesh changes the fingerprint so batches rebuild', () => {
  const root = scene();
  const before = sceneFingerprint(collectCandidates(root));
  root.children[0].position.x += 1; root.updateMatrixWorld(true);
  assert.notEqual(sceneFingerprint(collectCandidates(root)), before);
});
