import type {Room} from '../types';
import type {HouseLayout} from './layout';
type Fixture={kind:'basin'|'toilet';x:number;z:number;angle:number;width:number;depth:number;w:number;d:number};
export function bathroomFixtures(r:Room,layout:HouseLayout):Fixture[]{
 const doors=layout.doors.filter(d=>d.rooms?.includes(r.id)),windows=layout.windows.filter(w=>w.roomId===r.id),candidates:Fixture[][]=[];
 for(const kind of ['toilet','basin'] as const){
 const width=kind==='basin'?1.85:1.8,depth=kind==='basin'?1.5:2.25,list:Fixture[]=[];
 for(let side=0;side<4;side++){const sideways=side%2!==0,span=sideways?r.h:r.w,deep=sideways?r.w:r.h;
 if(span<width+.5||deep<depth+1.85)continue;
 const lo=width/2+.23,hi=span-lo,steps=Math.max(1,Math.ceil((hi-lo)/.6));for(let k=0;k<=steps;k++){
 const along=lo+(hi-lo)*k/steps,off=.16+depth/2,x=r.x+(side===1?r.w-off:side===3?off:along),z=r.y+(side===0?off:side===2?r.h-off:along),w=sideways?depth:width,d=sideways?width:depth;
 if(doors.some(o=>Math.hypot(Math.max(0,Math.abs(o.x-x)-w/2),Math.max(0,Math.abs(o.z-z)-d/2))<o.width+.35))continue;
 if(windows.some(o=>Math.abs(x-o.x-(o.axis==='x'?o.width/2:0))<(w+(o.axis==='x'?o.width:.3))/2+.22&&Math.abs(z-o.z-(o.axis==='z'?o.width/2:0))<(d+(o.axis==='z'?o.width:.3))/2+.22))continue;
 list.push({kind,x,z,angle:[0,-Math.PI/2,Math.PI,Math.PI/2][side],width,depth,w,d});}}
 candidates.push(list);}
 let best:Fixture[]=[];let score=-Infinity;
 for(const a of candidates[0])for(const b of candidates[1]){
 if(Math.abs(a.x-b.x)<(a.w+b.w)/2+.65&&Math.abs(a.z-b.z)<(a.d+b.d)/2+.65)continue;
 const s=(a.angle===b.angle?4:0)-Math.abs(Math.hypot(a.x-b.x,a.z-b.z)-3.6);if(s>score){best=[a,b];score=s;}}
 return best.length?best:candidates[0].slice(0,1).concat(candidates[0].length?[]:candidates[1].slice(0,1));
}
