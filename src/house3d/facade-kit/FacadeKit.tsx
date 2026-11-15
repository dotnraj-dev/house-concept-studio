import {useMemo,useEffect} from 'react';
import {useTexture} from '@react-three/drei';
import type {Plan} from '../../types';
import type {HouseLayout} from '../layout';
import {KIT_TEXTURE_PATHS} from './materials';
import {buildFacade} from './build';
export function FacadeKit({plan,layout,servicesVisible=false,lightPower=1}:{plan:Plan;layout:HouseLayout;servicesVisible?:boolean;lightPower?:number}){
 const textures=useTexture(KIT_TEXTURE_PATHS);
 const model=useMemo(()=>buildFacade(plan,layout,textures,{servicesVisible,lightPower}),[plan,layout,servicesVisible,lightPower,...textures]);
 useEffect(()=>()=>model.dispose(),[model]);
 return <primitive object={model.root}/>;
}
