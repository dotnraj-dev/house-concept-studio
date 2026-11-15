import {useMemo,useEffect} from 'react';
import type {Plan} from '../types';
import {buildStreetscape} from './streetscape';
export function Streetscape({plan}:{plan:Plan}){
 const model=useMemo(()=>buildStreetscape(plan),[plan]);
 useEffect(()=>()=>model.dispose(),[model]);
 return <primitive object={model.root}/>;
}
