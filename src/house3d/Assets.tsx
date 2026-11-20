import { Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import { Box3, RepeatWrapping, SRGBColorSpace, Vector2, Vector3, type Mesh, type MeshStandardMaterial } from 'three';
import type { Asset } from '../types';
import {BuiltinAsset} from './BuiltinAsset';
import {CarModel} from './CarModel';
import {BUILTIN_CATEGORIES} from './builtins';

export const FREE_MODELS = {
  sofa:'furniture-kit/loungesofa', tv:'furniture-kit/televisionmodern',
  dining:'furniture-kit/table', chair:'furniture-kit/chairmoderncushion',
  bed:'furniture-kit/beddouble', sink:'furniture-kit/kitchensink',
  basin:'furniture-kit/bathroomsink', toilet:'furniture-kit/toilet',
  chimney:'furniture-kit/hoodmodern', shelf:'furniture-kit/bookcasecloseddoors',
  kitchen:'furniture-kit/kitchencabinet', fridge:'furniture-kit/kitchenfridge',
  door:'innerscene/door', curtain:'innerscene/curtain', car:'car-kit/sedan', plant:'furniture-kit/pottedplant',
  tree:'nature-kit/tree-palmshort', bush:'nature-kit/plant-bushlarge',
  coffee:'furniture-kit/tablecoffee',
} as const;

export function freeUrl(id:string){return `/assets/free/${id}.glb`;}

function FittedModel({url,size,fit,open=false,decorate=false}:{url:string;size:[number,number,number];fit:'contain'|'stretch';open?:boolean;decorate?:boolean}){
  const {scene}=useGLTF(url);
  const maps=useTexture(['/assets/materials/timber-color.jpg','/assets/materials/timber-normal.jpg','/assets/materials/timber-roughness.jpg',
    '/assets/materials/fabric-normal.jpg','/assets/materials/fabric-roughness.jpg']);
  const finishes=useMemo(()=>maps.map((map,index)=>{
    const texture=map.clone();texture.wrapS=texture.wrapT=RepeatWrapping;
    texture.repeat.set(index<3?2:5,index<3?2:5);texture.anisotropy=8;
    if(index===0)texture.colorSpace=SRGBColorSpace;
    texture.needsUpdate=true;return texture;
  }),[maps[0],maps[1],maps[2],maps[3],maps[4]]);
  const clone=useMemo(()=>{
    const model=scene.clone(true);
    model.traverse(object=>{
      if(!(object as Mesh).isMesh)return;
      object.castShadow=true;object.receiveShadow=true;
      if(!decorate)return;
      const mesh=object as Mesh;
      const update=(source:MeshStandardMaterial)=>{
        const material=source.clone();
        if(material.name.toLowerCase().includes('wood')){
          material.map=finishes[0];material.normalMap=finishes[1];material.roughnessMap=finishes[2];
          material.color.set('#ede5d8');material.roughness=.85;material.normalScale=new Vector2(.25,.25);
        }else if(material.name.toLowerCase().includes('carpet')){
          material.normalMap=finishes[3];material.roughnessMap=finishes[4];material.roughness=1;
          material.normalScale=new Vector2(.28,.28);
          material.color.set(material.name.toLowerCase().includes('white')?'#eeebe4':'#b4a28d');
        }
        return material;
      };
      mesh.material=Array.isArray(mesh.material)?mesh.material.map(item=>update(item as MeshStandardMaterial)):update(mesh.material as MeshStandardMaterial);
    });
    return model;
  },[scene,decorate,finishes]);
  useEffect(()=>()=>{
    if(decorate)clone.traverse(object=>{if((object as Mesh).isMesh){const material=(object as Mesh).material;
      (Array.isArray(material)?material:[material]).forEach(item=>item.dispose());}});
  },[clone,decorate]);
  useEffect(()=>()=>finishes.forEach(texture=>texture.dispose()),[finishes]);
  const hinges=useMemo(()=>[clone.getObjectByName('doorLeft'),clone.getObjectByName('doorRight')],[clone]);
  useFrame((_,delta)=>hinges.forEach((hinge,index)=>{if(hinge){const target=open?(index===0?-1.4:1.4):0;
    hinge.rotation.y+=(target-hinge.rotation.y)*Math.min(1,delta*5);}}));
  const bounds=useMemo(()=>new Box3().setFromObject(clone),[clone]);
  const dims=bounds.getSize(new Vector3());
  const center=bounds.getCenter(new Vector3());
  const factors:[number,number,number]=[size[0]/Math.max(dims.x,.01),size[1]/Math.max(dims.y,.01),size[2]/Math.max(dims.z,.01)];
  const uniform=Math.min(...factors);
  const scale: [number,number,number]=fit==='stretch'?factors:[uniform,uniform,uniform];
  return <primitive object={clone} scale={scale} position={[-center.x*scale[0],-bounds.min.y*scale[1],-center.z*scale[2]]}/>;
}

export function AssetModel({category,assets,position,size,rotation=0,fit='contain',fallback,open}:{category:keyof typeof FREE_MODELS;assets:Asset[];position:[number,number,number];size:[number,number,number];rotation?:number;fit?:'contain'|'stretch';fallback?:ReactNode;open?:boolean}){
  const uploaded=assets.find(asset=>asset.category.toLowerCase()===category);
  const quality=['sofa','chair'].includes(category)?`/assets/quality/${category}.glb`:null;
  // Realistic CC0 library models (public/assets/quality/library.json) replace low-poly kit/procedural stand-ins.
  const library=LIBRARY[category];
  if(!uploaded&&category==='car')return <group userData={{solid:true}} position={position} rotation={[0,rotation,0]}><CarModel size={size}/></group>;
  if(!uploaded&&library)return <group userData={{solid:true}} position={position} rotation={[0,rotation+(LIBRARY_TURN[category]||0),0]}><Suspense fallback={fallback||null}><FittedModel url={`/assets/quality/${library[variant(position,library.length)]}`} size={size} fit="contain"/></Suspense></group>;
  const userData={solid:!['curtain','chimney','door','tree','bush'].includes(category)};
  // Poly Haven's chair faces +Z; our table placement expects chairs facing -Z.
  if(!uploaded&&quality)return <group userData={userData} position={position} rotation={[0,rotation+(category==='chair'?Math.PI:0),0]}><Suspense fallback={fallback||null}><FittedModel url={quality} size={size} fit="contain"/></Suspense></group>;
  if(!uploaded&&(BUILTIN_CATEGORIES as readonly string[]).includes(category))return <group userData={userData} position={position} rotation={[0,category==='sofa'?rotation-Math.PI:rotation,0]}><Suspense fallback={fallback||null}><BuiltinAsset category={category} size={size}/></Suspense></group>;
  const id=FREE_MODELS[category];
  const url=uploaded?.fileUrl || (id?freeUrl(id):'');
  if(!url)return <>{fallback}</>;
  return <group userData={userData} position={position} rotation={[0,rotation,0]}><Suspense fallback={fallback||null}><FittedModel url={url} size={size} fit={fit}
    open={open} decorate={!uploaded&&id.startsWith('furniture-kit/')}/></Suspense></group>;
}

/** Library GLBs per category; several entries give variety, chosen deterministically from the position. */
const LIBRARY:Partial<Record<string,string[]>>={plant:['plant/potted_plant_01.glb','plant/potted_plant_02.glb'],shelf:['shelf/wooden_display_shelves_01.glb']};
const LIBRARY_TURN:Partial<Record<string,number>>={};
function variant(position:[number,number,number],count:number){return Math.abs(Math.round(position[0]*7+position[2]*13))%count;}

/** Place one curated library model (file relative to /assets/quality/) fitted to explicit feet dimensions. */
export function LibraryModel({file,position,size,rotation=0,solid=true}:{file:string;position:[number,number,number];size:[number,number,number];rotation?:number;solid?:boolean}){
  return <group userData={{solid}} position={position} rotation={[0,rotation,0]}><Suspense fallback={null}><FittedModel url={`/assets/quality/${file}`} size={size} fit="contain"/></Suspense></group>;
}

export function FreeModel({id,position,size,rotation=0}:{id:string;position:[number,number,number];size:[number,number,number];rotation?:number}){
  return <group userData={{solid:true}} position={position} rotation={[0,rotation,0]}><Suspense fallback={null}><FittedModel url={freeUrl(id)} size={size} fit="contain" decorate={id.startsWith('furniture-kit/')}/></Suspense></group>;
}
