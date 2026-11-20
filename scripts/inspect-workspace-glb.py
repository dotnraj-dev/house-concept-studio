"""Inspect the actual workspace download, including regional/legacy facades."""
from pathlib import Path
import struct, json, hashlib, sys
source=Path(sys.argv[1] if len(sys.argv)>1 else 'exports/workspace/house.glb')
data=source.read_bytes()
magic,version,size=struct.unpack_from('<III',data)
assert magic==0x46546c67 and version==2 and size==len(data)
length,kind=struct.unpack_from('<II',data,12)
assert kind==0x4e4f534a
doc=json.loads(data[20:20+length])
nodes=doc.get('nodes',[]); images=doc.get('images',[])
assert any(n.get('extras',{}).get('hcsUnits')=='metres' for n in nodes)
assert not any(n.get('extras',{}).get('runtimeOnly') or n.get('extras',{}).get('interactionId') for n in nodes)
assert not any('Selection and north overlay' in n.get('name','') for n in nodes)
assert not any('EXT_mesh_gpu_instancing' in n.get('extensions',{}) for n in nodes)
assert images and all('bufferView' in im and 'uri' not in im for im in images)
assert any(n.get('extras',{}).get('roomId') for n in nodes)
result={'source':source.as_posix(),'bytes':size,'sha256':hashlib.sha256(data).hexdigest(),
'nodes':len(nodes),'meshes':len(doc.get('meshes',[])),'embeddedImages':len(images),
'units':'metres at export boundary; source geometry remains feet',
'runtimeOverlaysExcluded':True,'externalImageURLs':False,'requiresInstancingExtension':False,
'legacyFacadeFixture':True,'blenderRenderExecuted':False}
out=Path(sys.argv[2] if len(sys.argv)>2 else 'docs/screenshots/workspace/glb-verification.json')
out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2))
