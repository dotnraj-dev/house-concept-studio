import {MeshPhysicalMaterial,MeshDepthMaterial,RGBADepthPacking,DoubleSide,RepeatWrapping,SRGBColorSpace,type Texture,type Material} from 'three';
import type {FacadeStyle} from '../facade-styles';
export const KIT_TEXTURE_PATHS=['paint-color','paint-normal','timber-color','timber-normal','facade-stone-color','facade-stone-normal','facade-stone-roughness'].map(n=>'/assets/materials/'+n+'.jpg').concat(['star','cross','flower'].map(n=>'/assets/materials/jaali-'+n+'.png'));
export type MaterialSet=ReturnType<typeof kitMaterials>;
export function kitMaterials(style:FacadeStyle,sources:Texture[]=[]){
 const owned:Texture[]=[],materials:Material[]=[];
 const texture=(i:number)=>{if(!sources[i])return null;const t=sources[i].clone();t.wrapS=t.wrapT=RepeatWrapping;t.anisotropy=8;if([0,2,4,7,8,9].includes(i))t.colorSpace=SRGBColorSpace;t.needsUpdate=true;owned.push(t);return t;};
 const paintMap=texture(0),paintNormal=texture(1),woodMap=texture(2),woodNormal=texture(3),stoneMap=texture(4),stoneNormal=texture(5),stoneRough=texture(6);
 const make=(options:ConstructorParameters<typeof MeshPhysicalMaterial>[0])=>{const m=new MeshPhysicalMaterial(options);materials.push(m);return m;};
 const paint=make({color:style.wall,map:paintMap,normalMap:paintNormal,roughness:.7});
 const accent=make({color:style.accent,map:paintMap,roughness:.73});
 const stone=make({color:style.stone,map:stoneMap,normalMap:stoneNormal,roughnessMap:stoneRough,roughness:.88});
 const timber=make({color:style.timber,map:woodMap,normalMap:woodNormal,roughness:.5,clearcoat:.12});
 const metal=make({color:style.metal,metalness:.55,roughness:.32});
 const glass=make({color:'#bdd8d0',transparent:true,opacity:.24,roughness:.08,metalness:.04,depthWrite:false,side:DoubleSide,clearcoat:1});
 const warm=make({color:'#ffe2a8',emissive:'#ffc477',emissiveIntensity:2,roughness:.3});
 const tile=make({color:'#a95637',roughness:.76}),dark=make({color:'#464a43',roughness:.75});
 const jaali={} as Record<'star'|'cross'|'flower',{material:Material;depth:Material}>;
 for(const [i,name] of (['star','cross','flower'] as const).entries()){
  const map=texture(7+i),mat=make({color:style.wall,map,alphaTest:.5,side:DoubleSide,roughness:.68});
  const depth=new MeshDepthMaterial({map,alphaTest:.5,depthPacking:RGBADepthPacking,side:DoubleSide});materials.push(depth);jaali[name]={material:mat,depth};
 }
 return {paint,accent,stone,timber,metal,glass,warm,tile,dark,jaali,dispose:()=>{materials.forEach(m=>m.dispose());owned.forEach(t=>t.dispose());}};
}
