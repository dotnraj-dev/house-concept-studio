import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3,Mesh} from 'three';
import {builtinModel,BUILTIN_CATEGORIES} from './builtins';
test('original furnishings have finite realistic dimensions and independent scene instances',()=>{for(const category of BUILTIN_CATEGORIES){const first=builtinModel(category)!,second=builtinModel(category)!;assert.notEqual(first,second);assert.ok(first.children.length>=3);const dims=new Box3().setFromObject(first).getSize(new Vector3());assert.ok(dims.x>.5&&dims.y>.2&&dims.z>.5);first.traverse(o=>{if((o as Mesh).isMesh){const mesh=o as Mesh;assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));}});}assert.equal(builtinModel('unsupported'),null);});
