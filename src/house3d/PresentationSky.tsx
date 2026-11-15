import {useMemo} from 'react';
import {Color,Vector3,BackSide} from 'three';
import type {ExteriorLightId} from './exterior-lighting';
const palettes={
 day:['#89b5d6','#e2eaeb'],
 golden:['#d9c1ab','#f4dcbb'],
 sunset:['#7d91b5','#ebc9bb'],
 dusk:['#263e67','#8e9cb5']
} as const;
/** Procedural sky only; the measured house and streetscape remain navigable geometry. */
export function PresentationSky({preset,sun}:{preset:ExteriorLightId;sun:[number,number,number]}){
 const uniforms=useMemo(()=>({zenith:{value:new Color(palettes[preset][0])},horizon:{value:new Color(palettes[preset][1])},sunDirection:{value:new Vector3(...sun).normalize()},sunGlow:{value:preset==='dusk'?0:preset==='day'?.25:.6}}),[preset,...sun]);
 return <mesh scale={[1000,1000,1000]} renderOrder={-100} frustumCulled={false}>
  <sphereGeometry args={[1,24,12]}/>
  <shaderMaterial side={BackSide} depthWrite={false} toneMapped={false} uniforms={uniforms}
   vertexShader={`varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}`}
   fragmentShader={`uniform vec3 zenith;uniform vec3 horizon;uniform vec3 sunDirection;uniform float sunGlow;varying vec3 skyDirection;
    void main(){vec3 dir=normalize(skyDirection);float height=pow(max(0.,dir.y),.45);vec3 c=mix(horizon,zenith,height);
     float glow=pow(max(dot(dir,sunDirection),0.),24.)*sunGlow;c+=vec3(.15,.09,.035)*glow;
     gl_FragColor=vec4(c,1.);
     #include <colorspace_fragment>
    }`}/>
 </mesh>;
}
