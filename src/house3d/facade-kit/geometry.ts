import {ExtrudeGeometry,Group,Mesh,Shape,Path,InstancedMesh,Matrix4,Quaternion,Vector3,Euler,type Material,type BufferGeometry} from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {FacadeContext,Rect} from './layout';
export type KitMaterial=Material;
export function roundedPath(w:number,h:number,r:number,path:Shape|Path=new Shape()){
 r=Math.max(0,Math.min(r,w/2-.001,h/2-.001));const x=-w/2,y=-h/2;
 path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);path.closePath();return path;
}
export function profile(w:number,h:number,d:number,r=.035):BufferGeometry{
 const geometry=new RoundedBoxGeometry(w,h,d,2,Math.max(.002,Math.min(r,w/3,h/3,d/3)));
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
 // One repeat per four feet on every face. Long joinery members must not stretch
 // one grain image across their whole length; the stone strip uses this too.
 for(let i=0;i<uv.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(Math.abs(n.getY(i))>.7)uv.setXY(i,x/4,z/4);
  else if(Math.abs(n.getX(i))>.7)uv.setXY(i,z/4,y/4);
  else uv.setXY(i,x/4,y/4);
 }
 return geometry;
}
export function solid(geometry:BufferGeometry,material:Material,name:string){const m=new Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;return m;}
export function beam(size:[number,number,number],material:Material,at:[number,number,number]=[0,0,0],radius=.04){const m=solid(profile(...size,radius),material,'Profiled member');m.position.set(...at);return m;}
export function mount(c:FacadeContext,r:Rect,out=0){const g=new Group();g.position.set(...c.at(r.u+r.w/2,r.v+r.h/2,out));g.rotation.y=c.angle;return g;}
export function ring(w:number,h:number,thickness:number,depth:number,rounded=false){
 const shape=roundedPath(w,h,rounded?1.3:.06) as Shape;
 shape.holes.push(roundedPath(w-2*thickness,h-2*thickness,rounded?.8:.015,new Path()) as Path);
 const g=new ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:12});g.translate(0,0,-depth);return g;
}
export function instances(geometry:BufferGeometry,material:Material,poses:{at:[number,number,number];rotation?:[number,number,number];scale?:[number,number,number]}[],name:string){
 const mesh=new InstancedMesh(geometry,material,poses.length),matrix=new Matrix4(),q=new Quaternion();
 for(const [i,p] of poses.entries()){q.setFromEuler(new Euler(...(p.rotation||[0,0,0]),'YXZ'));matrix.compose(new Vector3(...p.at),q,new Vector3(...(p.scale||[1,1,1])));mesh.setMatrixAt(i,matrix);}
 mesh.instanceMatrix.needsUpdate=true;mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
