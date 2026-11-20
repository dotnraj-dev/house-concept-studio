import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,DEFAULT_RATIOS,type Plan} from './types';
import {generatePlan} from './plan';
import {applyPlanEdits,emptyEdits,migrateEdits,redo,setRoomInterior,undo} from './editor-model';
import {DEFAULT_INTERIOR,INTERIOR_OPTIONS,interiorFieldsFor,interiorOf,validInterior} from './interior-options';
import {makeHouseLayout} from './house3d/layout';
import {doorBlocks,doorLeaves,doorTargetAngle} from './house3d/doors';

const plan=():Plan=>generatePlan({...DEFAULT_REQUIREMENTS,pooja:true},DEFAULT_SETTINGS,0,DEFAULT_RATIOS);

test('every interior field has a valid default and the Inspector offers fields per room type',()=>{
 for(const [field,value] of Object.entries(DEFAULT_INTERIOR))assert.ok(Object.hasOwn(INTERIOR_OPTIONS[field as keyof typeof INTERIOR_OPTIONS],value),field);
 assert.deepEqual(interiorFieldsFor('kitchen'),['granite','dado','dadoBorder']);
 assert.deepEqual(interiorFieldsFor('pooja'),['mandir','poojaDoors']);
 assert.ok(interiorFieldsFor('living').includes('tvWall')&&interiorFieldsFor('bedroom').includes('headboard'));
 assert.deepEqual(interiorFieldsFor('bathroom'),[]);
});

test('setRoomInterior stores an explicit override that survives save, undo and redo',()=>{
 const p=plan(),kitchen=p.rooms.find(r=>r.kind==='kitchen')!;
 let e=setRoomInterior(emptyEdits(),p,kitchen.id,{granite:'tan',dado:'sage'});
 e=setRoomInterior(e,applyPlanEdits(p,e),kitchen.id,{dadoBorder:'off'});
 const after=()=>interiorOf(applyPlanEdits(p,e).rooms.find(r=>r.id===kitchen.id)!);
 assert.deepEqual([after().granite,after().dado,after().dadoBorder],['tan','sage','off']);
 e=migrateEdits(JSON.parse(JSON.stringify(e)));assert.equal(after().granite,'tan');
 e=undo(e);assert.equal(after().dadoBorder,'on');assert.equal(after().granite,'tan');
 e=redo(e);assert.equal(after().dadoBorder,'off');
 assert.equal(e.past.at(-1)?.label,'Change interior of '+kitchen.label);
});

test('invalid interior choices are rejected without changing the project',()=>{
 const p=plan(),room=p.rooms[0];
 assert.throws(()=>setRoomInterior(emptyEdits(),p,room.id,{granite:'pink' as never}),/valid counter granite/);
 assert.throws(()=>validInterior({colour:'red'} as never),/Unknown interior option/);
 assert.throws(()=>setRoomInterior(emptyEdits(),p,room.id,{}),/Choose an interior option/);
 assert.throws(()=>setRoomInterior(emptyEdits(),p,'missing',{granite:'tan'}),/no longer exists/);
});

test('pooja rooms get bell-and-jaali double doors unless a standard door is chosen',()=>{
 const p=plan(),pooja=p.rooms.find(r=>r.kind==='pooja');
 assert.ok(pooja,'fixture needs a pooja room');
 const poojaDoors=(q:Plan)=>makeHouseLayout(q).doors.filter(d=>d.rooms?.includes(pooja.id)&&!d.main&&!d.arch);
 assert.ok(poojaDoors(p).length>0&&poojaDoors(p).every(d=>d.double));
 assert.ok(makeHouseLayout(p).doors.filter(d=>!d.rooms?.includes(pooja.id)).every(d=>!d.double),'only pooja doors are doubled');
 const e=setRoomInterior(emptyEdits(),p,pooja.id,{poojaDoors:'standard'});
 assert.ok(poojaDoors(applyPlanEdits(p,e)).every(d=>!d.double));
});

test('double door collision: closed leaves block the opening, open leaves leave the centre walkable',()=>{
 const door={id:'d',floor:0,x:10,z:5,axis:'x' as const,width:3.5,main:false,double:true};
 const mid={x:door.x+door.width/2,z:door.z};
 assert.equal(doorLeaves(door,0).length,2);
 assert.equal(doorBlocks(door,0,mid.x-.6,mid.z,.3),true);
 assert.equal(doorBlocks(door,0,mid.x+.6,mid.z,.3),true);
 const open=doorTargetAngle(door,true);
 assert.equal(doorBlocks(door,open,mid.x,mid.z,.3),false,'Open pooja doorway must be usable');
 const [l,r]=doorLeaves(door,open);assert.ok(Math.sign(l.z2-l.z1)===Math.sign(r.z2-r.z1),'both leaves swing to the same side');
 const side={...door,axis:'z' as const};const [sl,sr]=doorLeaves(side,open);assert.ok(Math.sign(sl.x2-sl.x1)===Math.sign(sr.x2-sr.x1));
 assert.equal(doorBlocks(side,open,side.x,side.z+side.width/2,.3),false);
});
