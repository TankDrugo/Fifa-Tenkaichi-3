"""Comic renders of CH_Fulmine HD, the look of ref/concept_front.webp: flat colour in two steps
with blue-violet shadows, black outlines (inverted hull). Nothing is saved to the master.

  blender --background --python build_hd/render_toon.py -- --blend <file> --out <dir>
      [--action NAME --frame N] [--views ref,front,threequarter,...] [--res 1024 1536]
      [--ref-cam AZ EL LENS] [--transparent]

The views and framing follow build/render_colour.py; 'ref' uses --ref-cam.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dims import stretch_z  # noqa: E402


SHADOW = (0.50, 0.44, 0.78, 1.0)      # the concept's shadows: violet over every colour
VIEWS = {  # azimuth, elevation in degrees, lens mm, framing (as build/render_colour.py)
    "front": (0, 5, 50, "all"), "side": (90, 5, 50, "all"), "back": (180, 5, 50, "all"),
    "threequarter": (35, 15, 50, "all"), "face": (20, 5, 85, "head"), "facefront": (0, 3, 85, "head"),
    "faceside": (90, 3, 85, "head"), "headback": (180, 3, 85, "head"), "game": (0, 29, 100, "all"),
}
NO_OUTLINE = ("Emblem", "HairStreak", "Iris", "Pupil", "Teeth", "MouthInside", "Lids", "Eye", "Lace", "Proxy")


def args():
    a = sys.argv[sys.argv.index("--") + 1:]
    out = {"views": "ref", "res": [1024, 1536], "action": "", "frame": 1, "ref_cam": [0, 12, 50], "transparent": False}
    i = 0
    while i < len(a):
        k = a[i][2:].replace("-", "_")
        if k == "res":
            out[k] = [int(a[i + 1]), int(a[i + 2])]
            i += 3
        elif k == "ref_cam":
            out[k] = [float(a[i + 1]), float(a[i + 2]), float(a[i + 3])]
            i += 4
        elif k == "transparent":
            out[k] = True
            i += 1
        else:
            out[k] = a[i + 1]
            i += 2
    return out


def toon(mat):
    """Replace the material's output by flat colour x a two-step light ramp."""
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    base = bsdf.inputs["Base Color"]
    diff = nt.nodes.new("ShaderNodeBsdfDiffuse")
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = SHADOW
    ramp.color_ramp.elements[1].position = 0.32
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(diff.outputs["BSDF"], s2r.inputs["Shader"])
    nt.links.new(s2r.outputs["Color"], ramp.inputs["Fac"])
    if base.is_linked:
        nt.links.new(base.links[0].from_socket, mix.inputs[6])
    else:
        mix.inputs[6].default_value = base.default_value
    nt.links.new(ramp.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])


def outline_material():
    m = bpy.data.materials.new("toon_outline")
    if bpy.app.version < (5, 0, 0):
        m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (0.02, 0.015, 0.03, 1)
    nt.links.new(e.outputs["Emission"], next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL").inputs["Surface"])
    m.use_backface_culling = True
    return m


def main():
    a = args()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a["blend"]))
    scene = bpy.context.scene
    arm = bpy.data.objects.get("CH_Fulmine_Armature")
    if a["action"] and arm:
        arm.animation_data_create()
        arm.animation_data.action = bpy.data.actions[a["action"]]
        for tr in arm.animation_data.nla_tracks:
            tr.mute = True
        scene.frame_set(int(a["frame"]))
    keep = set(o.name for o in bpy.data.collections["HIGH"].all_objects)
    meshes = []
    for o in bpy.data.objects:
        show = o.name in keep and o.type == "MESH" and not o.hide_render and "Proxy" not in o.name
        o.hide_render = not show if o.type != "ARMATURE" else True
        if show:
            meshes.append(o)
    for m in bpy.data.materials:
        if m.node_tree and any(n.type == "BSDF_PRINCIPLED" for n in m.node_tree.nodes):
            toon(m)
    line = outline_material()
    for o in meshes:
        if any(k in o.name for k in NO_OUTLINE):
            continue
        o.data.materials.append(line)
        sol = o.modifiers.new("Outline", "SOLIDIFY")
        sol.thickness = 0.0028 if "Hair" not in o.name else 0.0035
        sol.offset = 1.0
        sol.use_flip_normals = True
        sol.use_rim = False
        sol.material_offset = len(o.data.materials) - 1
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x, scene.render.resolution_y = a["res"]
    scene.render.film_transparent = a["transparent"]
    scene.view_settings.view_transform = "Standard"
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.87, 0.24, 0.02, 1)
    bg.inputs["Strength"].default_value = 0.0
    sun = bpy.data.objects.new("toon_sun", bpy.data.lights.new("toon_sun", "SUN"))
    sun.data.energy = 4.0
    sun.data.angle = math.radians(2)
    sun.data.use_shadow = False       # comic shading: light by facing only, no cast shadows
    sun.rotation_euler = (math.radians(42), math.radians(-18), math.radians(-35))
    scene.collection.objects.link(sun)
    # framing from the evaluated meshes
    dg = bpy.context.evaluated_depsgraph_get()
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in meshes:
        eo = o.evaluated_get(dg)
        for c in eo.bound_box:
            w = eo.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    centre, size = (lo + hi) / 2, hi - lo
    views = dict(VIEWS)
    views["ref"] = (a["ref_cam"][0], a["ref_cam"][1], a["ref_cam"][2], "all")
    cam = bpy.data.objects.new("toon_cam", bpy.data.cameras.new("toon_cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    os.makedirs(a["out"], exist_ok=True)
    for name in a["views"].split(","):
        az, el, lens, fit = views[name]
        cam.data.lens = lens
        if fit == "head":
            target, extent = Vector((centre.x, centre.y, stretch_z(1.75))), 0.64   # head and hair
        else:
            target, extent = centre, max(size.z, size.x * a["res"][1] / a["res"][0]) * 1.06
        fov = 2 * math.atan(18 / lens) if a["res"][1] >= a["res"][0] else 2 * math.atan(18 / lens * a["res"][1] / a["res"][0])
        dist = extent / 2 / math.tan(fov / 2)
        r, e = math.radians(az), math.radians(el)
        d = Vector((math.sin(r) * math.cos(e), -math.cos(r) * math.cos(e), math.sin(e)))
        cam.location = target + d * dist
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(a["out"], f"toon_{name}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", scene.render.filepath, flush=True)


main()
