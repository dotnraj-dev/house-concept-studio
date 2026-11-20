import {useRef,useState,type MutableRefObject} from 'react';
export type TouchMotion={forward:number;side:number;lookX:number;lookY:number;jump:boolean;crouch:boolean;interact:boolean};
export const emptyMotion=():TouchMotion=>({forward:0,side:0,lookX:0,lookY:0,jump:false,crouch:false,interact:false});
export function TouchWalkControls({motion}:{motion:MutableRefObject<TouchMotion>}){
 const [crouched,setCrouched]=useState(false);
 const origin=useRef({x:0,y:0}),stick=useRef<HTMLSpanElement>(null);
 const reset=()=>{motion.current.forward=0;motion.current.side=0;if(stick.current)stick.current.style.transform='translate(0,0)';};
 return <div className="touch-walk" aria-label="Touch walking controls">
 <div className="walk-joystick" role="slider" tabIndex={0} aria-label="Move joystick" aria-valuemin={-1} aria-valuemax={1} aria-valuenow={0}
 onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);origin.current={x:e.clientX,y:e.clientY};}}
 onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const x=e.clientX-origin.current.x,y=e.clientY-origin.current.y,len=Math.max(1,Math.hypot(x,y)/34);motion.current.side=x/len/34;motion.current.forward=-y/len/34;if(stick.current)stick.current.style.transform='translate('+x/len+'px,'+y/len+'px)';}}
 onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}
 onKeyDown={e=>{if(e.key.startsWith('Arrow')){e.preventDefault();motion.current.forward=e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0;motion.current.side=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;}}} onKeyUp={reset} onBlur={reset}><span ref={stick}/><small>MOVE</small></div>
 <div className="touch-actions"><button onClick={()=>motion.current.jump=true}>Jump</button><button aria-pressed={crouched} onClick={()=>{motion.current.crouch=!motion.current.crouch;setCrouched(motion.current.crouch);}}>Crouch</button><button onClick={()=>motion.current.interact=true}>Interact</button></div>
 <span className="touch-look-hint">Drag the view to look around</span></div>;
}
