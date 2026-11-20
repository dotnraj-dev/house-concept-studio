import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_REQUIREMENTS,DEFAULT_DESIGN,DEFAULT_SETTINGS,DEFAULT_RATIOS,type Plan} from './types';
import {requirementsSchema} from './schemas';
import {generatePlan} from './plan';
import {furnitureObjects} from './house3d/furniture-objects';
import {addRoom,removeRoom,moveRoom,moveRooms,resizeRoom,renameRoom,changeKind,attachBathroom,detachBathroom,addDoor,removeDoor,moveDoor,resizeDoor,flipDoor,addWindow,removeWindow,moveWindow,resizeWindow,addObject,removeObject,moveObject,rotateObject,setFloor,undo,redo,emptyEdits,migrateEdits,applyPlanEdits} from './editor-model';

const plan:Plan={rooms:[{id:'bed-1',kind:'bedroom',label:'Bedroom',floor:0,x:0,y:0,w:12,h:12},{id:'bath-1',kind:'bathroom',label:'Bath',floor:0,x:12,y:0,w:7,h:8}],valid:true,width:25,depth:25,plotWidth:35,plotDepth:35,offsetX:5,offsetY:5,roadSide:'north',toiletStyle:'western',pooja:false,warnings:[],variantName:'Test',levels:2};
const edited=(e:ReturnType<typeof emptyEdits>)=>applyPlanEdits(plan,e);
test('room actions persist explicit overrides and undo/redo',()=>{
 let e=emptyEdits();e=addRoom(e,plan,'study',1,2,3,8,9);const id=Object.keys(e.data.rooms)[0];assert.equal(edited(e).rooms.at(-1)?.id,id);
 e=moveRoom(e,edited(e),id,4,5);e=resizeRoom(e,edited(e),id,4,5,10,9);e=renameRoom(e,edited(e),id,'Office');e=changeKind(e,edited(e),id,'store');e=setFloor(e,edited(e),id,0);
 assert.deepEqual(edited(e).rooms.find(r=>r.id===id),{id,kind:'store',label:'Office',floor:0,x:4,y:5,w:10,h:9,attachedTo:undefined});
 const saved=JSON.parse(JSON.stringify(e));assert.equal(edited(migrateEdits(saved)).rooms.find(r=>r.id===id)?.label,'Office');
 e=removeRoom(e,edited(e),id);assert.ok(!edited(e).rooms.some(r=>r.id===id));e=undo(e);assert.ok(edited(e).rooms.some(r=>r.id===id));e=redo(e);assert.ok(!edited(e).rooms.some(r=>r.id===id));
});
test('bathroom attachment follows drag and can be detached',()=>{
 let e=moveRoom(emptyEdits(),plan,'bath-1',11.75,0);assert.equal(edited(e).rooms.find(r=>r.id==='bath-1')?.attachedTo,'bed-1');
 assert.equal(edited(e).rooms.find(r=>r.id==='bath-1')?.x,12);
 e=moveRoom(e,edited(e),'bath-1',17,13);assert.equal(edited(e).rooms.find(r=>r.id==='bath-1')?.attachedTo,undefined);
 e=attachBathroom(e,edited(e),'bath-1','bed-1');assert.equal(edited(e).rooms.find(r=>r.id==='bath-1')?.attachedTo,'bed-1');
 e=detachBathroom(e,edited(e),'bath-1');assert.equal(edited(e).rooms.find(r=>r.id==='bath-1')?.attachedTo,undefined);
 assert.throws(()=>attachBathroom(e,edited(e),'bed-1','bath-1'));
});
test('multi-room movement is a single undoable change',()=>{
 const e=moveRooms(emptyEdits(),plan,['bed-1','bath-1'],1.25,2);
 assert.equal(e.past.length,1);assert.deepEqual(edited(e).rooms.map(r=>[r.x,r.y]),[[1.25,2],[13.25,2]]);
 assert.deepEqual(edited(undo(e)).rooms.map(r=>[r.x,r.y]),[[0,0],[12,0]]);
});
test('saved room override survives a style regeneration',()=>{
 const base=generatePlan(DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,0,DEFAULT_RATIOS),original=base.rooms.find(r=>r.kind==='bedroom')!;
 const edits=renameRoom(emptyEdits(),base,original.id,'Customer bedroom');
 for(const style of ['tn-contemporary','tn-jaali-stone']){
  const req={...DEFAULT_REQUIREMENTS,design:{...DEFAULT_DESIGN,style,editor:JSON.parse(JSON.stringify(edits))}};
  assert.equal(generatePlan(req,DEFAULT_SETTINGS,0,DEFAULT_RATIOS).rooms.find(r=>r.id===original.id)?.label,'Customer bedroom');
 }
});
test('opening and object actions keep stable IDs and transform data',()=>{
 const door={id:'door-permanent',floor:0,x:2,z:0,axis:'x' as const,width:3,main:false};
 const win={id:'window-permanent',floor:0,x:2,z:0,axis:'x' as const,width:4,outward:[0,-1] as [number,number],roomId:'bed-1'};
 const obj={id:'art-permanent',kind:'painting',label:'Painting',roomId:'bed-1',floor:0,x:3,y:3,w:2,h:.5,angle:0};
 let e=emptyEdits();e=addDoor(e,door);assert.equal(e.data.doors[door.id]?.id,door.id);e=moveDoor(e,door,3,0);assert.equal(e.data.doors[door.id]?.x,3);e=resizeDoor(e,e.data.doors[door.id]!,2.5);assert.equal(e.data.doors[door.id]?.width,2.5);e=flipDoor(e,e.data.doors[door.id]!);assert.equal(e.data.doors[door.id]?.swing,-1);
 e=addWindow(e,win);assert.equal(e.data.windows[win.id]?.id,win.id);e=moveWindow(e,win,12,2,'z',[1,0]);assert.deepEqual([e.data.windows[win.id]?.x,e.data.windows[win.id]?.z,e.data.windows[win.id]?.axis],[12,2,'z']);e=resizeWindow(e,e.data.windows[win.id]!,3);assert.equal(e.data.windows[win.id]?.width,3);
 e=addObject(e,obj);assert.equal(e.data.objects[obj.id]?.id,obj.id);e=moveObject(e,obj,5,5);assert.deepEqual([e.data.objects[obj.id]?.x,e.data.objects[obj.id]?.y],[5,5]);e=rotateObject(e,e.data.objects[obj.id]!,Math.PI/2);assert.equal(e.data.objects[obj.id]?.angle,Math.PI/2);
 e=removeObject(e,obj.id);e=removeWindow(e,win.id);e=removeDoor(e,door.id);assert.equal(e.data.objects[obj.id],null);assert.equal(e.data.windows[win.id],null);assert.equal(e.data.doors[door.id],null);
});
test('legacy projects migrate without overwriting design and schema saves edits',()=>{
 assert.deepEqual(migrateEdits(undefined),emptyEdits());
 const e=addRoom(emptyEdits(),plan,'living',0,1,1);
 const parsed=requirementsSchema.parse({...DEFAULT_REQUIREMENTS,design:{...DEFAULT_DESIGN,editor:e}});
 assert.equal(parsed.design?.editor?.past.length,1);
 assert.equal(applyPlanEdits(plan,migrateEdits(parsed.design?.editor)).rooms.length,3);
});
test('invalid measurements are rejected',()=>{
 assert.throws(()=>addRoom(emptyEdits(),plan,'study',0,0,0,-1,9));
 assert.throws(()=>resizeRoom(emptyEdits(),plan,'bed-1',0,0,0,10));
 assert.throws(()=>moveRoom(emptyEdits(),plan,'bed-1',Infinity,0));
 assert.throws(()=>addDoor(emptyEdits(),{id:'invalid',floor:0,x:0,z:0,axis:'x',width:0,main:false}));
 assert.throws(()=>addWindow(emptyEdits(),{id:'invalid',floor:0,x:0,z:0,axis:'x',width:4,outward:[0,-1],roomId:''}));
});
test('service marker move persists in the shared plan design',()=>{
 const service={id:'tank-1',type:'tank' as const,label:'Roof tank',x:8,y:9,level:1,capacity:1000,side:'north' as const,locked:false};
 const base={...plan,design:{...DEFAULT_DESIGN,services:[service]}};
 const marker={id:service.id,kind:'service',label:service.label,roomId:'',floor:1,x:8,y:9,w:1,h:1,angle:0};
 const e=moveObject(emptyEdits(),marker,12,13);
 assert.deepEqual(applyPlanEdits(base,e).design?.services[0],{...service,x:12,y:13});
 assert.equal(applyPlanEdits(base,undo(e)).design?.services[0].x,8);
});
test('generated furniture has stable IDs and follows move and remove overrides',()=>{
 const base=generatePlan(DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,0,DEFAULT_RATIOS),living=base.rooms.find(r=>r.kind==='living')!;
 const sofa=furnitureObjects(base,living).find(o=>o.kind==='sofa')!;
 assert.equal(sofa.id,`furniture-${living.id}-sofa`);
 const moved=applyPlanEdits(base,moveObject(emptyEdits(),sofa,sofa.x+1,sofa.y+.5));
 assert.equal(furnitureObjects(moved,living).find(o=>o.id===sofa.id)?.x,sofa.x+1);
 const removed=applyPlanEdits(base,removeObject(emptyEdits(),sofa.id));
 assert.ok(!furnitureObjects(removed,living).some(o=>o.id===sofa.id));
});
