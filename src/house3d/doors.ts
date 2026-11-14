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

export function doorBlocks(door:DoorSpec,angle:number,x:number,z:number,radius:number){
  const leaf=doorLeaf(door,angle),dx=leaf.x2-leaf.x1,dz=leaf.z2-leaf.z1;
  const t=Math.max(0,Math.min(1,((x-leaf.x1)*dx+(z-leaf.z1)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-leaf.x1-t*dx,z-leaf.z1-t*dz)<radius+.065;
}
