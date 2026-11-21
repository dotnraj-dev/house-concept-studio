import {Group,BufferGeometry,Mesh,type Texture} from 'three';
import type {Plan,Direction} from '../../types';
import type {HouseLayout} from '../layout';
import {FLOOR_HEIGHT,WALL_HEIGHT} from '../../building-dimensions';
import {recipeFor} from '../facade-styles';
import {faceContext,frontBalconies,safeRects,type Rect} from './layout';
import {beam,mount} from './geometry';
import {kitMaterials} from './materials';
import {BoxFrame} from './BoxFrame';
import {FinScreen,SlatScreen} from './Screens';
import {JaaliPanel} from './JaaliPanel';
import {CladdingWall} from './CladdingWall';
import {GlassRailing,MsRailing} from './Railings';
import {Pergola,CurvedParapet,FloorRibbon,StairHeadroom,WaterTankScreen,TiledRoof} from './RoofDetails';
import {CompoundWall} from './CompoundWall';
import {FacadeLights,CoveStrip} from './FacadeLights';
import {WallPanels,BalconyWrap,VerandaArch,VerandaGable} from './Surfaces';

export function buildFacade(plan:Plan,layout:HouseLayout,textures:Texture[]=[],options:{servicesVisible?:boolean;lightPower?:number}={}){
 const c=faceContext(plan,layout),s=recipeFor(plan.design?.style||'',c.length,plan.levels||1);
 const m=kitMaterials(s,textures,options.lightPower??1),root=new Group(),height=(plan.levels||1)*FLOOR_HEIGHT;
 root.name='Parametric Tamil Nadu facade · '+s.id;
 root.userData={facadeStyle:s.id,modelUnits:'feet',roadFacing:c.facing};
 const front=new Group();front.name='Opening-aware street elevation';root.add(front);
 const accentWidth=Math.max(3,Math.min(c.length*.47,c.length-4));
 const band:Rect={u:Math.max(.05,accentWidth-2.8),v:.18,w:Math.min(3.4,c.length*.17),h:height-.5};
 const upper:Rect={u:.12,v:FLOOR_HEIGHT+.08,w:accentWidth-.2,h:WALL_HEIGHT-.16};
 // Each recipe has its own material balance and massing. All patches are clipped
 // against measured solid wall fragments, not against an invented facade sketch.
 switch(s.id){
  case 'tn-contemporary-slats':
   // A broad timber plane balances a charcoal panel plane; reveals remain real.
   front.add(FinScreen(c,{u:.12,v:.12,w:Math.max(3,c.length*.25),h:height-.24},m.timber,.24));
   front.add(WallPanels(c,{...upper,u:c.length*.26,w:Math.max(2,c.length*.39)},m,true));
   break;
  case 'tn-jaali-stone':
   front.add(CladdingWall(c,{...upper,w:c.length*.47-.2},m.stone));
   // The screen crosses blank passage wall and a portion of the real balcony edge.
   front.add(JaaliPanel(c,{u:c.length*.48,v:FLOOR_HEIGHT+.2,w:c.length*.29,h:WALL_HEIGHT-.6},m,s.jaali,.32,false));
   break;
  case 'tn-curved-villa':
   front.add(WallPanels(c,{u:.12,v:FLOOR_HEIGHT+.08,w:c.length*.45,h:WALL_HEIGHT-.16},m));
   front.add(FinScreen(c,{u:c.length*.48,v:7.25,w:c.length*.15,h:height-7.5},m.timber,.29));
   for(let f=1;f<(plan.levels||1);f++)root.add(FloorRibbon(plan,m,f));
   break;
  case 'tn-tiled-bungalow':
   break;
  case 'tn-narrow-g2':
   front.add(CladdingWall(c,{u:.1,v:.12,w:c.length*.45,h:height-.24},m.stone));
   front.add(SlatScreen(c,{u:c.length*.48,v:FLOOR_HEIGHT+.3,w:c.length*.15,h:WALL_HEIGHT-.6},m.timber,.22));
   break;
 }
 // One frontage-wide surround connects actual room and balcony bays. It adds no
 // terrace floor or fictitious glazing behind the real bathroom/privacy window.
 if(!s.pitched)for(let f=1;f<(plan.levels||1);f++){
  front.add(BoxFrame(c,{u:-.13,v:f*FLOOR_HEIGHT-.18,w:c.length+.26,h:WALL_HEIGHT+.4},m.paint,s.projection,s.rounded,s.rounded?.72:.6));
  front.add(CoveStrip(c,{u:.6,v:f*FLOOR_HEIGHT+WALL_HEIGHT-.35,w:c.length-1.2,h:.04},m,.7,true));
 }
 if(s.id==='tn-narrow-g2')front.add(BoxFrame(c,{u:-.05,v:.02,w:c.length+.1,h:WALL_HEIGHT+.1},m.paint,1.2,false,.42));
 const balconies=frontBalconies(c);
 for(const b of balconies){
  if(s.pitched){front.add(VerandaArch(c,b,m));front.add(VerandaGable(c,b,m));}
  else{
   if(s.rounded)front.add(BalconyWrap(c,b,m,true));
   front.add(Pergola(c,{u:b.u+.35,v:b.v+8.85,w:b.w-.7,h:.3},m,Math.min(4,c.depth*.12)));
   front.add(CoveStrip(c,{u:b.u+.65,v:b.v+8.55,w:Math.max(.1,b.w-1.3),h:.04},m,.70,true));
  }
  front.add((s.railing==='glass'?GlassRailing:MsRailing)(c,{u:b.u+.2,v:b.v+.18,w:b.w-.4,h:3.2},m));
  // A privacy jaali beside the real open balcony has daylight behind its holes.
  // It stays on the balcony edge; internal access doors and facade windows are excluded.

 }
 if(s.pitched)for(const b of c.openings.filter(o=>o.kind==='portico'))front.add(VerandaArch(c,b,m));
 // Sills/chajjas use the real window coordinates on all elevations.
 for(const window of layout.windows){
  const facing:Direction=window.outward[0]<0?'west':window.outward[0]>0?'east':window.outward[1]<0?'north':'south';
  const face=faceContext(plan,layout,facing),o=face.openings.find(o=>o.id===window.id);if(!o)continue;
  const g=new Group();g.name='Profiled opening sill and chajja';
  const reveal=[
   {u:o.u-.18,v:o.v-.18,w:o.w+.36,h:.13},
   {u:o.u-.18,v:o.v+o.h+.05,w:o.w+.36,h:.13},
   {u:o.u-.18,v:o.v,w:.13,h:o.h},
   {u:o.u+o.w+.05,v:o.v,w:.13,h:o.h}
  ];
  for(const r of reveal.flatMap(r=>safeRects(face,r,false,.03))){
   const a=mount(face,r,.02);a.add(beam([r.w,r.h,.34],s.pitched?m.timber:m.side,[0,0,.03],.018));g.add(a);
  }
  if(s.pitched)for(const r of safeRects(face,{u:o.u-.35,v:o.v+o.h+.22,w:o.w+.7,h:.16},false,.07)){
   const a=mount(face,r,.1);a.add(beam([r.w,r.h,1.5],m.paint,[0,0,-.5]));g.add(a);
  }
  root.add(g);
 }
 const entrance=c.openings.find(o=>o.kind==='door');
 if(entrance){
  const r={u:entrance.u-.5,v:7.65,w:entrance.w+1,h:.24};
  front.add(Pergola(c,r,m,2.3));
  front.add(CoveStrip(c,{u:entrance.u-.1,v:7.4,w:entrance.w+.2,h:.03},m,.6,true));
 }
 if(s.pitched)root.add(TiledRoof(plan,m,.38,1.15));
 else{
  root.add(CurvedParapet(plan,m,s.rounded));
 }
 root.add(CompoundWall(c,m,s.gate));
 front.add(FacadeLights(c,[{u:1,v:5.1},{u:Math.max(2,accentWidth-.8),v:5.1},{u:1,v:FLOOR_HEIGHT+4.5},{u:c.length-1,v:FLOOR_HEIGHT+5}],m));
 const sides:Direction[]=c.facing==='north'||c.facing==='south'?['east','west']:['north','south'];
 for(const side of sides){
  const f=faceContext(plan,layout,side),corner={u:0,v:.12,w:Math.min(1.8,f.length*.08),h:height-.4};
  root.add(WallPanels(f,{u:0,v:.06,w:f.length,h:.55},m,false,m.side));
  if(!s.pitched)root.add(WallPanels(f,{u:.08,v:FLOOR_HEIGHT+.08,w:f.length-.16,h:height-FLOOR_HEIGHT-.2},m,false,m.side));
  for(const b of frontBalconies(f))root.add((s.railing==='glass'?GlassRailing:MsRailing)(f,{u:b.u+.15,v:b.v+.15,w:b.w-.3,h:3.2},m));
 }
 const geometries=new Set<BufferGeometry>();
 root.traverse(o=>{if((o as Mesh).isMesh)geometries.add((o as Mesh).geometry);});
 return {root,front,dispose:()=>{geometries.forEach(g=>g.dispose());m.dispose();}};
}
