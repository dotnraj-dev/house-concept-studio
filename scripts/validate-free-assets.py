"""Verify every bundled free model and catalogue entry."""

from pathlib import Path
import json
import struct

root = Path(__file__).resolve().parents[1] / "public"
manifest = json.loads((root / "assets/free/manifest.json").read_text(encoding="utf-8"))
models = manifest["models"]
assert len(models) == 150, f"Expected 150 models, found {len(models)}"
assert len({model["id"] for model in models}) == len(models), "Duplicate model ID"

for model in models:
    file = root / model["fileUrl"].lstrip("/")
    thumbnail = root / model["thumbUrl"].lstrip("/")
    data = file.read_bytes()
    assert thumbnail.is_file(), f"Missing thumbnail: {model['id']}"
    assert len(data) >= 12 and data[:4] == b"glTF", f"Invalid GLB header: {model['id']}"
    assert struct.unpack_from("<I", data, 8)[0] == len(data), f"Invalid GLB size: {model['id']}"
    assert model["license"] == "CC0-1.0", f"Unexpected licence: {model['id']}"

print(f"Validated {len(models)} CC0 GLB models and catalogue references.")

quality = json.loads((root / 'assets/quality/manifest.json').read_text(encoding='utf-8'))
for model in quality['models']:
    assert model['license'] == 'CC0-1.0'
    data = (root / 'assets/quality' / model['file']).read_bytes()
    assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 8)[0] == len(data)
    length = struct.unpack_from('<I', data, 12)[0]
    gltf = json.loads(data[20:20+length])
    assert gltf['asset']['version'] == '2.0'
    assert all('bufferView' in image for image in gltf.get('images', [])), 'Textures must be embedded'
    assert all(not buffer.get('uri') for buffer in gltf.get('buffers', [])), 'Buffers must be embedded'
    assert len(data) < 25*1024*1024, 'Model exceeds the application asset limit'
    assert gltf.get('materials') and gltf.get('textures'), 'Expected a textured PBR model'
print(f"Validated {len(quality['models'])} detailed CC0 GLBs with embedded PBR textures.")
