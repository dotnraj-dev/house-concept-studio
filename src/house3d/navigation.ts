import type {Plan} from '../types';
import {FLOOR_HEIGHT} from './layout';
import {stairSurface} from './stairs';

/** A rejected stair step must never turn into an invented flat floor. */
export function walkingSurface(plan:Plan,x:number,z:number,previousHeight:number,floor:number):number|null{
  const facing=plan.design?.twoDoors?plan.design.outerFacing:plan.design?.houseFacing||'north';
  const cores=plan.rooms.filter(room=>room.kind==='stairs'&&x>room.x&&x<room.x+room.w&&z>room.y&&z<room.y+room.h);
  if(cores.length){
    const flights=cores.filter(room=>room.floor<(plan.levels||1)-1)
      .sort((a,b)=>Math.abs((a.floor+.5)*FLOOR_HEIGHT-previousHeight)-Math.abs((b.floor+.5)*FLOOR_HEIGHT-previousHeight));
    for(const room of flights){const height=stairSurface(room,x,z,previousHeight,facing);if(height!==null)return height;}
    return null;
  }
  const nextHeight=floor*FLOOR_HEIGHT;
  return Math.abs(nextHeight-previousHeight)<.85?nextHeight:null;
}
