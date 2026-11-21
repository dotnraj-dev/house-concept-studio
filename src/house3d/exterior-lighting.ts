import {facadeStyle} from './facade-styles';
import type {Direction} from '../types';

/** Sun elevation in radians; intensities are calibrated for ACES output in the feet scene. */
export const EXTERIOR_LIGHTS={
 day:{label:'Clear daylight',color:'#fff8ee',sun:2.65,elevation:.94,sky:'#a9cbe3',ground:'#b8b5a4',ambient:.035,hemisphere:.48,environment:.46,exposure:.86,fixtures:.12},
 golden:{label:'Golden hour',color:'#ffd6a0',sun:2.45,elevation:.29,sky:'#c9d2d8',ground:'#b7ad98',ambient:.05,hemisphere:.44,environment:.43,exposure:.9,fixtures:.7},
 sunset:{label:'Sunset',color:'#ffc28c',sun:1.95,elevation:.13,sky:'#a8b6c8',ground:'#ab9f92',ambient:.07,hemisphere:.48,environment:.4,exposure:.91,fixtures:1.2},
 dusk:{label:'Dusk · warm house lights',color:'#b9c8df',sun:.24,elevation:.055,sky:'#748ca9',ground:'#899098',ambient:.08,hemisphere:.31,environment:.22,exposure:.94,fixtures:3.2}
} as const;
export type ExteriorLightId=keyof typeof EXTERIOR_LIGHTS;
export function exteriorLighting(choice:string,style?:string){const key=choice==='recipe'?(facadeStyle(style)?.light||'golden'):choice==='warm'?'golden':choice;return EXTERIOR_LIGHTS[key as ExteriorLightId]||EXTERIOR_LIGHTS.day;}
export function recipeSun(facing:Direction,elevation:number,extent:number):[number,number,number]{
 const n=({north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]} as const)[facing];
 const azimuth=[n[0]*1.3+n[1]*.8,n[1]*1.3-n[0]*.8];
 const length=Math.hypot(...azimuth),distance=extent*2;
 return [azimuth[0]/length*Math.cos(elevation)*distance,Math.sin(elevation)*distance,azimuth[1]/length*Math.cos(elevation)*distance];
}
