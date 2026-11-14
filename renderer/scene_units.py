"""Read our explicit GLB unit marker while retaining compatibility with old feet exports."""
import json, struct

def model_scale(filename):
    with open(filename, 'rb') as file:
        header = file.read(20)
        if len(header) != 20:
            raise ValueError('Incomplete GLB.')
        magic, version, total, size, kind = struct.unpack('<4sIII4s', header)
        if magic != b'glTF' or version != 2 or kind != b'JSON' or size > total - 20:
            raise ValueError('Invalid GLB header.')
        manifest = json.loads(file.read(size))
    scene = manifest.get('scenes', [{}])[manifest.get('scene', 0)]
    roots = [manifest.get('nodes', [])[index] for index in scene.get('nodes', [])]
    units = {node.get('extras', {}).get('hcsUnits') for node in roots}
    if 'metres' in units:
        if units != {'metres'}:
            raise ValueError('Mixed root-node unit conventions are not supported.')
        return 1.0
    if any(unit not in (None, 'feet') for unit in units):
        raise ValueError('Unsupported scene units.')
    return .3048

def camera_scale(camera):
    unit = camera.get('units', 'feet')
    if unit not in ('feet', 'metres'):
        raise ValueError('Unsupported camera units.')
    return 1.0 if unit == 'metres' else .3048
