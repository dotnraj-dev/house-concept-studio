import {applyTNSetbacks,tnSetbackMinimums} from './tn-rules';
import { designOf, type Plan, type PlotVertex, type Point, type Rect, type Requirements, type Settings, type SiteAnalysis } from './types';
const EPS=1e-7;
export const rounded=(v:number)=>Math.round(v*100)/100;
export function polygonArea(points:Point[]){return Math.abs(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p.x*q.y-q.x*p.y;},0))/2;}
function cross(a:Point,b:Point,c:Point){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
export function pointSegmentDistance(p:Point,a:Point,b:Point){
  const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
  const t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function properCross(a:Point,b:Point,c:Point,d:Point){return cross(a,b,c)*cross(a,b,d)<-EPS&&cross(c,d,a)*cross(c,d,b)<-EPS;}
export function pointInPolygon(p:Point,polygon:Point[]){
  if(polygon.some((a,i)=>pointSegmentDistance(p,a,polygon[(i+1)%polygon.length])<EPS))return true;
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
function segmentDistance(a:Point,b:Point,c:Point,d:Point){
  if(properCross(a,b,c,d))return 0;
  return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
export function corners(r:Rect):Point[]{return [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];}
export function rectFitsPlot(rect:Rect,poly:PlotVertex[],margin=0){
  const c=corners(rect);
  if(c.some(p=>!pointInPolygon(p,poly)))return false;
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];
    if(a.x>rect.x+EPS&&a.x<rect.x+rect.w-EPS&&a.y>rect.y+EPS&&a.y<rect.y+rect.h-EPS)return false;
    for(let j=0;j<4;j++){
      if(properCross(a,b,c[j],c[(j+1)%4]))return false;
      if(segmentDistance(a,b,c[j],c[(j+1)%4])+EPS<Math.max(0,a.setback)+margin)return false;
    }
  }
  return true;
}
export function validatePolygon(poly:Point[]):string[]{
  const issues:string[]=[];
  if(poly.length<3)return ['Add at least three measured plot corners.'];
  if(poly.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return ['Every plot corner needs finite coordinates.'];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];
    if(Math.hypot(a.x-b.x,a.y-b.y)<.05)issues.push('Two consecutive corners coincide. Remove duplicate corners.');
    for(let j=i+1;j<poly.length;j++){
      if(j===i+1||(i===0&&j===poly.length-1))continue;
      const c=poly[j],d=poly[(j+1)%poly.length];
      if(properCross(a,b,c,d)||pointSegmentDistance(a,c,d)<EPS||pointSegmentDistance(b,c,d)<EPS)issues.push('Plot boundaries cross or touch another edge. Correct the survey outline.');
    }
  }
  if(polygonArea(poly)<1)issues.push('The plot has no usable area.');
  return [...new Set(issues)];
}
export function plotVertices(req:Requirements,settings:Settings):PlotVertex[]{
  const d=designOf(req);
  if(d.plotMode==='polygon'&&d.vertices.length)return applyTNSetbacks(req,d.vertices.map(p=>({...p})));
  const values={north:settings.sideSetback,east:settings.sideSetback,south:settings.sideSetback,west:settings.sideSetback};
  values[req.roadSide]=settings.frontSetback;
  values[({north:'south',east:'west',south:'north',west:'east'} as const)[req.roadSide]]=settings.rearSetback;
  const s=d.customSetbacks?d.setbacks:values;
  return applyTNSetbacks(req,[
    {id:'A',x:0,y:0,setback:s.north,road:req.roadSide==='north'},
    {id:'B',x:req.plotWidth,y:0,setback:s.east,road:req.roadSide==='east'},
    {id:'C',x:req.plotWidth,y:req.plotDepth,setback:s.south,road:req.roadSide==='south'},
    {id:'D',x:0,y:req.plotDepth,setback:s.west,road:req.roadSide==='west'},
  ]);
}
export function analyseSite(req:Requirements,settings:Settings):SiteAnalysis{
  const raw=plotVertices(req,settings),issues=validatePolygon(raw);
  if(issues.length)return {polygon:raw,area:rounded(polygonArea(raw)),footprint:{x:0,y:0,w:0,h:0},issues,rectangular:false};
  const minX=Math.min(...raw.map(p=>p.x)),minY=Math.min(...raw.map(p=>p.y));
  const poly=raw.map(p=>({...p,x:p.x-minX,y:p.y-minY}));
  const W=Math.max(...poly.map(p=>p.x)),H=Math.max(...poly.map(p=>p.y));
  const rectangular=poly.length===4&&poly.every((p,i)=>Math.abs(p.x-poly[(i+1)%4].x)<EPS||Math.abs(p.y-poly[(i+1)%4].y)<EPS);
  let best:Rect={x:0,y:0,w:0,h:0};
  if(rectangular){
    let left=0,right=W,top=0,bottom=H;
    for(let i=0;i<4;i++){
      const a=poly[i],b=poly[(i+1)%4],s=Math.max(0,a.setback);
      if(a.x===0&&b.x===0)left=s;
      if(a.x===W&&b.x===W)right=W-s;
      if(a.y===0&&b.y===0)top=s;
      if(a.y===H&&b.y===H)bottom=H-s;
    }
    best={x:left,y:top,w:Math.max(0,right-left),h:Math.max(0,bottom-top)};
  }else{
    // A conservative orthogonal footprint; keep the true polygon for land and clearances.
    const n=56,dx=W/n,dy=H/n,heights=Array(n).fill(0),candidates:Rect[]=[];
    for(let y=0;y<n;y++){
      for(let x=0;x<n;x++){
        const p={x:(x+.5)*dx,y:(y+.5)*dy};
        const free=pointInPolygon(p,poly)&&poly.every((a,i)=>pointSegmentDistance(p,a,poly[(i+1)%poly.length])>=Math.max(0,a.setback));
        heights[x]=free?heights[x]+1:0;
      }
      const stack:number[]=[];
      for(let x=0;x<=n;x++){
        const h=x===n?0:heights[x];
        while(stack.length&&heights[stack[stack.length-1]]>h){
          const k=stack.pop()!,hh=heights[k],start=stack.length?stack[stack.length-1]+1:0;
          if(hh>0&&x>start)candidates.push({x:start*dx,y:(y+1-hh)*dy,w:(x-start)*dx,h:hh*dy});
        }
        stack.push(x);
      }
    }
    candidates.sort((a,b)=>b.w*b.h-a.w*a.h);
    for(const candidate of candidates.slice(0,500)){
      if(candidate.w*candidate.h<=best.w*best.h)continue;
      for(let shrink=0;shrink<=2;shrink++){
        const r={x:candidate.x+shrink*dx/2,y:candidate.y+shrink*dy/2,w:candidate.w-shrink*dx,h:candidate.h-shrink*dy};
        if(r.w>0&&r.h>0&&rectFitsPlot(r,poly)&&r.w*r.h>best.w*best.h){best=r;break;}
      }
    }
  }
  if(tnSetbackMinimums(req)){const maximum=polygonArea(poly)*2/Math.max(1,req.floors);if(best.w*best.h>maximum){const scale=Math.sqrt(maximum/(best.w*best.h));best={x:best.x+best.w*(1-scale)/2,y:best.y+best.h*(1-scale)/2,w:best.w*scale,h:best.h*scale};issues.push('The footprint was reduced to stay within the base FSI 2.0 envelope; no premium FSI or exclusions were assumed.');}}
  best={x:rounded(best.x),y:rounded(best.y),w:Math.floor(best.w*100)/100,h:Math.floor(best.h*100)/100};
  // Rounding an inset position must not move a footprint across a boundary.
  if(best.w>0&&!rectFitsPlot(best,poly)){best={x:best.x+.02,y:best.y+.02,w:Math.max(0,best.w-.04),h:Math.max(0,best.h-.04)};}
  if(best.w<16||best.h<20)issues.push('The plot is too small after setbacks for a comfortable house in the available planning patterns. Adjust the brief or review the surveyed boundaries.');
  return {polygon:poly,area:rounded(polygonArea(poly)),footprint:best,issues,rectangular};
}
export function plotPoint(plan:Plan,p:Point){return {x:p.x+plan.offsetX,y:p.y+plan.offsetY};}

