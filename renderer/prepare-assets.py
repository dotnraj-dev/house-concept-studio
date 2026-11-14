"""Run with Blender after scripts/download-quality-assets.py."""
import bpy
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'assets' / 'quality'
DEST.mkdir(parents=True, exist_ok=True)
records = []
for folder in sorted((ROOT / '.work' / 'quality-assets').iterdir()):
    if not (folder / 'source.gltf').is_file():
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(folder / 'source.gltf'))
    bpy.ops.export_scene.gltf(filepath=str(DEST / (folder.name + '.glb')), export_format='GLB', export_image_format='AUTO')
    record = json.loads((folder / 'source.json').read_text())
    record['file'] = folder.name + '.glb'
    records.append(record)
(DEST / 'manifest.json').write_text(json.dumps({'license': 'CC0-1.0', 'licenseUrl': 'https://polyhaven.com/license', 'models': records}, indent=2), encoding='utf-8')
print('Bundled %s CC0 models' % len(records))
