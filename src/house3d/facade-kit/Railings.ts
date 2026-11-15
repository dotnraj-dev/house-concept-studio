import {Group} from 'three';
import {beam,instances,profile,mount} from './geometry';
import type {FacadeContext,Rect} from './layout';
import type {MaterialSet} from './materials';
export function GlassRailing(c:FacadeContext,r:Rect,m:MaterialSet){
 const g=mount(c,r,-.12);g.name='Frameless glass balcony guard';
 const count=Math.max(1,Math.ceil(r.w/3.5)),panel=r.w/count;
 for(let i=0;i<count;i++)g.add(beam([panel-.035,r.h-.15,.045],m.glass,[-r.w/2+(i+.5)*panel,0,0],.012));
 g.add(beam([r.w,.065,.095],m.metal,[0,r.h/2,0],.02));g.add(beam([r.w,.12,.13],m.metal,[0,-r.h/2,0],.02));return g;
}
export function MsRailing(c:FacadeContext,r:Rect,m:MaterialSet){
 const g=mount(c,r,-.10);g.name='Painted steel balcony guard';const poses=[];
 for(let x=-r.w/2+.08;x<r.w/2;x+=.32)poses.push({at:[x,0,0] as [number,number,number]});
 g.add(instances(profile(.045,r.h,.045,.012),m.metal,poses,'Instanced MS railing bars'));
 for(const y of [-r.h/2,r.h/2])g.add(beam([r.w,.07,.085],m.metal,[0,y,0],.02));return g;
}
