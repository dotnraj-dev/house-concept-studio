import {PresentationSky} from './PresentationSky';
import type {ExteriorLightId} from './exterior-lighting';
import {Suspense,useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import {Environment} from '@react-three/drei';
import type {Plan} from '../types';
import {exteriorLighting,recipeSun} from './exterior-lighting';
type SunStudy={direction:number[];daylight:boolean;elevation:number};
export function ExteriorLightRig({plan,choice,extent,study}:{plan:Plan;choice:string;extent:number;study?:SunStudy}){
 const {gl}=useThree(),preset=exteriorLighting(choice,plan.design?.style);
 const dusk=!study&&preset===exteriorLighting('dusk');
 const position=study?study.direction.map(n=>n*extent*2) as [number,number,number]:recipeSun(plan.roadSide,preset.elevation,extent);
 const daylight=study?study.daylight:true;
 const skyPreset:ExteriorLightId=study?(study.daylight?(study.elevation<18?'golden':'day'):'dusk'):choice==='recipe'?(plan.design?.style==='tn-narrow-g2'?'dusk':plan.design?.style==='tn-curved-villa'?'sunset':plan.design?.style==='tn-contemporary-slats'?'golden':'day'):choice==='warm'?'golden':choice as ExteriorLightId;
 useEffect(()=>{gl.toneMappingExposure=preset.exposure;},[gl,preset]);
 return <>
  <color attach="background" args={[preset.sky]}/>
  <fog attach="fog" args={[preset.sky,extent*2.2,extent*8]}/>
  <PresentationSky preset={skyPreset} sun={position}/>
  <Suspense fallback={null}><Environment files="/assets/materials/daylight.hdr" background={false} environmentIntensity={daylight?preset.environment:.1}/></Suspense>
  <ambientLight intensity={daylight?preset.ambient:.06}/>
  <hemisphereLight args={[preset.sky,preset.ground,daylight?preset.hemisphere:.12]}/>
  <directionalLight position={position} intensity={study?(daylight?2.9*Math.min(1,study.direction[1]*3):0):preset.sun}
   color={study?(study.elevation<18?'#ffe2c3':'#fff9ee'):preset.color} castShadow={!dusk} shadow-mapSize={[2048,2048]}
   shadow-bias={-.00018} shadow-normalBias={.025} shadow-camera-near={.1} shadow-camera-far={extent*5}
   shadow-camera-left={-extent} shadow-camera-right={extent} shadow-camera-top={extent} shadow-camera-bottom={-extent}/>
 </>;
}
