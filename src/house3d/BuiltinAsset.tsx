import {useEffect,useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import {Box3,RepeatWrapping,SRGBColorSpace,Vector2,Vector3,type Mesh,type MeshStandardMaterial} from 'three';
import {builtinModel} from './builtins';
export function BuiltinAsset({category,size}:{category:string;size:[number,number,number]}){
 const maps=useTexture(['/assets/materials/fabric-color.jpg','/assets/materials/fabric-normal.jpg','/assets/materials/fabric-roughness.jpg','/assets/materials/timber-color.jpg','/assets/materials/timber-normal.jpg','/assets/materials/timber-roughness.jpg']);
 const textures=useMemo(()=>maps.map((m,i)=>{const t=m.clone();t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(i<3?4:2,i<3?4:2);if(i%3===0)t.colorSpace=SRGBColorSpace;t.needsUpdate=true;return t;}),[maps]);
 const object=useMemo(()=>{const root=builtinModel(category)!,clones=new Map<MeshStandardMaterial,MeshStandardMaterial>();root.traverse(o=>{const m=o as Mesh;if(!m.isMesh)return;const source=m.material as MeshStandardMaterial;if(!clones.has(source)){const material=source.clone(),wood=material.name==='wood';if(wood||['fabric','linen','accent'].includes(material.name)){const offset=wood?3:0;material.map=textures[offset];material.normalMap=textures[offset+1];material.roughnessMap=textures[offset+2];material.normalScale=new Vector2(.22,.22);}clones.set(source,material);}m.material=clones.get(source)!;});return root;},[category,textures]);
 useEffect(()=>()=>{const mats=new Set<MeshStandardMaterial>();object.traverse(o=>{if((o as Mesh).isMesh)mats.add((o as Mesh).material as MeshStandardMaterial);});mats.forEach(m=>m.dispose());},[object]);useEffect(()=>()=>textures.forEach(t=>t.dispose()),[textures]);
 const bounds=new Box3().setFromObject(object),dims=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3()),scale:[number,number,number]=[size[0]/dims.x,size[1]/dims.y,size[2]/dims.z];
 return <group scale={scale}><primitive object={object} position={[-center.x,-bounds.min.y,-center.z]}/></group>;
}
