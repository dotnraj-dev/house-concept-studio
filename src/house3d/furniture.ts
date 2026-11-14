import type {Room} from '../types';

/** Shared measured footprints for the furnished plan and the rendered room. Feet. */
export function livingFurniture(room:Room){
  const tx=room.featureX??room.x+room.w*.55,x=Math.max(room.x+3.5,Math.min(room.x+room.w-3.5,tx)),z=room.y+room.h*.67;
  return {
    sofa:{x,z,w:Math.min(6.3,room.w*.6),d:2.9},
    rug:{x,z:(room.y+z)/2,w:Math.min(7,room.w*.5),d:Math.min(5.3,room.h*.55)},
    coffee:{x,z:Math.max(room.y+1.8,z-3.7),w:2.8,d:2.8},
    tv:{x:tx,z:room.y+.5,w:3.5,d:.18},
  };
}
export function bedroomFurniture(room:Room){
  const d=Math.max(4,Math.min(6.5,room.h-2.4));return {x:Math.max(room.x+3.2,Math.min(room.x+room.w-3.2,room.featureX??room.x+room.w/2)),z:room.y+.65+d/2,w:Math.max(2.5,Math.min(5.2,room.w-2.4)),d};
}
export function diningFurniture(room:Room){
  const x=room.x+room.w/2,z=room.y+room.h/2;
  return {x,z,w:Math.min(3.9,room.w*.33),d:Math.min(2.3,room.h*.29),
    chairs:[-1,1].flatMap(side=>[-.96,.96].map(offset=>({x:x+side*2.4,z:z+offset,w:1.8,d:1.6,rotation:side>0?Math.PI/2:-Math.PI/2})))};
}
