export type PlanViewport={x:number;y:number;w:number;h:number};
export type PlanPoint={x:number;y:number};
export const MIN_ZOOM=.45;
export const MAX_ZOOM=8;
export function fitPlan(width:number,height:number,padding=6):PlanViewport{
 return {x:-padding,y:-padding,w:width+padding*2,h:height+padding*2};
}
export function zoomAt(view:PlanViewport,point:PlanPoint,factor:number):PlanViewport{
 if(!Number.isFinite(factor)||factor<=0)throw Error('Zoom factor must be positive.');
 return {x:point.x-(point.x-view.x)/factor,y:point.y-(point.y-view.y)/factor,w:view.w/factor,h:view.h/factor};
}
export function panBy(view:PlanViewport,dx:number,dy:number):PlanViewport{return {...view,x:view.x+dx,y:view.y+dy};}
export function fitBounds(x:number,y:number,w:number,h:number,aspect:number,padding=.15):PlanViewport{
 const bw=Math.max(1,w)*(1+padding*2),bh=Math.max(1,h)*(1+padding*2),ratio=Math.max(.1,aspect);
 const vw=Math.max(bw,bh*ratio),vh=vw/ratio;
 return {x:x+w/2-vw/2,y:y+h/2-vh/2,w:vw,h:vh};
}
