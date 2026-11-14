import {BoxGeometry} from 'three';
export function architecturalBox(size:readonly number[],position:readonly number[],tile=5){
 const g=new BoxGeometry(...size as [number,number,number]),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const side=Math.floor(i/4),x=p.getX(i)+position[0],y=p.getY(i)+position[1],z=p.getZ(i)+position[2];uv.setXY(i,(side<2?z:x)/tile,(side===2||side===3?z:y)/tile);}
 uv.needsUpdate=true;return g;
}
