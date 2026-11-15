import {Group,Shape,Path,ExtrudeGeometry,BufferGeometry,Float32BufferAttribute,DoubleSide,PlaneGeometry} from 'three';
import {FLOOR_HEIGHT,WALL_HEIGHT} from '../../building-dimensions';
import {safeRects,type FacadeContext,type Rect} from './layout';
import {beam,mount,profile,solid,instances,roundedPath} from './geometry';
import type {MaterialSet} from './materials';

/** Painted recesses or jointed large-format facade panels on actual solid walls. */
export function WallPanels(c:FacadeContext,r:Rect,m:MaterialSet,jointed=false,material=m.accent){
 const root=new Group();root.name=jointed?'Jointed charcoal facade panels':'Taupe plaster recess';
 if(jointed)root.add(WallPanels(c,r,m,false,material));
 const cells:Rect[]=[];
 if(jointed){
  for(let u=r.u;u<r.u+r.w-.02;u+=3.4)for(let v=r.v;v<r.v+r.h-.02;v+=2.1)
   cells.push({u:u+.01,v:v+.01,w:Math.min(3.38,r.u+r.w-u-.02),h:Math.min(2.08,r.v+r.h-v-.02)});
 }else cells.push(r);
 const patches=cells.flatMap(cell=>safeRects(c,cell,true,.15)).filter(p=>p.w>.06&&p.h>.06);
 root.userData.facadeRects=patches.map(p=>({...p,facing:c.facing}));
 for(const p of patches){
  const g=mount(c,p,jointed?.19:.145);
  if(jointed){const mesh=beam([p.w,p.h,.06],material,[0,0,0],.008);mesh.castShadow=false;g.add(mesh);}
  else{const geo=new PlaneGeometry(p.w,p.h);geo.rotateY(Math.PI);const mesh=solid(geo,material,'Continuous painted wall finish');mesh.castShadow=false;g.add(mesh);}
  root.add(g);
 }
 return root;
}

/** Sweeping horizontal balcony slab and canopy, tied to the real terrace footprint. */
export function BalconyWrap(c:FacadeContext,b:Rect,m:MaterialSet,rounded=true){
 const root=new Group();root.name='Rounded wraparound balcony slab and canopy';
 const room=c.plan.rooms.find(r=>r.id===(b as Rect&{id?:string}).id);
 if(!room)return root;
 const depth=['north','south'].includes(c.facing)?room.h:room.w;
 const width=b.w+1.1,length=depth+1.05,radius=rounded?1.3:.08;
 for(const [height,thickness] of [[b.v-.4,.34],[b.v+WALL_HEIGHT-.32,.34]]){
  const geometry=new ExtrudeGeometry(roundedPath(width,length,radius) as Shape,{depth:thickness,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,curveSegments:24});
  geometry.rotateX(-Math.PI/2);
  const g=mount(c,{u:b.u-.55,v:height,w:width,h:0},.8);
  const mesh=solid(geometry,m.paint,'Continuous rounded balcony return');
  mesh.position.z=length/2-.25;g.add(mesh);root.add(g);
 }
 return root;
}

/** Shallow veranda arch. Side jambs are cut away wherever real openings need them. */
export function VerandaArch(c:FacadeContext,b:Rect,m:MaterialSet){
 const root=new Group();root.name='White veranda arch and timber soffit';
 const w=b.w-.18,h=WALL_HEIGHT-.12,t=.32;
 // The crown occupies only the high head zone of the open veranda, never a room door/window.
 const shape=new Shape();shape.moveTo(-w/2,h);shape.lineTo(w/2,h);shape.lineTo(w/2,h-1.7);
 shape.quadraticCurveTo(0,h+.5,-w/2,h-1.7);shape.closePath();
 const geo=new ExtrudeGeometry(shape,{depth:.65,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2,curveSegments:24});geo.translate(0,0,-.65);
 const g=mount(c,{u:b.u+.09,v:b.v,w,h:0},.24);g.add(solid(geo,m.paint,'Profiled veranda arch crown'));root.add(g);
 for(const u of [b.u+.08,b.u+b.w-.4])for(const p of safeRects(c,{u,v:b.v,w:t,h:h-1.55},false,.16)){
  const post=mount(c,p,.21);post.add(beam([p.w,p.h,.52],m.paint));root.add(post);
 }
 return root;
}

/** Front cross-gable: a roof form with thickness, individual clay tile relief and white fascia. */
export function VerandaGable(c:FacadeContext,b:Rect,m:MaterialSet){
 const width=b.w+1.25,depth=5.1,rise=Math.min(2.9,width*.3),base=(c.plan.levels||1)*FLOOR_HEIGHT+.24;
 const root=mount(c,{u:b.u-.625,v:base,w:width,h:0},1.25);root.name='Layered terracotta veranda cross-gable';
 const triangle=new Shape();triangle.moveTo(-width/2,0);triangle.lineTo(width/2,0);triangle.lineTo(0,rise);triangle.closePath();
 const fill=solid(new ExtrudeGeometry(triangle,{depth:.16,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2}),m.paint,'White triangular gable infill');root.add(fill);
 const slope=Math.atan2(rise,width/2),span=Math.hypot(width/2,rise),poses=[];
 // Rafter beams and overlapping curved tile lips follow the two pitched surfaces.
 for(const sign of [-1,1]){
  const surface=beam([span,.14,depth],m.tile,[sign*width/4,rise/2,depth/2],.03);surface.rotation.z=sign*-slope;root.add(surface);
  const fascia=beam([span+.15,.21,.22],m.paint,[sign*width/4,rise/2+.02,-.08],.045);fascia.rotation.z=sign*-slope;root.add(fascia);
 }
 const vertices:number[]=[];
 for(let i=0;i<8;i++){const x=-.34+i*.085,x2=x+.085,y=.065*Math.sin((x/.68+.5)*Math.PI),y2=.065*Math.sin((x2/.68+.5)*Math.PI);
  vertices.push(x,y,-.5,x2,y2,-.5,x2,y2,.5,x,y,-.5,x2,y2,.5,x,y,.5);
 }
 const tile=new BufferGeometry();tile.setAttribute('position',new Float32BufferAttribute(vertices,3));tile.computeVertexNormals();
 // The local y-axis is rotated with the roof; the ridge remains open to the real main roof.
 for(let x=-width/2+.36;x<width/2-.1;x+=.68)for(let z=.3;z<depth;z+=.9){
  poses.push({at:[x,rise*(1-Math.abs(x)/(width/2))+.1,z] as [number,number,number],rotation:[0,0,-Math.sign(x)*slope] as [number,number,number]});
 }
 m.tile.side=DoubleSide;
 root.add(instances(tile,m.tile,poses,'Instanced cross-gable clay tiles'));
 return root;
}
