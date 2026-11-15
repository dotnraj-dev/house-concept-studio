import test from 'node:test';
import assert from 'node:assert/strict';
import {tnSetbackMinimums,tnSite,DEFAULT_TN_SITE,tnBoundaryRoles} from './tn-rules';
import {DEFAULT_REQUIREMENTS,DEFAULT_RATIOS,DEFAULT_SETTINGS,designOf,type Requirements} from './types';
import {generatePlan} from './plan';
import {analyseSite,rectFitsPlot} from './geometry';
import {FLOOR_HEIGHT,GROUND_LEVEL,METRES_PER_FOOT,CEILING_LEVEL} from './building-dimensions';
import {entrancePose,makeHouseLayout} from './house3d/layout';
import {walkingSurface} from './house3d/navigation';
function example():Requirements{return {...DEFAULT_REQUIREMENTS,plotWidth:45,plotDepth:65,design:{...designOf(DEFAULT_REQUIREMENTS),authority:'Example authority — test only',tnRules:{...DEFAULT_TN_SITE,area:'other',access:'direct',roadWidthM:7,restrictions:'none',alignmentConfirmed:true}}};}
test('missing or special Tamil Nadu site facts never silently select standard-area setbacks',()=>{
 assert.equal(tnSetbackMinimums(DEFAULT_REQUIREMENTS),null);
 for(const restrictions of ['unknown','special'] as const){const r=example();r.design!.tnRules!.restrictions=restrictions;assert.equal(tnSetbackMinimums(r),null);}
 const r=example();r.design!.tnRules!.alignmentConfirmed=false;assert.equal(tnSetbackMinimums(r),null);r.design!.tnRules!.alignmentConfirmed=true;r.design!.roof='kerala';assert.equal(tnSetbackMinimums(r),null);
});
test('road width and height boundary tables use metres and preserve greater requested setbacks',()=>{
 const r=example(),d=r.design!,m=tnSetbackMinimums(r)!;assert.ok(Math.abs(m.front*METRES_PER_FOOT-1.5)<1e-9);assert.ok(Math.abs(m.left*METRES_PER_FOOT-1)<1e-9);
 r.floors=3;const taller=tnSetbackMinimums(r)!;assert.ok(Math.abs(taller.rear*METRES_PER_FOOT-1.5)<1e-9);assert.ok(Math.abs(taller.left*METRES_PER_FOOT-1.5)<1e-9);
 for(const [road,front] of [[9,1.5],[9.01,3],[18,3],[18.01,4.5],[30.5,4.5],[30.51,6]]){d.tnRules!.roadWidthM=road;assert.ok(Math.abs(tnSetbackMinimums(r)!.front*METRES_PER_FOOT-front)<1e-8);}
 d.tnRules!.roadWidthM=7;d.customSetbacks=true;d.setbacks={north:12,east:7,south:8,west:7};const site=analyseSite(r,DEFAULT_SETTINGS);assert.ok(site.footprint.x>=7);assert.ok(site.footprint.y>=12);assert.ok(rectFitsPlot(site.footprint,site.polygon));
});
test('every facing rotates front/rear roles and alignment depth without rotating survey coordinates',()=>{
 for(const side of ['north','east','south','west'] as const){const r=example();r.roadSide=side;r.design!.tnRules!.alignmentM=1;const s=analyseSite(r,DEFAULT_SETTINGS),roles=tnBoundaryRoles(r),front=s.polygon.find(v=>roles[v.id]==='front')!;assert.ok(Math.abs(front.setback*METRES_PER_FOOT-2.5)<1e-7);assert.ok(rectFitsPlot(s.footprint,s.polygon));}
});
test('mapped irregular boundaries retain every rule offset and missing roles remain pending',()=>{
 const r=example();r.design!.plotMode='polygon';r.design!.vertices=[[0,0],[45,0],[47,30],[40,65],[0,65]].map(([x,y],i)=>({id:String(i),x,y,setback:0,road:i===0}));r.design!.tnRules!.frontageM=45*METRES_PER_FOOT;
 let p=generatePlan(r,DEFAULT_SETTINGS,1,DEFAULT_RATIOS);assert.ok(p.checks?.some(c=>c.id==='tn-edges'));
 r.design!.tnRules!.edgeRoles={'0':'front','1':'right','2':'right','3':'rear','4':'left'};p=generatePlan(r,DEFAULT_SETTINGS,1,DEFAULT_RATIOS);assert.ok(rectFitsPlot(p.site!.footprint,p.site!.polygon));assert.ok(p.site!.polygon.every(v=>v.setback>=0));assert.equal(p.checks?.some(c=>c.id==='tn-edges'),false);
});
test('base FSI cap shrinks the generated footprint and illegal narrow access remains a conflict',()=>{
 const r=example();r.floors=3;const p=generatePlan(r,DEFAULT_SETTINGS,1,DEFAULT_RATIOS);assert.ok(p.width*p.depth*3/(p.site!.area)<=2.001);
 r.design!.tnRules!.roadWidthM=2.9;const bad=generatePlan(r,DEFAULT_SETTINGS,1,DEFAULT_RATIOS);assert.ok(bad.checks?.some(c=>c.id==='tn-road'&&c.status==='conflict'));
});
test('room rules catch undersized habitable rooms while the model has sufficient clear height',()=>{
 assert.ok((CEILING_LEVEL-.085)*METRES_PER_FOOT>=2.75);assert.ok(-GROUND_LEVEL*METRES_PER_FOOT>=.45);
 const r=example();r.design!.roomRequests=[{id:'0-living-0',kind:'living',label:'Small living',floor:0,mode:'exact',w:6,h:8,zone:'north-west',facing:'any',priority:'required',toiletStyle:'western'}];const p=generatePlan(r,DEFAULT_SETTINGS,1,DEFAULT_RATIOS);assert.ok(p.checks?.some(c=>c.id==='tn-size-0-living-0'&&c.status==='conflict'));assert.equal(tnSite(r).dwellings,1);
});
test('front plinth steps can be walked up and down at the physical rise in every direction',()=>{
 for(const facing of ['north','east','south','west'] as const){const r=example();r.roadSide=facing;r.design!.houseFacing=facing;r.design!.mainDoorFacing=facing;const p=generatePlan(r,DEFAULT_SETTINGS,1,DEFAULT_RATIOS),e=entrancePose(p,makeHouseLayout(p));let h=GROUND_LEVEL;
 for(let d=3.2;d>=.1;d-=.1){const next=walkingSurface(p,e.x+e.n[0]*d,e.z+e.n[1]*d,h,0);assert.notEqual(next,null);h=next!;}assert.equal(h,0);
 for(let d=.1;d<=3.2;d+=.1){const next=walkingSurface(p,e.x+e.n[0]*d,e.z+e.n[1]*d,h,0);assert.notEqual(next,null);h=next!;}assert.equal(h,GROUND_LEVEL);assert.equal(FLOOR_HEIGHT,10);
 }
});

