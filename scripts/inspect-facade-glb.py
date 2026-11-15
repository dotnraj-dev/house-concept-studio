"""Inspect the actual browser download; never substitute this for screenshot review."""
from pathlib import Path
import struct,json,hashlib,sys
source=Path(sys.argv[1] if len(sys.argv)>1 else 'exports/facade/facade-verification.glb')
data=source.read_bytes()
magic,version,size=struct.unpack_from('<III',data)
assert magic==0x46546c67 and version==2 and size==len(data)
length,kind=struct.unpack_from('<II',data,12)
assert kind==0x4e4f534a
doc=json.loads(data[20:20+length])
nodes=doc.get('nodes',[]);materials=doc.get('materials',[]);images=doc.get('images',[])
assert any(n.get('extras',{}).get('hcsUnits')=='metres' for n in nodes)
assert any('Parametric Tamil Nadu facade' in n.get('name','') for n in nodes)
assert not any('EXT_mesh_gpu_instancing' in n.get('extensions',{}) for n in nodes)
assert not any('uri' in im for im in images),'Textures must be embedded for Blender'
assert any(m.get('alphaMode')=='MASK' for m in materials)
expanded=[n for n in nodes if n.get('extras',{}).get('hcsExpandedInstances')]
facade_nodes=[n.get('name','') for n in nodes if any(t in n.get('name','') for t in ['CNC jaali','CNC perforated','louvres','BoxFrame','Compound wall','Frameless glass'])]
result={
 'source':source.as_posix(),'bytes':size,'sha256':hashlib.sha256(data).hexdigest(),
 'nodes':len(nodes),'meshes':len(doc.get('meshes',[])),
 'embeddedImages':len(images),'jpegImages':sum(im.get('mimeType')=='image/jpeg' for im in images),
 'alphaCutMaterials':sum(m.get('alphaMode')=='MASK' for m in materials),
 'expandedInstanceGroups':len(expanded),
 'expandedInstances':sum(n['extras']['hcsExpandedInstances'] for n in expanded),
 'facadeNodesSample':facade_nodes[:16],
 'units':'metres at export boundary; source geometry in feet',
 'externalImageURLs':False,'requiresInstancingExtension':False,
 'blenderRenderExecuted':False
}
out=Path(sys.argv[2] if len(sys.argv)>2 else 'docs/screenshots/facade/glb-verification.json')
out.write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
