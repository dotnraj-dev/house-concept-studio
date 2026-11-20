import {useEffect,useState} from 'react';
import {deviceClass} from '../workspace-state';
export function useDevice(){const [device,setDevice]=useState(()=>deviceClass(window.innerWidth));useEffect(()=>{const resize=()=>setDevice(deviceClass(window.innerWidth));window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);return device;}
export function useTouch(){const [touch,setTouch]=useState(()=>matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0);useEffect(()=>{const m=matchMedia('(pointer: coarse)'),change=()=>setTouch(m.matches||navigator.maxTouchPoints>0);m.addEventListener('change',change);return()=>m.removeEventListener('change',change);},[]);return touch;}
