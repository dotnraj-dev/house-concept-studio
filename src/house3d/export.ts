import {NoColorSpace,Source,type Material,type Mesh,type MeshStandardMaterial,type Object3D,type Texture} from 'three';

export const FEET_TO_METRES=.3048;
export function packedMetalRoughPixels(rough:Uint8ClampedArray,metal?:Uint8ClampedArray){
  const result=new Uint8ClampedArray(rough.length);
  for(let i=0;i<result.length;i+=4){result[i]=0;result[i+1]=rough[i+1];result[i+2]=metal?metal[i+2]:255;result[i+3]=255;}
  return result;
}

/** Export an isolated metric scene; never change or dispose the live viewer's resources. */
export function prepareExport(root:Object3D){
  root.updateMatrixWorld(true);
  const copy=root.clone(true),remove:Object3D[]=[],materials=new Map<Material,Material>(),textures:Texture[]=[];
  const packedImages=new Map<unknown,Map<unknown,HTMLCanvasElement>>();
  copy.traverse(object=>{if(object.userData.interactionId)remove.push(object);});
  remove.forEach(object=>object.removeFromParent());
  const cloneMaterial=(source:Material)=>{
    if(materials.has(source))return materials.get(source)!;
    const material=source.clone() as MeshStandardMaterial;materials.set(source,material);
    const rough=material.roughnessMap,metal=material.metalnessMap;
    if(!rough||rough===metal||rough.colorSpace!==NoColorSpace||metal&&metal.colorSpace!==NoColorSpace)return material;
    // Imported glTF materials are already packed. Generated room materials often
    // share one roughness image across hundreds of meshes with different UV repeats.
    // Pack that image once, preserving each texture's own repeat/offset transform.
    if(metal&&(metal.flipY!==rough.flipY||metal.channel!==rough.channel||!metal.repeat.equals(rough.repeat)||!metal.offset.equals(rough.offset)||metal.rotation!==rough.rotation))return material;
    const image=rough.image as {width:number;height:number},metalImage=metal?.image as {width:number;height:number}|undefined;
    if(!image?.width||!image?.height||typeof document==='undefined')return material;
    let group=packedImages.get(image);if(!group){group=new Map();packedImages.set(image,group);}
    let canvas=group.get(metalImage);
    if(!canvas){
      canvas=document.createElement('canvas');
      const maximum=Math.max(image.width,image.height,metalImage?.width||0,metalImage?.height||0),scale=Math.min(1,2048/maximum);
      canvas.width=Math.max(1,Math.round(Math.max(image.width,metalImage?.width||0)*scale));
      canvas.height=Math.max(1,Math.round(Math.max(image.height,metalImage?.height||0)*scale));
      const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('A 2D canvas is required to export textures.');
      context.drawImage(image as CanvasImageSource,0,0,canvas.width,canvas.height);
      const roughPixels=context.getImageData(0,0,canvas.width,canvas.height).data;
      let metalPixels:Uint8ClampedArray|undefined;
      if(metalImage){context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(metalImage as CanvasImageSource,0,0,canvas.width,canvas.height);metalPixels=context.getImageData(0,0,canvas.width,canvas.height).data;}
      const pixels=context.createImageData(canvas.width,canvas.height);pixels.data.set(packedMetalRoughPixels(roughPixels,metalPixels));context.putImageData(pixels,0,0);
      group.set(metalImage,canvas);
    }
    const packed=rough.clone();packed.source=new Source(canvas);packed.colorSpace=NoColorSpace;packed.needsUpdate=true;
    textures.push(packed);material.roughnessMap=material.metalnessMap=packed;
    return material;
  };
  copy.traverse(object=>{const mesh=object as Mesh;if(mesh.isMesh)mesh.material=Array.isArray(mesh.material)?mesh.material.map(cloneMaterial):cloneMaterial(mesh.material);});
  copy.scale.multiplyScalar(FEET_TO_METRES);copy.position.multiplyScalar(FEET_TO_METRES);
  copy.userData={...copy.userData,hcsUnits:'metres',hcsExportVersion:2};
  copy.updateMatrixWorld(true);
  return {root:copy,dispose:()=>{materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());}};
}
