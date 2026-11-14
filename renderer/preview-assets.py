"""Generate honest thumbnails from the bundled GLBs, using Blender Cycles."""
import bpy
import math
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
for category in ('sofa', 'chair'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public/assets/quality' / (category + '.glb')))
    bpy.context.view_layer.update()
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    target = (lo + hi) / 2
    span = max(hi.x - lo.x, hi.z - lo.z)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, lo.z - .005))
    floor = bpy.context.object
    mat = bpy.data.materials.new('Warm studio floor')
    mat.diffuse_color = (.54, .52, .46, 1)
    floor.data.materials.append(mat)
    world = bpy.data.worlds.new('Daylight')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
    env = world.node_tree.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(str(ROOT / 'public/assets/materials/daylight.hdr'))
    world.node_tree.links.new(env.outputs['Color'], world.node_tree.nodes['Background'].inputs['Color'])
    scene = bpy.context.scene
    scene.world = world
    light_data = bpy.data.lights.new('Softbox', 'AREA')
    light_data.energy = 350
    light_data.size = 4
    light = bpy.data.objects.new('Softbox', light_data)
    scene.collection.objects.link(light)
    light.location = target + Vector((-span, -span, span * 2))
    light.rotation_euler = (target - light.location).to_track_quat('-Z', 'Y').to_euler()
    data = bpy.data.cameras.new('Asset camera')
    camera = bpy.data.objects.new('Asset camera', data)
    scene.collection.objects.link(camera)
    camera.location = target + Vector((span * .9, -span * 1.65, span * .65))
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = span * 1.55
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(ROOT / 'public/assets/quality' / (category + '.png'))
    bpy.ops.render.render(write_still=True)
    # Source GLBs retain their authored orientation for reuse in the viewer.
    print(category, 'bounds:', tuple(lo), tuple(hi), flush=True)
