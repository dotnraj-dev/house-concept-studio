import type {Room} from '../types';
import type {HouseLayout} from './layout';
import {bathroomFixtures} from './bathroom';

export function tvJoinery(room:Room){
 const x=room.featureX??room.x+room.w*.55;
 const width=Math.max(3.5,Math.min(7.6,(room.featureWidth??3.9)-.32,2*Math.min(x-room.x,room.x+room.w-x)-.4));
 return {x,width,showcase:width>=6.2};
}
export type ShowerZone={x:number;z:number;angle:number;width:number;depth:number;w:number;d:number};
/** Reserve a wet corner, outside door swings and installed WC/vanity footprints. Feet. */
export function showerZone(room:Room,layout:HouseLayout):ShowerZone|null{
 const fixtures=bathroomFixtures(room,layout),doors=layout.doors.filter(d=>d.rooms?.includes(room.id));
 const width=2.3,depth=2.4,list:ShowerZone[]=[];
 for(let side=0;side<4;side++)for(const end of [0,1]){
  const sideways=side%2!==0,span=sideways?room.h:room.w,deep=sideways?room.w:room.h;
  if(span<width+.5||deep<depth+.5)continue;
  const along=end?span-width/2-.25:width/2+.25,off=depth/2+.2;
  const x=room.x+(side===1?room.w-off:side===3?off:along),z=room.y+(side===0?off:side===2?room.h-off:along),w=sideways?depth:width,d=sideways?width:depth;
  if(fixtures.some(f=>Math.abs(x-f.x)<(w+f.w)/2+.12&&Math.abs(z-f.z)<(d+f.d)/2+.12))continue;
  if(doors.some(o=>Math.hypot(Math.max(0,Math.abs(o.x-x)-w/2),Math.max(0,Math.abs(o.z-z)-d/2))<o.width+.2))continue;
  list.push({x,z,w,d,width,depth,angle:[0,-Math.PI/2,Math.PI,Math.PI/2][side]});
 }
 return list.sort((a,b)=>Math.min(...doors.map(d=>Math.hypot(b.x-d.x,b.z-d.z)),100)-Math.min(...doors.map(d=>Math.hypot(a.x-d.x,a.z-d.z)),100))[0]||null;
}

