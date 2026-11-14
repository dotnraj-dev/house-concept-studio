import {Box3,Vector3,type Object3D} from 'three';
/** Measure detached geometry. Mounted ancestors and last render's centring cannot enter the fit. */
export function modelFit(object:Object3D,size:readonly [number,number,number],stretch=true){
 const probe=object.clone(true);probe.position.set(0,0,0);probe.quaternion.identity();probe.scale.set(1,1,1);
 const bounds=new Box3().setFromObject(probe),dims=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());
 const factors:[number,number,number]=[size[0]/Math.max(dims.x,.01),size[1]/Math.max(dims.y,.01),size[2]/Math.max(dims.z,.01)];
 const unit=Math.min(...factors),scale:[number,number,number]=stretch?factors:[unit,unit,unit];
 return {scale,offset:[-center.x,-bounds.min.y,-center.z] as [number,number,number]};
}
