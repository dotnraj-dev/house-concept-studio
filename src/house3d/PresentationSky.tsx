import {useMemo} from 'react';
import {Color,Vector3,BackSide} from 'three';
import type {ExteriorLightId} from './exterior-lighting';
const palettes={
 day:['#4e91ca','#d7e7f1'],
 golden:['#668fc2','#f1d0a8'],
 sunset:['#607dad','#efb693'],
 dusk:['#29446e','#8d9db8']
} as const;
/** Procedural sky only; the measured house and streetscape remain navigable geometry. */
export function PresentationSky({preset,sun}:{preset:ExteriorLightId;sun:[number,number,number]}){
 const uniforms=useMemo(()=>({zenith:{value:new Color(palettes[preset][0])},horizon:{value:new Color(palettes[preset][1])},sunDirection:{value:new Vector3(...sun).normalize()},sunGlow:{value:preset==='dusk'?.08:preset==='day'?.3:.7}}),[preset,...sun]);
 return <mesh scale={[1000,1000,1000]} renderOrder={-100} frustumCulled={false}>
  <sphereGeometry args={[1,24,12]}/>
  <shaderMaterial side={BackSide} depthWrite={false} toneMapped={false} uniforms={uniforms}
   vertexShader={`varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}`}
   fragmentShader={`uniform vec3 zenith;uniform vec3 horizon;uniform vec3 sunDirection;uniform float sunGlow;varying vec3 skyDirection;
    void main(){vec3 dir=normalize(skyDirection);float height=pow(max(0.,dir.y),.19);vec3 c=mix(horizon,zenith,height);
     float horizonHaze=exp(-max(dir.y,0.)*17.);c=mix(c,horizon*.94+vec3(.07,.07,.065),horizonHaze*.32);
     float solar=max(dot(dir,sunDirection),0.);float glow=pow(solar,32.)*sunGlow;c+=vec3(.23,.14,.055)*glow;
     c+=vec3(.55,.39,.2)*smoothstep(.9995,1.,solar)*sunGlow;
     gl_FragColor=vec4(c,1.);
     #include <colorspace_fragment>
    }`}/>
 </mesh>;
}
