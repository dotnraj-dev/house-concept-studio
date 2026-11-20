export type QualityLevel='high'|'balanced'|'low';
export type QualityChoice='auto'|QualityLevel;
export const QUALITY={high:{dpr:1.7,ssao:true,reflections:true,shadow:2048,distant:true},balanced:{dpr:1,ssao:false,reflections:false,shadow:1024,distant:true},low:{dpr:.75,ssao:false,reflections:false,shadow:512,distant:false}} as const;
export function nextQuality(level:QualityLevel,fps:number):QualityLevel{return fps<40?(level==='high'?'balanced':level==='balanced'?'low':'low'):level;}
export function qualityChoice(value:unknown):QualityChoice{return ['auto','high','balanced','low'].includes(String(value))?value as QualityChoice:'auto';}
