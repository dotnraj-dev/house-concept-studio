import {z} from 'zod';

export const renderOptionsSchema=z.object({
  requestId:z.uuid(),
  provider:z.enum(['runpod','gpu-worker']).default('gpu-worker'),
  camera:z.object({
    position:z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]),
    quaternion:z.tuple([z.number().finite(),z.number().finite(),z.number().finite(),z.number().finite()]).refine(q=>Math.abs(Math.hypot(...q)-1)<.02,'Invalid camera rotation.'),
    fov:z.number().min(15).max(110).default(52),
    units:z.enum(['feet','metres']).default('feet'),
  }),
  samples:z.union([z.literal(128),z.literal(256),z.literal(512)]).default(256),
  width:z.union([z.literal(1280),z.literal(1920),z.literal(3840)]).default(1920),
});
export type RenderOptions=z.infer<typeof renderOptionsSchema>;
export type RenderProvider=RenderOptions['provider'];
export type RenderJob={id:string;status:string;message:string;imageUrl:string|null;createdAt:string;provider:RenderProvider;elapsedSeconds:number|null;hourlyRateInr:number|null};
export const ACTIVE_RENDER_STATES=['SUBMITTING','IN_QUEUE','IN_PROGRESS','SUBMISSION_UNKNOWN'];
export const RENDER_PROFILES=[
  {id:'draft',name:'Test render',description:'Check the view and materials',width:1280 as const,samples:128 as const},
  {id:'presentation',name:'Presentation',description:'Full HD with refined lighting',width:1920 as const,samples:256 as const},
  {id:'detail',name:'Fine detail',description:'4K output; longer rendering',width:3840 as const,samples:512 as const},
];
export function computeRenderCost(seconds:number,rate:number){return Math.round(Math.max(0,seconds)*Math.max(0,rate)/3600*100)/100;}
