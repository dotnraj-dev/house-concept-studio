import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Raycaster,Vector3,Box3,InstancedMesh,Mesh,MeshStandardMaterial,Group,Matrix4,BoxGeometry,Color} from 'three';
import {generatePlan} from '../plan';
import {normalizeRequirements,DEFAULT_REQUIREMENTS,DEFAULT_DESIGN,DEFAULT_SETTINGS,DEFAULT_RATIOS} from '../types';
import {chooseStyle,styleOptions,regions} from '../regions';
import {FACADE_STYLES,recipeFor} from './facade-styles';
import {makeHouseLayout} from './layout';
import {faceContext,subtract,intersects} from './facade-kit/layout';
import {buildFacade} from './facade-kit/build';
import {prepareExport,FEET_TO_METRES} from './export';
const sample=(style:string,facing:'north'|'east'|'south'|'west'='north')=>generatePlan(normalizeRequirements({...DEFAULT_REQUIREMENTS,plotWidth:30,plotDepth:50,floors:2,bedrooms:2,bathrooms:2,pooja:false,utility:false,vastu:'none',roadSide:facing,design:{...DEFAULT_DESIGN,...chooseStyle(style),houseFacing:facing,mainDoorFacing:facing,vastuMode:'none'}}),DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
test('five TN recipes lead the dropdown and preserve all existing state choices',()=>{
 assert.deepEqual(styleOptions.slice(0,5).map(s=>s.id),FACADE_STYLES.map(s=>s.id));
 for(const r of regions)assert.ok(styleOptions.some(s=>s.id===r.id));
 assert.equal(chooseStyle('tn-tiled-bungalow').roof,'terracotta');
 for(const width of [16,24,40])for(const s of FACADE_STYLES){const r=recipeFor(s.id,width,2);assert.ok(r.projection>=.75&&r.projection<=1.5);}
});
test('clipping preserves area and cannot leave fragments crossing an opening',()=>{
 const rect={u:0,v:0,w:12,h:10},cuts=[{u:2,v:0,w:3,h:7},{u:7,v:3,w:4,h:4}],pieces=subtract(rect,cuts);
 assert.equal(pieces.reduce((a,p)=>a+p.w*p.h,0),120-21-16);
 for(const p of pieces)for(const cut of cuts)assert.equal(intersects(p,cut),false);
});
test('all five facade kits leave doors and windows clear on every elevation and road facing',()=>{
 for(const facing of ['north','east','south','west'] as const)for(const s of FACADE_STYLES){
  const plan=sample(s.id,facing),layout=makeHouseLayout(plan),c=faceContext(plan,layout),kit=buildFacade(plan,layout);kit.root.updateMatrixWorld(true);
  assert.equal(c.facing,facing);
  for(const elevation of ['north','east','south','west'] as const){const face=faceContext(plan,layout,elevation);
  for(const o of face.openings.filter(o=>['door','window'].includes(o.kind)))for(const x of [.08,.5,.92])for(const y of [.08,.5,.92]){
   const origin=new Vector3(...face.at(o.u+o.w*x,o.v+o.h*y,2)),toward=new Vector3(...face.at(o.u+o.w*x,o.v+o.h*y,-.2));
   const ray=new Raycaster(origin,toward.sub(origin).normalize(),0,2.15),hits=ray.intersectObject(kit.root,true);
   assert.equal(hits.length,0,s.id+'/'+facing+'/'+elevation+' covered '+o.id+' at '+x+','+y+' by '+hits[0]?.object.name);
  }
  }
  let instanced=0;kit.root.traverse(o=>{if((o as InstancedMesh).isInstancedMesh)instanced++;});assert.ok(instanced>0);
  const bounds=new Box3().setFromObject(kit.root);assert.ok(Number.isFinite(bounds.max.y));assert.ok(bounds.max.y>20);
  kit.dispose();
 }
});
test('new jaali assets are three distinct square RGBA PNG masks',()=>{
 const hashes=new Set<string>();for(const name of ['star','cross','flower']){const b=readFileSync('public/assets/materials/jaali-'+name+'.png');assert.equal(b.subarray(1,4).toString(),'PNG');assert.equal(b.readUInt32BE(16),1024);assert.equal(b[25],6);hashes.add(b.toString('base64'));}assert.equal(hashes.size,3);
});
test('GLB preparation expands live instances without losing transforms, colours or alpha-cut materials',()=>{
 const root=new Group(),material=new MeshStandardMaterial({color:'#ffffff',alphaTest:.5}),inst=new InstancedMesh(new BoxGeometry(1,2,1),material,2);inst.name='Facade test fins';inst.position.set(4,0,0);
 inst.setMatrixAt(0,new Matrix4().makeTranslation(1,2,0));inst.setMatrixAt(1,new Matrix4().makeTranslation(4,2,0));inst.setColorAt(0,new Color('#ff0000'));inst.setColorAt(1,new Color('#00ff00'));inst.visible=false;root.add(inst);
 const before=new Box3().setFromObject(root),exported=prepareExport(root);let count=0;exported.root.traverse(o=>{assert.equal((o as InstancedMesh).isInstancedMesh||false,false);if((o as Mesh).isMesh){count++;assert.equal(((o as Mesh).material as MeshStandardMaterial).alphaTest,.5);}});assert.equal(count,2);assert.equal(root.children[0],inst);
 assert.equal(exported.root.children[0].visible,false,'Hidden live instances must stay hidden in onlyVisible exports');
 const after=new Box3().setFromObject(exported.root);assert.ok(Math.abs(after.max.x-before.max.x*FEET_TO_METRES)<.00001);assert.ok(Math.abs(after.min.y-before.min.y*FEET_TO_METRES)<.00001);
 const meshes:Mesh[]=[];exported.root.traverse(o=>{if((o as Mesh).isMesh)meshes.push(o as Mesh);});assert.ok((meshes[0].material as MeshStandardMaterial).color.r>.9);assert.ok((meshes[1].material as MeshStandardMaterial).color.g>.9);
 exported.dispose();inst.geometry.dispose();material.dispose();
});
