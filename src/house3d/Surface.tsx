import {Suspense,useEffect,useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import {MeshPhysicalMaterial,MeshStandardMaterial,RepeatWrapping,SRGBColorSpace,Vector2,type Material,type Texture} from 'three';
import {architecturalBox} from './box-uv';
import {PBR_SURFACES,surfaceTexture,type PbrSurface,type Surface} from './materials';

/**
 * Materials are shared between every Block with the same appearance (one material per look instead of one
 * per Block). Shared materials and textures live for the app's lifetime; React never disposes them.
 * This keeps program/uniform switches low and lets StaticBatcher merge identical surfaces into one draw call.
 */
const materialCache=new Map<string,Material>();
const preparedTextures=new WeakSet<Texture>();
const flatTextureCache=new Map<string,Texture>();

function prepare(texture:Texture,color:boolean){
  if(preparedTextures.has(texture))return texture;
  texture.wrapS=texture.wrapT=RepeatWrapping;
  texture.repeat.set(1,1);
  texture.anisotropy=8;
  if(color)texture.colorSpace=SRGBColorSpace;
  texture.needsUpdate=true;
  preparedTextures.add(texture);
  return texture;
}

function PbrMaterial({surface,color,metalness,opacity,emissive,neutralBase=false}:{surface:PbrSurface;color:string;metalness:number;opacity:number;emissive?:string;neutralBase?:boolean}){
  const paths=['color','normal','roughness'].map(name=>`/assets/materials/${surface}-${name}.jpg`);
  const loaded=useTexture(paths);
  const material=useMemo(()=>{
    const key=['pbr',surface,color,metalness,opacity,emissive||'',neutralBase?1:0].join('|');
    const cached=materialCache.get(key);
    if(cached)return cached;
    const [map,normalMap,roughnessMap]=[prepare(loaded[0],true),prepare(loaded[1],false),prepare(loaded[2],false)];
    const glossy=['marble','quartz','porcelain'].includes(surface);
    const params={color,map:neutralBase?null:map,normalMap,normalScale:new Vector2(surface==='fabric'||surface==='rug'?.45:.18),roughnessMap,
      roughness:glossy?1:surface==='woodfloor'?.72:1,metalness,transparent:opacity<1,opacity,emissive:emissive||'#000000',emissiveIntensity:emissive?.35:0};
    // Physical shading is only needed for the clearcoat on polished stone/porcelain; everything else uses Standard.
    const created=glossy?new MeshPhysicalMaterial({...params,clearcoat:.32,clearcoatRoughness:.15}):new MeshStandardMaterial(params);
    materialCache.set(key,created);
    return created;
  },[loaded[0],loaded[1],loaded[2],surface,color,metalness,opacity,emissive,neutralBase]);
  return <primitive object={material} attach="material" dispose={null}/>;
}

function flatMaterial({surface,size,color,metalness,roughness,opacity,emissive}:{surface?:Surface;size:[number,number,number];color:string;metalness:number;roughness?:number;opacity:number;emissive?:string}){
  let map:Texture|null=null;
  if(surface){
    const fresh=surfaceTexture(surface,size);
    const textureKey=`${surface}:${fresh.repeat.x.toFixed(3)}:${fresh.repeat.y.toFixed(3)}`;
    const cachedTexture=flatTextureCache.get(textureKey);
    if(cachedTexture){fresh.dispose();map=cachedTexture;}else{flatTextureCache.set(textureKey,fresh);map=fresh;}
  }
  const finalRoughness=roughness??(metalness>.5?.19:opacity<1?.12:surface==='concrete'?.88:.78);
  const key=['flat',surface||'',map?.uuid||'',color,metalness,finalRoughness,opacity,emissive||''].join('|');
  const cached=materialCache.get(key);
  if(cached)return cached;
  const created=new MeshStandardMaterial({color,map,metalness,roughness:finalRoughness,transparent:opacity<1,opacity,emissive:emissive||'#000000',emissiveIntensity:emissive?.35:0});
  materialCache.set(key,created);
  return created;
}

export function Block({position,size,color,metalness=0,roughness,opacity=1,emissive,surface,solid=false,neutralBase=false}:{position:[number,number,number];size:[number,number,number];color:string;metalness?:number;roughness?:number;opacity?:number;emissive?:string;surface?:Surface;solid?:boolean;neutralBase?:boolean}){
  const pbr=surface&&PBR_SURFACES.includes(surface as PbrSurface);
  const flat=useMemo(()=>pbr?null:flatMaterial({surface,size,color,metalness,roughness,opacity,emissive}),[pbr,surface,size[0],size[1],size[2],color,metalness,roughness,opacity,emissive]);
  const geometry=useMemo(()=>architecturalBox(size,position,surface==='stackstone'?6.5:5),[...size,...position,surface]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} userData={{solid}} position={position} castShadow={opacity===1} receiveShadow>
    {pbr?<Suspense fallback={<meshStandardMaterial color={color}/>}><PbrMaterial surface={surface as PbrSurface} color={color}
      metalness={metalness} opacity={opacity} emissive={emissive} neutralBase={neutralBase}/></Suspense>:
      <primitive object={flat!} attach="material" dispose={null}/>}
  </mesh>;
}
