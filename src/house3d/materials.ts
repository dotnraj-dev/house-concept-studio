import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

export type Surface='plaster'|'tile'|'timber'|'woodfloor'|'stone'|'fabric'|'concrete'|'grass'|'paint'|'limestone'|'stackstone'|'pavers'|'marble';
export type PbrSurface=Exclude<Surface,'concrete'|'grass'>;
export const PBR_SURFACES:PbrSurface[]=['stackstone','pavers','marble','paint','limestone','plaster','tile','timber','woodfloor','stone','fabric'];
const cache=new Map<Surface,CanvasTexture>();

function makeTexture(surface:Surface):CanvasTexture{
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=512;
  const context=canvas.getContext('2d')!;
  const image=context.createImageData(512,512);
  const base:Record<Surface,[number,number,number]>={
    stackstone:[184,165,141],pavers:[170,167,153],marble:[235,232,223],paint:[248,245,240],limestone:[219,214,202],plaster:[237,233,222],tile:[218,216,207],timber:[166,123,82],woodfloor:[180,138,96],stone:[197,190,177],
    concrete:[183,183,174],grass:[96,130,89],fabric:[180,180,170],
  };
  let seed=surface.split('').reduce((value,char)=>value*31+char.charCodeAt(0),7)>>>0;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const [r,g,b]=base[surface];
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const index=(y*512+x)*4;
    const grain=surface==='timber'?Math.sin(x*.14+Math.sin(y*.014)*7)*8+Math.sin(x*.055+y*.009)*7:0;
    const aggregate=surface==='grass'?Math.sin(x*.27+y*.12)*11:0;
    const noise=(random()-.5)*(surface==='plaster'?10:surface==='timber'?25:surface==='grass'?42:20);
    const shade=grain+aggregate+noise;
    image.data[index]=Math.max(0,Math.min(255,r+shade));
    image.data[index+1]=Math.max(0,Math.min(255,g+shade*.88));
    image.data[index+2]=Math.max(0,Math.min(255,b+shade*.72));
    image.data[index+3]=255;
  }
  context.putImageData(image,0,0);
  if(surface==='tile'||surface==='stone'){
    const cell=surface==='tile'?128:170;
    context.strokeStyle=surface==='tile'?'rgba(125,124,118,.42)':'rgba(110,105,94,.28)';
    context.lineWidth=surface==='tile'?3:2;
    for(let line=0;line<=512;line+=cell){
      context.beginPath();context.moveTo(line,0);context.lineTo(line,512);context.stroke();
      context.beginPath();context.moveTo(0,line);context.lineTo(512,line);context.stroke();
    }
  }
  if(surface==='timber'){
    context.strokeStyle='rgba(72,48,27,.24)';context.lineWidth=2;
    for(let x=0;x<512;x+=128){context.beginPath();context.moveTo(x,0);context.lineTo(x,512);context.stroke();}
  }
  const texture=new CanvasTexture(canvas);
  texture.colorSpace=SRGBColorSpace;
  texture.wrapS=texture.wrapT=RepeatWrapping;
  texture.anisotropy=8;
  return texture;
}

export function surfaceTexture(surface:Surface,size:[number,number,number]):Texture{
  let master=cache.get(surface);
  if(!master){master=makeTexture(surface);cache.set(surface,master);}
  const texture=master.clone();
  const horizontal=surface==='timber'?Math.max(1,size[0]/2.6):Math.max(1,size[0]/4);
  const vertical=surface==='timber'?Math.max(1,size[1]/5):Math.max(1,(size[1]>size[2]?size[1]:size[2])/4);
  texture.repeat.set(horizontal,vertical);
  texture.needsUpdate=true;
  return texture;
}
