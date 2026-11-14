import {useMemo,useEffect} from 'react';
import {BufferGeometry,Float32BufferAttribute,DoubleSide} from 'three';
// Individual swept leaflets on curved fronds; single batched crown mesh per palm.
export function StreetTree({height,width,x}:{height:number;width:number;x:number}){
 const geo=useMemo(()=>{const pos:number[]=[],rgb:number[]=[];const R=width*.48,H=height*.72;
 for(let j=0;j<15;j++){const a=j*2.39996+.4,l=R*(.65+.35*Math.sin(j*7.9)**2),c=Math.cos(a),s=Math.sin(a);
  const point=(t:number)=>[c*l*t,H+height*(.3*Math.sin(t*2.7)-.11*t*t),s*l*t];
  for(let i=0;i<19;i++){const t=.03+i/20,[bx,by,bz]=point(t),q=point(t+.06);
   for(const sign of [-1,1]){const len=l*(.03+.21*Math.sin(Math.PI*t)**.7),ex=bx+c*l*.12-s*len*sign,ez=bz+s*l*.12+c*len*sign,ey=by-height*.08*(.55+t);
    pos.push(bx,by,bz,q[0],q[1],q[2],ex,ey,ez);const tone=.72+.24*Math.sin(i*.4+a)**2;for(let k=0;k<3;k++)rgb.push(.077*tone,.17*tone,.042*tone);}
  }}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('color',new Float32BufferAttribute(rgb,3));g.computeVertexNormals();return g;
 },[height,width]);useEffect(()=>()=>geo.dispose(),[geo]);
 return <group position={[x,.1,0]}><mesh position={[0,height*.36,0]} castShadow><cylinderGeometry args={[Math.min(width*.04,.32),Math.min(width*.065,.46),height*.72,12]}/><meshStandardMaterial color="#927c62" roughness={1}/></mesh><mesh geometry={geo} receiveShadow castShadow><meshStandardMaterial vertexColors side={DoubleSide} roughness={.87}/></mesh></group>;
}
