import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3,PerspectiveCamera} from 'three';
import {generatePlan} from '../plan';
import {DEFAULT_SETTINGS,DEFAULT_RATIOS,normalizeRequirements} from '../types';
import {chooseStyle,palette} from '../regions';
import {windowDesignFor,fitoutOf} from '../fitout';
import {FLOOR_HEIGHT,GROUND_LEVEL} from '../building-dimensions';
import {makeHouseLayout} from './layout';
import {frontElevationPose} from './camera-presets';
import {FACADE_STYLES} from './facade-styles';
import {exteriorLighting} from './exterior-lighting';
import {buildStreetscape,streetscapeStats} from './streetscape';
import {outsideLot,plotEdges} from '../site-context';
const project=JSON.parse(readFileSync('docs/screenshots/facade/demo-project.json','utf8'));
function sample(style:string,roadSide:'north'|'east'|'south'|'west'='north'){
 return generatePlan(normalizeRequirements({...project.requirements,roadSide,design:{...project.requirements.design,...chooseStyle(style),houseFacing:roadSide,mainDoorFacing:roadSide}}),DEFAULT_SETTINGS,0,DEFAULT_RATIOS);
}
test('road-facing photographic preset rotates in feet and retains the old plan geometry',()=>{
 for(const facing of ['north','east','south','west'] as const){
  const plan=sample(FACADE_STYLES[0].id,facing),pose=frontElevationPose(plan,1.25);
  assert.equal(pose.position[1],GROUND_LEVEL+5.5);
  const camera=new PerspectiveCamera(pose.fov,1.25,.05,400);camera.position.set(...pose.position);camera.lookAt(...pose.look);camera.updateMatrixWorld(true);
  const center=new Vector3(...pose.look).project(camera);assert.ok(Math.abs(center.x)<.00001&&Math.abs(center.y)<.00001);
  const dx=pose.position[0]-pose.look[0],dz=pose.position[2]-pose.look[2];
  const ratio=facing==='north'||facing==='south'?Math.abs(dx/dz):Math.abs(dz/dx);
  assert.ok(Math.abs(Math.atan(ratio)*180/Math.PI-15)<.001);
 }
 const baseline=sample('tn-contemporary').rooms;
 for(const style of FACADE_STYLES)assert.deepEqual(sample(style.id).rooms,baseline,'Facade style must not change any room or floor');
});
test('style window families preserve overrides and keep real privacy holes high and small',()=>{
 for(const style of FACADE_STYLES){
  const plan=sample(style.id),layout=makeHouseLayout(plan);
  for(const w of layout.windows){
   const owner=plan.rooms.find(r=>r.id===w.roomId)!;
   if(owner.kind==='bathroom'){assert.equal(w.style,'louvred');assert.ok(w.sill!>=5.8&&w.height!<=1.5&&w.width<=4);}
   else assert.equal(w.style,style.window);
   // Actual wall pieces must leave the widened glazing aperture empty.
   for(const wall of layout.walls.filter(p=>p.floor===w.floor&&p.rooms?.includes(owner.id))){
    const axis=w.axis==='x',lo=axis?w.x:w.z,hi=lo+w.width,a=axis?wall.x:wall.z,b=a+(axis?wall.w:wall.d);
    const onLine=axis?Math.abs(wall.z-w.z)<.3:Math.abs(wall.x-w.x)<.3;
    if(onLine&&wall.bottom<w.sill!+w.height!-.05&&wall.bottom+wall.height>w.sill!+.05)assert.ok(b<=lo+.01||a>=hi-.01);
   }
  }
  const room=plan.rooms.find(r=>r.kind==='living')!;
  plan.design!.fitout={...fitoutOf(plan.design),rooms:{[room.id]:{window:'casement'}}};
  assert.equal(windowDesignFor(plan,room),'casement');
 }
});
test('recipes own neutral exterior colours and distinct switchable lighting',()=>{
 assert.deepEqual(FACADE_STYLES.map(s=>exteriorLighting('recipe',s.id).label),['Golden hour','Clear daylight','Sunset','Clear daylight','Dusk · warm house lights']);
 for(const s of FACADE_STYLES){assert.equal(palette(s.id).wall,s.wall);assert.notEqual(s.frame,s.trim);assert.ok(exteriorLighting('day',s.id).sun>0);}
});
test('instanced botanical streetscape has bounded draw calls and no missing scenery families',()=>{
 const model=buildStreetscape(sample('tn-jaali-stone')),stats=streetscapeStats(model.root);
 assert.ok(stats.drawCalls<45);assert.ok(stats.triangles<130000,JSON.stringify(stats));
 for(const term of ['coconut','rain-tree','frangipani','neighbours','kerb','footpath','silhouettes']){
  let found=false;model.root.traverse(o=>{if(o.name.toLowerCase().includes(term))found=true;});assert.ok(found,'Missing '+term);
 }
 assert.equal(model.root.userData.illustrative,true);
 for(const corners of model.root.userData.illustrativeNeighbourFootprints)assert.ok(outsideLot(corners,plotEdges(sample('tn-jaali-stone'))));
 model.dispose();
});
test('illustrative neighbours remain outside a wide plot with unequal setbacks',()=>{
 const req=normalizeRequirements({...project.requirements,plotWidth:95,plotDepth:70,design:{...project.requirements.design,customSetbacks:true,setbacks:{north:8,south:20,west:14,east:6}}}),plan=generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS),model=buildStreetscape(plan);
 assert.ok(plan.offsetX>=14);assert.equal(model.root.userData.illustrativeNeighbourFootprints.length,2);
 for(const corners of model.root.userData.illustrativeNeighbourFootprints)assert.ok(outsideLot(corners,plotEdges(plan)));
 model.dispose();
});
