"""Download a small, reusable CC0 furniture collection from Poly Haven's API.

Run this script, then use Blender with prepare-assets.py to bundle each as GLB.
"""
import hashlib
import json
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / '.work' / 'quality-assets'
ASSETS = {'sofa': 'sofa_03', 'chair': 'dining_chair_02'}
HEADERS = {'User-Agent': 'HouseConceptStudio/0.2 (selected CC0 furniture; contact via Poly Haven if needed)'}


def download(item, target):
    if target.is_file() and hashlib.md5(target.read_bytes()).hexdigest() == item['md5']:
        return
    response = requests.get(item['url'], headers=HEADERS, timeout=90)
    response.raise_for_status()
    if hashlib.md5(response.content).hexdigest() != item['md5']:
        raise ValueError('Checksum mismatch: ' + target.name)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(response.content)


for category, asset in ASSETS.items():
    response = requests.get(f'https://api.polyhaven.com/files/{asset}', headers=HEADERS, timeout=30)
    response.raise_for_status()
    metadata = response.json()['gltf']['2k']['gltf']
    folder = DEST / category
    folder.mkdir(parents=True, exist_ok=True)
    download(metadata, folder / 'source.gltf')
    for relative, item in metadata.get('include', {}).items():
        target = (folder / relative).resolve()
        if not target.is_relative_to(folder.resolve()):
            raise ValueError('Invalid asset path.')
        download(item, target)
    (folder / 'source.json').write_text(json.dumps({'category': category, 'name': asset, 'source': f'https://polyhaven.com/a/{asset}', 'license': 'CC0-1.0', 'resolution': '2k', 'sourceMd5': metadata['md5']}, indent=2), encoding='utf-8')
    print(f'Verified {category}: {asset}, 2K PBR, CC0')
