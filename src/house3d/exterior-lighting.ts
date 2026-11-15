import {facadeStyle} from './facade-styles';
import type {Direction} from '../types';
export const EXTERIOR_LIGHTS={
 day:{label:'Clear daylight',color:'#fff9ee',sun:2.8,elevation:1.45,sky:'#b5d3e6',ground:'#bec1af',ambient:.14,hemisphere:.65,environment:.55,exposure:1,fixtures:.12},
 golden:{label:'Golden hour',color:'#ffe9cc',sun:2.6,elevation:.22,sky:'#c4d4e0',ground:'#bcb7a5',ambient:.16,hemisphere:.65,environment:.5,exposure:1,fixtures:.8},
 sunset:{label:'Sunset',color:'#ffe0bf',sun:1.9,elevation:.12,sky:'#aebfce',ground:'#b0ada2',ambient:.16,hemisphere:.7,environment:.5,exposure:1,fixtures:1.4},
 dusk:{label:'Dusk · warm house lights',color:'#bbcae1',sun:.32,elevation:.2,sky:'#748ca9',ground:'#899098',ambient:.18,hemisphere:.68,environment:.35,exposure:1.05,fixtures:3.2}
} as const;
export type ExteriorLightId=keyof typeof EXTERIOR_LIGHTS;
export function exteriorLighting(choice:string,style?:string){const key=choice==='recipe'?(facadeStyle(style)?.light||'golden'):choice==='warm'?'golden':choice;return EXTERIOR_LIGHTS[key as ExteriorLightId]||EXTERIOR_LIGHTS.day;}
export function recipeSun(facing:Direction,elevation:number,extent:number):[number,number,number]{
 const n=({north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]} as const)[facing];
 return [(n[0]*1.3+n[1]*.8)*extent,elevation*extent,(n[1]*1.3-n[0]*.8)*extent];
}
