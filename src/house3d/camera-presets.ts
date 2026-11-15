import type {Plan} from '../types';
import {FLOOR_HEIGHT,GROUND_LEVEL} from '../building-dimensions';
export type CameraPose={position:[number,number,number];look:[number,number,number];fov:number};
/** Road-facing photograph composition. All coordinates are feet in the centred scene. */
export function frontElevationPose(plan:Plan,aspect=1.25):CameraPose{
 const n=({north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]} as const)[plan.roadSide];
 const frontage=plan.roadSide==='north'||plan.roadSide==='south'?plan.width:plan.depth;
 const along=plan.roadSide==='north'||plan.roadSide==='south'?plan.depth:plan.width;
 const height=(plan.levels||1)*FLOOR_HEIGHT+2.5,eye=GROUND_LEVEL+5.5;
 const fov=45,tan=Math.tan(fov*Math.PI/360);
 // Fit the compound frontage and elevation, rather than the long side wall.
 const distance=Math.max((frontage+6)/(2*tan*Math.max(.6,aspect)*.72),(height-GROUND_LEVEL)/(2*tan*.78));
 const x=n[0]*along/2,z=n[1]*along/2,side=distance*Math.tan(15*Math.PI/180);
 return {position:[x+n[0]*distance+n[1]*side,eye,z+n[1]*distance-n[0]*side],look:[x,height*.45,z],fov};
}
