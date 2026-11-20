export type WorkspaceMode='brief'|'plan'|'model'|'present'|'proposal';
export type Selection={kind:'room';id:string}|{kind:'floor';floor:number}|{kind:'facade'}|{kind:'site'}|{kind:'object';id:string;label:string;roomId?:string}|null;
export type DockTab='rules'|'renders'|'quote'|'climate';
export type DeviceClass='desktop'|'tablet'|'phone';
export const deviceClass=(width:number):DeviceClass=>width>=1280?'desktop':width>=768?'tablet':'phone';
export type PanelPrefs={left:number;right:number;dock:number;sheet:number;leftOpen:boolean;rightOpen:boolean};
export const DEFAULT_PANELS:PanelPrefs={left:224,right:292,dock:280,sheet:360,leftOpen:true,rightOpen:true};
export function panelPrefs(value:unknown):PanelPrefs{
 const p=(value&&typeof value==='object'?value:{}) as Partial<PanelPrefs>;
 const clamp=(n:unknown,fallback:number,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
 return {left:clamp(p.left,224,190,350),right:clamp(p.right,292,248,420),dock:clamp(p.dock,280,180,560),sheet:clamp(p.sheet,360,180,650),leftOpen:typeof p.leftOpen==='boolean'?p.leftOpen:true,rightOpen:typeof p.rightOpen==='boolean'?p.rightOpen:true};
}
export function readDevice<T>(key:string,device:DeviceClass,fallback:T):T{try{const saved=localStorage.getItem('hcs:'+key+':'+device);return saved?JSON.parse(saved):fallback;}catch{return fallback;}}
export function saveDevice(key:string,device:DeviceClass,value:unknown){try{localStorage.setItem('hcs:'+key+':'+device,JSON.stringify(value));}catch{/* Private browsing/full storage must not prevent use. */}}
