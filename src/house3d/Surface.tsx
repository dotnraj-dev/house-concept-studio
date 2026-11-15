import {Suspense,useEffect,useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import {RepeatWrapping,SRGBColorSpace,Vector2} from 'three';
import {architecturalBox} from './box-uv';
import {PBR_SURFACES,surfaceTexture,type PbrSurface,type Surface} from './materials';
function PbrMaterial({surface,size,color,metalness,opacity,emissive}:{surface:PbrSurface;size:[number,number,number];color:string;metalness:number;opacity:number;emissive?:string}){
  const paths=['color','normal','roughness'].map(name=>`/assets/materials/${surface}-${name}.jpg`);
  const loaded=useTexture(paths);
  const maps=useMemo(()=>loaded.map((source,index)=>{
    const texture=source.clone();
    texture.wrapS=texture.wrapT=RepeatWrapping;
    texture.repeat.set(1,1);
    texture.anisotropy=8;
    if(index===0)texture.colorSpace=SRGBColorSpace;
    texture.needsUpdate=true;
    return texture;
  }),[loaded[0],loaded[1],loaded[2],size[0],size[1],size[2]]);
  useEffect(()=>()=>maps.forEach(map=>map.dispose()),[maps]);
  return <meshPhysicalMaterial color={color} map={maps[0]} normalMap={maps[1]} normalScale={new Vector2(surface==='fabric'||surface==='rug'?.45:.18)} roughnessMap={maps[2]} clearcoat={['marble','quartz','porcelain'].includes(surface)?.32:0} clearcoatRoughness={.15}
    roughness={surface==='marble'||surface==='quartz'||surface==='porcelain'?1:surface==='woodfloor'?.72:1} metalness={metalness} transparent={opacity<1} opacity={opacity}
    emissive={emissive||'#000000'} emissiveIntensity={emissive ? .35 : 0}/>;
}

export function Block({position,size,color,metalness=0,roughness,opacity=1,emissive,surface,solid=false}:{position:[number,number,number];size:[number,number,number];color:string;metalness?:number;roughness?:number;opacity?:number;emissive?:string;surface?:Surface;solid?:boolean}){
  const pbr=surface&&PBR_SURFACES.includes(surface as PbrSurface);
  const map=useMemo(()=>surface&&!pbr?surfaceTexture(surface,size):null,[surface,pbr,size[0],size[1],size[2]]);
  useEffect(()=>()=>{map?.dispose();},[map]);
  const geometry=useMemo(()=>architecturalBox(size,position,surface==='stackstone'?6.5:5),[...size,...position,surface]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} userData={{solid}} position={position} castShadow={opacity===1} receiveShadow>
    {pbr?<Suspense fallback={<meshStandardMaterial color={color}/>}><PbrMaterial surface={surface as PbrSurface} size={size} color={color}
      metalness={metalness} opacity={opacity} emissive={emissive}/></Suspense>:
      <meshStandardMaterial color={color} map={map} metalness={metalness} roughness={roughness??(metalness>.5?.19:opacity<1 ? .12 : surface==='concrete' ? .88 : .78)}
        transparent={opacity<1} opacity={opacity} emissive={emissive||'#000000'} emissiveIntensity={emissive ? .35 : 0}/>}
  </mesh>;
}
