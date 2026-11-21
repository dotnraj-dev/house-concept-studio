import type {Plan} from '../types';
import {FLOOR_HEIGHT,entrancePose,makeHouseLayout} from './layout';
import {GROUND_LEVEL} from '../building-dimensions';
import {stairSurface} from './stairs';
import {externalStair,terraceOptions} from '../terrace';

/** A rejected stair step must never turn into an invented flat floor. */
const entrances=new WeakMap<Plan,ReturnType<typeof entrancePose>>();
export function walkingSurface(plan:Plan,x:number,z:number,previousHeight:number,floor:number):number|null{
 const outsideStair=externalStair(plan);if(outsideStair&&x>outsideStair.x-outsideStair.w/2&&x<outsideStair.x+outsideStair.w/2&&z>outsideStair.y-outsideStair.h/2&&z<outsideStair.y+outsideStair.h/2){const flights=Array.from({length:plan.levels||1},(_,f)=>f).sort((a,b)=>Math.abs((a+.5)*FLOOR_HEIGHT-previousHeight)-Math.abs((b+.5)*FLOOR_HEIGHT-previousHeight));for(const f of flights){const room={id:'external-stair',kind:'stairs' as const,label:'External stair',floor:f,x:outsideStair.x-outsideStair.w/2,y:outsideStair.y-outsideStair.h/2,w:outsideStair.w,h:outsideStair.h};if(terraceOptions(plan).stairType==='spiral'){const dx=x-outsideStair.x,dz=z-outsideStair.y,rad=Math.hypot(dx,dz);if(rad<.6||rad>outsideStair.w*.48)return null;const a=(Math.atan2(dz,dx)+Math.PI*2)%(Math.PI*2),height=f*FLOOR_HEIGHT+a/(Math.PI*2)*FLOOR_HEIGHT;if(Math.abs(height-previousHeight)<.85)return height;}else{const height=stairSurface(room,x,z,previousHeight);if(height!==null)return height;}}return null;}
  let e=entrances.get(plan);if(!e){e=entrancePose(plan,makeHouseLayout(plan));entrances.set(plan,e);}const dx=x-e.x,dz=z-e.z,u=dx*e.n[0]+dz*e.n[1],across=dx*e.n[1]-dz*e.n[0];
 if(floor===0&&u>-.1&&u<2.7&&Math.abs(across)<1.95){const h=u<.9?0:u<1.8?-.5:-1;return Math.abs(h-previousHeight)<.85?h:null;}
 if(x<0||z<0||x>plan.width||z>plan.depth)return floor===0&&Math.abs(GROUND_LEVEL-previousHeight)<.85?GROUND_LEVEL:null;
 const facing=plan.design?.twoDoors?plan.design.outerFacing:plan.design?.houseFacing||'north';
  const cores=plan.rooms.filter(room=>room.kind==='stairs'&&x>room.x&&x<room.x+room.w&&z>room.y&&z<room.y+room.h);
  if(cores.length){
    const flights=cores.filter(room=>room.floor<(plan.levels||1))
      .sort((a,b)=>Math.abs((a.floor+.5)*FLOOR_HEIGHT-previousHeight)-Math.abs((b.floor+.5)*FLOOR_HEIGHT-previousHeight));
    for(const room of flights){const height=stairSurface(room,x,z,previousHeight,facing);if(height!==null)return height;}
    return null;
  }
  const nextHeight=floor*FLOOR_HEIGHT;
  return Math.abs(nextHeight-previousHeight)<.85?nextHeight:null;
}
