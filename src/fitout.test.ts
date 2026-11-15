import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePlan} from './plan';
import {DEFAULT_RATIOS,DEFAULT_REQUIREMENTS,DEFAULT_SETTINGS,designOf,normalizeRequirements} from './types';
import {SHOWCASE_REQUIREMENTS} from './showcase';
import {doorDesignFor,fitoutOf,roomFitout,windowOpenableFraction} from './fitout';
import {requirementsSchema} from './schemas';
import {makeHouseLayout,makeInteractions} from './house3d/layout';
import {roomFitments,doorReservations,overlaps,primaryFootprints} from './house3d/fitout-layout';
const make=(r=SHOWCASE_REQUIREMENTS,v=1)=>generatePlan(r,DEFAULT_SETTINGS,v,DEFAULT_RATIOS);
test('house choices and per-room overrides survive save validation and legacy projects keep neutral prayer defaults',()=>{
 const d=designOf(SHOWCASE_REQUIREMENTS),fit={...fitoutOf(d),window:'sliding' as const,prayerMode:'cabinet' as const,faith:'hindu' as const,rooms:{'0-bedroom-0':{wardrobe:'mirror' as const,fan:false}}};
 const req=requirementsSchema.parse({...SHOWCASE_REQUIREMENTS,design:{...d,fitout:fit}});
 assert.deepEqual(req.design!.fitout,fit);
 const p=make(req),r=p.rooms.find(r=>r.id==='0-bedroom-0')!;
 assert.equal(roomFitout(p,r).wardrobe,'mirror');assert.equal(roomFitout(p,r).fan,false);
 assert.equal(fitoutOf(designOf(normalizeRequirements({}))).faith,'neutral');
 assert.equal(requirementsSchema.safeParse({...req,design:{...req.design,fitout:{...fit,window:'bad'}}}).success,false);
});
test('prayer cabinets and shelves use a clear wall in living without creating a dedicated prayer room',()=>{
 for(const mode of ['cabinet','shelves'] as const){
  const d=designOf(SHOWCASE_REQUIREMENTS),p=make({...SHOWCASE_REQUIREMENTS,design:{...d,fitout:{...fitoutOf(d),prayerMode:mode}}}),l=makeHouseLayout(p);
  assert.equal(p.rooms.some(r=>r.kind==='pooja'),false);
  const living=p.rooms.find(r=>r.kind==='living')!,f=roomFitments(p,living,l).find(f=>f.kind==='prayer');assert.ok(f);
  if(mode==='cabinet'){assert.equal(f.bottom,0);assert.ok(f.height>=7);}
 }
});
test('washing defaults do not invent a basin-only room; explicit laundry has a utility programme',()=>{
 const d=designOf(DEFAULT_REQUIREMENTS);
 assert.equal(make({...DEFAULT_REQUIREMENTS,utility:true}).rooms.some(r=>r.kind==='utility'),false);
 assert.equal(make({...DEFAULT_REQUIREMENTS,utility:true,design:{...d,fitout:{...fitoutOf(d),utilityMode:'laundry'}}}).rooms.filter(r=>r.kind==='utility').length,1);
});
test('open kitchen and dining share a broad real opening in each generated variant',()=>{
 for(let v=0;v<3;v++){
  const d=designOf(SHOWCASE_REQUIREMENTS),p=make({...SHOWCASE_REQUIREMENTS,design:{...d,fitout:{...fitoutOf(d),openKitchen:true,prayerMode:'cabinet'}}},v),l=makeHouseLayout(p),k=p.rooms.find(r=>r.kind==='kitchen')!,dining=p.rooms.find(r=>r.kind==='dining')!;
  assert.ok(l.doors.some(o=>o.arch&&o.width>4&&o.rooms?.includes(k.id)&&o.rooms?.includes(dining.id)),'open kitchen must actually join dining');
 }
});
test('wardrobes, cabinets and bedside storage reserve entry access and clear the main furniture in every facing',()=>{
 for(const houseFacing of ['north','east','south','west'] as const)for(let v=0;v<3;v++){
  const d=designOf(SHOWCASE_REQUIREMENTS),p=make({...SHOWCASE_REQUIREMENTS,design:{...d,houseFacing,mainDoorFacing:houseFacing}},v),l=makeHouseLayout(p);
  for(const r of p.rooms){
   const fits=roomFitments(p,r,l);
   if(r.kind==='bedroom'){
    const hasWardrobe=fits.some(f=>f.kind==='wardrobe')||p.rooms.filter(a=>a.attachedTo===r.id).some(a=>roomFitments(p,a,l).some(f=>f.kind==='wardrobe'));
    assert.ok(hasWardrobe||p.checks?.some(c=>c.id==='fitout-'+r.id&&c.status==='warning'),'Missing wardrobe must be flagged');
   }
   for(const f of fits){
    assert.ok(f.x-f.w/2>=r.x&&f.x+f.w/2<=r.x+r.w+.01&&f.z-f.d/2>=r.y&&f.z+f.d/2<=r.y+r.h+.01);
    if(f.bottom<7)for(const door of doorReservations(r,l))assert.equal(overlaps(f,door),false,f.id+' blocks entry');
    if(f.kind==='wardrobe')for(const body of primaryFootprints(p,r))assert.equal(overlaps(f,body,1.79),false,'wardrobe needs door-opening clearance');
   }
  }
 }
});
test('window types carry honest opening fractions and privacy windows meet the preliminary wet-room target',()=>{
 assert.ok(windowOpenableFraction('sliding')<windowOpenableFraction('casement'));
 const p=make(),l=makeHouseLayout(p);
 for(const r of p.rooms.filter(r=>r.kind==='bathroom')){
  const area=l.windows.filter(w=>w.roomId===r.id).reduce((a,w)=>a+w.width*w.height!*(w.openableFraction||0)*.3048**2,0);
  assert.ok(area>=.3-.001);
 }
 assert.equal(p.checks?.filter(c=>c.status==='conflict').length,0);
});
test('upper lounges have a bounded length and every replacement terrace remains accessible',()=>{
 const p=make(),l=makeHouseLayout(p);
 for(const r of p.rooms.filter(r=>r.kind==='lounge'))assert.ok(r.h<=17.01);
 for(const r of p.rooms.filter(r=>r.kind==='terrace'))assert.ok(l.doors.some(d=>d.balcony&&d.rooms?.includes(r.id)));
 const d=designOf(SHOWCASE_REQUIREMENTS),unfurnished=make({...SHOWCASE_REQUIREMENTS,design:{...d,furnished:false}});
 assert.equal(roomFitments(unfurnished,unfurnished.rooms.find(r=>r.kind==='bedroom')!,makeHouseLayout(unfurnished)).some(f=>f.kind==='art'),false);
 assert.ok(makeInteractions(unfurnished,makeHouseLayout(unfurnished)).some(i=>i.id.startsWith('loft-')));
});


test('an attached bathroom door uses that bathroom override instead of its parent bedroom choice',()=>{
 const d=designOf(SHOWCASE_REQUIREMENTS),p=make({...SHOWCASE_REQUIREMENTS,design:{...d,fitout:{...fitoutOf(d),door:'slatted',rooms:{'0-bathroom-0':{door:'panel'},'0-bedroom-0':{door:'flush'}}}}}),l=makeHouseLayout(p),door=l.doors.find(v=>v.rooms?.includes('0-bathroom-0'))!;
 assert.equal(doorDesignFor(p,door),'panel');
 assert.equal(doorDesignFor(p,l.doors.find(v=>v.main)!),'slatted');
});
