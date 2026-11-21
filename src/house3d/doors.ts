import type { DoorSpec } from './layout';

export const DOOR_OPEN_ANGLE = 1.52;
export const doorTargetAngle = (door:DoorSpec,open:boolean) => open ? DOOR_OPEN_ANGLE*(door.swing||1) : 0;

/** The same hinge and leaf dimensions used by the rendered door, in feet. */
export function doorLeaf(door:DoorSpec,angle:number){
  const alongX=door.axis==='x',hingeX=door.x+(alongX?.06:0),hingeZ=door.z+(alongX?0:.06);
  const length=door.width-.1,offset=.05;
  const dx=alongX?Math.cos(angle):Math.sin(angle),dz=alongX?-Math.sin(angle):Math.cos(angle);
  return {x1:hingeX+dx*offset,z1:hingeZ+dz*offset,x2:hingeX+dx*(offset+length),z2:hingeZ+dz*(offset+length)};
}

/** Double doors (pooja): two half leaves hinged at both jambs, swinging to the same side. Matches PoojaDoor in HouseScene. */
export function doorLeaves(door:DoorSpec,angle:number){
  if(!door.double)return [doorLeaf(door,angle)];
  const alongX=door.axis==='x',half=door.width/2-.08,offset=.05;
  const lx=alongX?door.x+.06:door.x,lz=alongX?door.z:door.z+.06,rx=alongX?door.x+door.width-.06:door.x,rz=alongX?door.z:door.z+door.width-.06;
  const l=alongX?[Math.cos(angle),-Math.sin(angle)]:[Math.sin(angle),Math.cos(angle)],r=alongX?[-Math.cos(angle),-Math.sin(angle)]:[Math.sin(angle),-Math.cos(angle)];
  return [{x1:lx+l[0]*offset,z1:lz+l[1]*offset,x2:lx+l[0]*(offset+half),z2:lz+l[1]*(offset+half)},{x1:rx+r[0]*offset,z1:rz+r[1]*offset,x2:rx+r[0]*(offset+half),z2:rz+r[1]*(offset+half)}];
}

export function doorBlocks(door:DoorSpec,angle:number,x:number,z:number,radius:number){
  return doorLeaves(door,angle).some(leaf=>leafBlocks(leaf,x,z,radius));
}

function leafBlocks(leaf:{x1:number;z1:number;x2:number;z2:number},x:number,z:number,radius:number){
  const dx=leaf.x2-leaf.x1,dz=leaf.z2-leaf.z1;
  const t=Math.max(0,Math.min(1,((x-leaf.x1)*dx+(z-leaf.z1)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-leaf.x1-t*dx,z-leaf.z1-t*dz)<radius+.065;
}
