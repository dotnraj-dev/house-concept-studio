import {useEffect,useMemo} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
/** Contact shading on the real scene. No synthetic facade or image replacement. */
export function PresentationEffects(){
 const {gl,scene,camera,size}=useThree();
 const fx=useMemo(()=>{const composer=new EffectComposer(gl);composer.setPixelRatio(Math.min(gl.getPixelRatio(),1.35));composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,512,512,12);ao.kernelRadius=.9;ao.minDistance=.0003;ao.maxDistance=.04;composer.addPass(ao);const output=new OutputPass();composer.addPass(output);return {composer,ao,output};},[gl,scene,camera]);
 useEffect(()=>{fx.composer.setSize(size.width,size.height);const scale=Math.min(1,850/Math.max(size.width,size.height));fx.ao.setSize(Math.round(size.width*scale),Math.round(size.height*scale));},[fx,size.width,size.height]);
 useEffect(()=>()=>{fx.ao.dispose();fx.output.dispose();fx.composer.dispose();},[fx]);
 useFrame((_,dt)=>{const hidden:typeof scene[]=[];scene.traverse(o=>{if(o.userData.interactionId&&o.visible){hidden.push(o as typeof scene);o.visible=false;}});const auto=gl.shadowMap.autoUpdate;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;try{fx.composer.render(dt);}finally{gl.shadowMap.autoUpdate=auto;hidden.forEach(o=>o.visible=true);}},1);return null;
}
