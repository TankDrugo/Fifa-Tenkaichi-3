"""Colour review renders with EEVEE: the shader colours, vertex colours included, which the
Workbench material mode of review_render.py does not show.

  blender --background --python build/render_colour.py -- --blend <file> --out <dir>
      [--views front,side,back,threequarter,face] [--action NAME --frame N] [--res 600 900]
      [--ref-cam AZ EL LENS] [--collections LOW]

Views orbit the subject (azimuth 0 = in front of it, at -Y). With --ref-cam the extra view
'ref' uses that camera, framed on the subject the same way review_render.py does.
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector


def args():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--blend", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--views", default="front,side,back,threequarter,face")
    p.add_argument("--collections", default="LOW")
    p.add_argument("--action", default="")
    p.add_argument("--frame", type=int, default=1)
    p.add_argument("--res", type=int, nargs=2, default=[600, 900])
    p.add_argument("--ref-cam", type=float, nargs=3, default=None)
    p.add_argument("--bg", default="1,1,1")
    return p.parse_args(a)


VIEWS = {  # azimuth, elevation in degrees, lens mm, framing: "all" or "head"
    "front": (0, 5, 50, "all"), "side": (90, 5, 50, "all"), "back": (180, 5, 50, "all"),
    "threequarter": (35, 15, 50, "all"), "face": (20, 5, 85, "head"), "game": (0, 29, 100, "all"),
    "facefront": (0, 3, 85, "head"), "faceside": (90, 3, 85, "head"), "headback": (180, 3, 85, "head"),
    "headbackside": (135, 10, 85, "head"), "hand": (20, 10, 85, "hand"), "handfront": (-40, 25, 85, "hand"), "foot": (60, 15, 85, "foot"),
}


def visible_objects(names):
    keep = set()
    for n in names:
        c = bpy.data.collections.get(n)
        if c:
            keep.update(o.name for o in c.all_objects)
    for o in bpy.data.objects:
        hide = o.name not in keep or o.type not in {"MESH", "ARMATURE"}
        o.hide_render = hide if o.type != "ARMATURE" else True
    return [o for o in bpy.data.objects if not o.hide_render and o.type == "MESH"]


def bounds(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in objs:
        eo = o.evaluated_get(dg)
        me = eo.to_mesh()
        for v in me.vertices:
            w = eo.matrix_world @ v.co
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
        eo.to_mesh_clear()
    return lo, hi


def main():
    a = args()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.blend))
    scene = bpy.context.scene
    objs = visible_objects(a.collections.split(","))
    if a.action:
        act = bpy.data.actions.get(a.action)
        for o in bpy.data.objects:
            if o.type == "ARMATURE" and act:
                o.animation_data_create()
                o.animation_data.action = act
        scene.frame_set(a.frame)
    lo, hi = bounds(objs)
    centre, size = (lo + hi) / 2, hi - lo
    scene.render.engine = "BLENDER_EEVEE_NEXT" if bpy.app.version >= (4, 2, 0) else "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = a.res
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = tuple(float(x) for x in a.bg.split(",")) + (1,)
    bg.inputs["Strength"].default_value = 0.55
    for o in [o for o in bpy.data.objects if o.name.startswith("REVIEW_")]:
        bpy.data.objects.remove(o, do_unlink=True)
    sun = bpy.data.objects.new("REVIEW_sun", bpy.data.lights.new("REVIEW_sun", "SUN"))
    sun.data.energy = 3.2
    sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
    scene.collection.objects.link(sun)
    cam = bpy.data.objects.new("REVIEW_cam", bpy.data.cameras.new("REVIEW_cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    views = dict(VIEWS)
    if a.ref_cam:
        views["ref"] = (a.ref_cam[0], a.ref_cam[1], a.ref_cam[2], "all")
    os.makedirs(a.out, exist_ok=True)
    for name in a.views.split(","):
        az, el, lens, fit = views[name]
        cam.data.lens = lens
        if fit == "hand":
            target, extent = Vector((0.70, -0.02, 0.98)), 0.32      # CH_Fulmine's left glove, A pose
        elif fit == "foot":
            target, extent = Vector((0.115, -0.08, 0.10)), 0.40     # his left boot
        elif fit == "head":
            # the head and hair of CH_Fulmine: chin 1.50, crest tip about 2.05
            target = Vector((centre.x, centre.y, 1.75))
            extent = 0.64
        else:
            target, extent = centre, max(size.z, size.x * a.res[1] / a.res[0]) * 1.08
        # distance so that the extent fills the frame height
        fov = 2 * math.atan(18 / lens) if a.res[1] >= a.res[0] else 2 * math.atan(18 / lens * a.res[1] / a.res[0])
        dist = extent / 2 / math.tan(fov / 2)
        r, e = math.radians(az), math.radians(el)
        d = Vector((math.sin(r) * math.cos(e), -math.cos(r) * math.cos(e), math.sin(e)))
        cam.location = target + d * dist
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(a.out, f"colour_{name}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", scene.render.filepath)


main()
