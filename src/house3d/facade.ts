import {palette} from '../regions';
import type {Plan} from '../types';
import type {HouseLayout} from './layout';
import {FLOOR_HEIGHT} from './layout';
export type FacadePiece={id:string;position:[number,number,number];size:[number,number,number];surface:'stone'|'timber'|'concrete';color:string};

/** Decorative details follow real openings and never invent another entrance or balcony. */
export function facadePieces(plan:Plan,layout:HouseLayout):FacadePiece[]{
  const pieces:FacadePiece[]=[],style=palette(plan.design?.style),eave=style.eave;
  for(const window of layout.windows){
    const alongX=window.axis==='x',cx=window.x+(alongX?window.width/2:0),cz=window.z+(alongX?0:window.width/2),base=window.floor*FLOOR_HEIGHT;
    pieces.push({id:window.id+'-chajja',position:[cx+window.outward[0]*(.42+eave*.3),base+6.75,cz+window.outward[1]*(.42+eave*.3)],size:alongX?[window.width+.85,.16,1+eave*.65]:[1+eave*.65,.16,window.width+.85],surface:'concrete',color:'#e3ded3'});
    pieces.push({id:window.id+'-sill',position:[cx+window.outward[0]*.16,base+2.98,cz+window.outward[1]*.16],size:alongX?[window.width+.35,.13,.48]:[.48,.13,window.width+.35],surface:'stone',color:'#c4b9a8'});
  }
  const door=layout.doors.find(d=>d.main);
  if(door?.facing){
    const alongX=door.axis==='x',n=door.facing==='north'?[0,-1]:door.facing==='south'?[0,1]:door.facing==='east'?[1,0]:[-1,0];
    const cx=door.x+(alongX?door.width/2:0),cz=door.z+(alongX?0:door.width/2);
    pieces.push({id:'entrance-canopy',position:[cx+n[0]*1.05,7.65,cz+n[1]*1.05],size:alongX?[door.width+2,.25,2.5]:[2.5,.25,door.width+2],surface:'timber',color:'#a48863'});
    // A layered soffit reads as a sheltered threshold without adding columns in the approach.
    if(eave>=1.25){for(let i=-3;i<=3;i++){const side=i*(door.width+1.5)/7;pieces.push({id:'entry-rafter-'+i,position:[cx+(alongX?side:n[0]*1.12),7.42,cz+(alongX?n[1]*1.12:side)],size:alongX?[.12,.18,2.62]:[2.62,.18,.12],surface:'timber',color:style.trim});}}
    for(const side of [-1,1])pieces.push({id:'entrance-trim-'+side,position:[cx+(alongX?side*(door.width/2+.25):n[0]*.1),3.5,cz+(alongX?n[1]*.1:side*(door.width/2+.25))],size:alongX?[.16,7,.25]:[.25,7,.16],surface:'stone',color:'#c7b696'});
  }
  for(let floor=1;floor<(plan.levels||1);floor++){
    pieces.push({id:`band-${floor}-north`,position:[plan.width/2,floor*FLOOR_HEIGHT-.3,-.14],size:[plan.width,.28,.34],surface:'stone',color:'#c9c0ae'});
    pieces.push({id:`band-${floor}-south`,position:[plan.width/2,floor*FLOOR_HEIGHT-.3,plan.depth+.14],size:[plan.width,.28,.34],surface:'stone',color:'#c9c0ae'});
    for(const side of [0,plan.width])pieces.push({id:`band-${floor}-${side}`,position:[side,floor*FLOOR_HEIGHT-.3,plan.depth/2],size:[.34,.28,plan.depth],surface:'stone',color:'#c9c0ae'});
  }
  return pieces;
}
