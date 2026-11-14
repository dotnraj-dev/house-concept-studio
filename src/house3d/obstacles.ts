import {Box3,type Object3D} from 'three';

export type Body={x:number;z:number;bottom:number;height:number;radius:number};
export function collectObstacles(root:Object3D){
  root.updateMatrixWorld(true);
  const boxes:Box3[]=[];
  root.traverse(object=>{if(object.userData.solid&&object.visible){const box=new Box3().setFromObject(object);if(!box.isEmpty())boxes.push(box);}});
  return boxes;
}
function penetration(box:Box3,body:Body){
  if(body.bottom>=box.max.y-.04||body.bottom+body.height<=box.min.y+.04)return 0;
  const dx=Math.max(box.min.x-body.x,0,body.x-box.max.x),dz=Math.max(box.min.z-body.z,0,body.z-box.max.z);
  if(dx||dz)return Math.max(0,body.radius-Math.hypot(dx,dz));
  return body.radius+Math.min(body.x-box.min.x,box.max.x-body.x,body.z-box.min.z,box.max.z-body.z);
}
/** A seat/viewpoint inside an object can leave it, but cannot move deeper into it. */
export function obstacleBlocks(boxes:Box3[],from:Body,to:Body){
  return boxes.some(box=>{
    const next=penetration(box,to);return next>0&&next>=penetration(box,from)-1e-5;
  });
}
