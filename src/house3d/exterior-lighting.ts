import {facadeStyle} from './facade-styles';
import type {Direction} from '../types';
export const EXTERIOR_LIGHTS={
 day:{label:'Clear daylight',color:'#fff6e8',sun:3.5,elevation:1.15,sky:'#a9cbe3',ground:'#b8b5a4',ambient:.03,hemisphere:.36,environment:.4,exposure:1.02,fixtures:.12},
 golden:{label:'Golden hour',color:'#ffd9a8',sun:3.3,elevation:.3,sky:'#c9d2d8',ground:'#b7ad98',ambient:.04,hemisphere:.4,environment:.36,exposure:1.04,fixtures:.8},
 sunset:{label:'Sunset',color:'#ffc996',sun:2.6,elevation:.16,sky:'#a8b6c8',ground:'#ab9f92',ambient:.05,hemisphere:.46,environment:.34,exposure:1.05,fixtures:1.4},
 dusk:{label:'Dusk · warm house lights',color:'#bbcae1',sun:.32,elevation:.2,sky:'#748ca9',ground:'#899098',ambient:.18,hemisphere:.68,environment:.35,exposure:1.05,fixtures:3.2}
} as const;
export type ExteriorLightId=keyof typeof EXTERIOR_LIGHTS;
export function exteriorLighting(choice:string,style?:string){const key=choice==='recipe'?(facadeStyle(style)?.light||'golden'):choice==='warm'?'golden':choice;return EXTERIOR_LIGHTS[key as ExteriorLightId]||EXTERIOR_LIGHTS.day;}
export function recipeSun(facing:Direction,elevation:number,extent:number):[number,number,number]{
 const n=({north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]} as const)[facing];
 return [(n[0]*1.3+n[1]*.8)*extent,elevation*extent,(n[1]*1.3-n[0]*.8)*extent];
}
