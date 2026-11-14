import type { Direction, Room } from '../types';
import { FLOOR_HEIGHT } from './layout';

/** Dimensions in feet. Two flights share a half-height rear landing. */
export function stairDimensions(room:Room){
  const front=4,back=room.h-2.3;
  return {front,back,run:back-front,flightWidth:(room.w-.85)/2,steps:9,rise:FLOOR_HEIGHT/18};
}

/** The walkable surface under a proposed foot position, or null for an unsafe step. */
export function stairSurface(room:Room,x:number,z:number,previousHeight:number,facing:Direction='north'):number|null{
 const original=room,swap=facing==='east'||facing==='west',px=x-original.x,pz=z-original.y;
 x=facing==='east'?pz:facing==='south'?original.w-px:facing==='west'?original.h-pz:px;
 z=facing==='east'?original.w-px:facing==='south'?original.h-pz:facing==='west'?px:pz;
 room={...original,x:0,y:0,w:swap?original.h:original.w,h:swap?original.w:original.h};
  const {front,back,run}=stairDimensions(room);
  const localZ=z-room.y;
  const base=room.floor*FLOOR_HEIGHT;previousHeight-=base;
  if(x<room.x+.3||x>room.x+room.w-.3||localZ<0||localZ>room.h-.25)return null;
  let height:number;
  if(localZ<front)height=previousHeight>FLOOR_HEIGHT*.75?FLOOR_HEIGHT:0;
  else if(localZ>=back)height=FLOOR_HEIGHT/2;
  else {
    const progress=Math.max(0,Math.min(1,(localZ-front)/run));
    height=x<room.x+room.w/2?progress*FLOOR_HEIGHT/2:(2-progress)*FLOOR_HEIGHT/2;
  }
  return Math.abs(height-previousHeight)>.85?null:height+base;
}
