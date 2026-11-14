import json, struct, tempfile, unittest
from pathlib import Path
from scene_units import model_scale, camera_scale

class SceneUnitTests(unittest.TestCase):
    def fixture(self, unit):
        manifest = {'asset': {'version':'2.0'}, 'scene':0, 'scenes':[{'nodes':[0]}], 'nodes':[{'extras':{} if unit is None else {'hcsUnits':unit}}]}
        data = json.dumps(manifest).encode()
        data += b' ' * (-len(data) % 4)
        return struct.pack('<4sIII4s', b'glTF',2,20+len(data),len(data),b'JSON') + data
    def test_metric_and_legacy_geometry(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder)/'house.glb'
            for unit, expected in [('metres',1.0),('feet',.3048),(None,.3048)]:
                file.write_bytes(self.fixture(unit))
                self.assertEqual(model_scale(file),expected)
            file.write_bytes(self.fixture('centimetres'))
            with self.assertRaises(ValueError):model_scale(file)
    def test_camera_units_are_independent_of_model_version(self):
        self.assertEqual(camera_scale({}),.3048)
        self.assertEqual(camera_scale({'units':'metres'}),1.0)
        with self.assertRaises(ValueError):camera_scale({'units':'unknown'})

if __name__ == '__main__':unittest.main()
