"""Run: blender --background --python renderer/render.py -- scene.glb options.json output.png"""
import bpy, json, math, os, sys
from mathutils import Matrix, Quaternion, Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from scene_units import model_scale, camera_scale

scene_file, options_file, output_file = sys.argv[sys.argv.index('--') + 1:]
with open(options_file, encoding='utf-8') as file:
    options = json.load(file)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(scene_file))
# New glTF exports use metres. Older exports explicitly retain the feet convention.
scale = model_scale(scene_file)
for obj in list(bpy.context.scene.objects):
    if obj.parent is None:
        obj.scale *= scale
        obj.location *= scale
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = min(512, max(32, int(options.get('samples', 256))))
scene.cycles.use_denoising = True
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .008 if scene.cycles.samples >= 512 else .015
scene.cycles.max_bounces = 10
scene.cycles.transparent_max_bounces = 8
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('OPTIX', 'CUDA', 'HIP'):
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            devices = [device for device in prefs.devices if device.type != 'CPU']
            if devices:
                for device in prefs.devices:
                    device.use = device.type != 'CPU'
                scene.cycles.device = 'GPU'
                break
        except (TypeError, RuntimeError):
            continue
except KeyError:
    pass
if options.get('require_gpu') and scene.cycles.device != 'GPU':
    raise RuntimeError('No supported Cycles GPU was detected. CPU fallback is disabled for rented GPU jobs.')
# Small edge highlights make architectural blocks read as solid surfaces.
for obj in scene.objects:
    if obj.type == 'MESH' and len(obj.data.vertices) == 8 and len(obj.data.polygons) == 6:
        bevel = obj.modifiers.new('Architectural edge softness', 'BEVEL')
        bevel.width = .003
        bevel.segments = 2
        bevel.limit_method = 'ANGLE'
camera_data = bpy.data.cameras.new('Presentation camera')
camera = bpy.data.objects.new('Presentation camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
pose = options.get('camera', {'position': [30, 30, 40], 'quaternion': [0, 0, 0, 1]})
basis = Matrix.Rotation(math.pi / 2, 4, 'X')
camera.location = (basis @ Vector(pose['position'])) * camera_scale(pose)
x, y, z, w = pose['quaternion']
camera.rotation_mode = 'QUATERNION'
camera.rotation_quaternion = basis.to_quaternion() @ Quaternion((w, x, y, z))
camera_data.lens_unit = 'FOV'
camera_data.sensor_fit = 'VERTICAL'
camera_data.lens = camera_data.sensor_height / (2 * math.tan(math.radians(pose.get('fov', 52)) / 2))
camera_data.clip_start = 0.015
camera_data.clip_end = 2000
world = bpy.data.worlds.new('Daylight environment')
world.use_nodes = True
scene.world = world
background = world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value = (0.65, 0.75, 0.85, 1)
background.inputs['Strength'].default_value = 0.45
environment = options.get('environment_file')
if environment and os.path.isfile(environment):
    node = world.node_tree.nodes.new('ShaderNodeTexEnvironment')
    node.image = bpy.data.images.load(environment)
    world.node_tree.links.new(node.outputs['Color'], background.inputs['Color'])
sun_data = bpy.data.lights.new('Sun', 'SUN')
sun_data.energy = 2.5
sun_data.angle = math.radians(7)
sun = bpy.data.objects.new('Sun', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(25), math.radians(-30), math.radians(-35))
for obj in scene.objects:
    if obj.type == 'LIGHT' and obj.data.type != 'SUN':
        obj.data.energy = max(40, min(120, obj.data.energy))
scene.render.resolution_x = min(3840, max(640, int(options.get('width', 1920))))
scene.render.resolution_y = round(scene.render.resolution_x * 9 / 16)
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = os.path.abspath(output_file)
scene.view_settings.view_transform = 'AgX'
scene.render.film_transparent = False
bpy.ops.wm.save_as_mainfile(filepath=os.path.splitext(os.path.abspath(output_file))[0] + '.blend')
bpy.ops.render.render(write_still=True)
