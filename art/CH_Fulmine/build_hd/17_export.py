"""CH_Fulmine HD, phase 17: delivery copies and GLB export.

  blender --background --python build_hd/17_export.py -- --master <dir>/CH_Fulmine_HD.blend
      --out <dir> --level hd|game

Both levels: copies of every part, the skin hidden under the clothes, gloves and boots removed
(a vertex is hidden when a ray along its normal meets a garment within 6 cm; a face goes when all
its vertices are hidden and none of their neighbours is visible), decimated, joined into one
skinned mesh, the gate pose ref_crouch dropped, clips moved to start at frame 0, exported with the
skill's export_delivery.py.
  hd    keeps every material and about a third of the triangles of the big parts.
  game  keeps the five team materials (maglia, maglia2, pantaloncini, calzettoni, scarpe) and
        merges the rest into 'fissi' coloured per vertex, the contract of
        docs/STUDIO-PERSONAGGI.md section 11 and of apps/web/game/animation/modelAppearance.ts; about 4 % of
        the big parts' triangles.
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hd  # noqa: E402
import bpy  # noqa: E402
import bmesh  # noqa: E402
import numpy as np  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

hd.PHASE = "17_export"
TEAM = ("maglia", "maglia2", "pantaloncini", "calzettoni", "scarpe")
COVERS = ("Shirt", "Shorts", "Sock", "Boot", "Sole", "Glove", "Cuff", "Collar")
LEVELS = {"hd": (0.30, 40000), "game": (0.04, 1500)}     # share of triangles, floor per part


def parts():
    return [o for o in bpy.data.objects if o.type == "MESH" and str(o.get("owner", "")).startswith("phase:1")
            and o.get("owner") not in ("phase:16_rig", "phase:17_export") and not o.hide_render]


def copy_of(o):
    c = o.copy()
    c.data = o.data.copy()
    for coll in list(c.users_collection):
        coll.objects.unlink(c)
    hd.col("LOW").objects.link(c)
    c["owner"] = hd.tag()
    return c


def cut_hidden_skin(body, covers):
    bm = bmesh.new()
    for o in covers:
        me = o.data.copy()
        me.transform(o.matrix_world)
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    tree = BVHTree.FromBMesh(bm)
    bm.free()
    p, n = hd.co(body), hd.normals(body)
    hidden = np.zeros(len(p), bool)
    for i in range(len(p)):
        hit = tree.ray_cast(p[i] + n[i] * 0.0005, n[i], 0.06)
        hidden[i] = hit[0] is not None
    # keep a ring of hidden vertices next to visible ones, so poses do not open gaps
    e = hd.edges(body)
    vis = ~hidden
    grow = vis.copy()
    grow[e[:, 0][vis[e[:, 1]]]] = True
    grow[e[:, 1][vis[e[:, 0]]]] = True
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    drop = [f for f in bm.faces if not any(grow[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    bm.to_mesh(body.data)
    bm.free()
    return int(hidden.sum()), len(p)


def decimate(o, share, floor):
    """Collapse to share of the triangles (at least floor); the armature modifier comes back after."""
    t = hd.tris(o)
    target = min(t, max(floor, int(t * share)))
    if target < t:
        rigs = [m.object for m in o.modifiers if m.type == "ARMATURE"]
        o.modifiers.clear()
        hd.modifier(o, "DECIMATE", ratio=target / t)
        hd.apply_modifiers(o)
        for r in rigs:
            o.modifiers.new("Armature", "ARMATURE").object = r
    return t, hd.tris(o)


def merge_fixed(o):
    """Non-team materials -> one 'fissi' material coloured per vertex (corner colours)."""
    me = o.data
    attr = me.color_attributes.get("Col") or me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    white = (1.0, 1.0, 1.0, 1.0)
    names = [m.name for m in me.materials]
    fixed = bpy.data.materials.get("fissi") or bpy.data.materials.new("fissi")
    if bpy.app.version < (5, 0, 0):
        fixed.use_nodes = True
    nt = fixed.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = 0.6
    node = next((n for n in nt.nodes if n.type == "VERTEX_COLOR"), None) or nt.nodes.new("ShaderNodeVertexColor")
    node.layer_name = "Col"
    nt.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    new_slots = list(TEAM) + ["fissi"]
    mats = [bpy.data.materials[n] for n in TEAM] + [fixed]
    remap = {}
    for i, n in enumerate(names):
        remap[i] = new_slots.index(n) if n in TEAM else len(TEAM)
    colours = {i: (hd.lin(hd.PALETTE[n][0]) if n not in TEAM else white) for i, n in enumerate(names)}
    old = [p.material_index for p in me.polygons]
    for p, i in zip(me.polygons, old):
        c = colours[i]
        for li in p.loop_indices:
            attr.data[li].color = c
    me.materials.clear()                 # this also drops the material_index attribute
    for m in mats:
        me.materials.append(m)
    me.polygons.foreach_set("material_index", [remap[i] for i in old])
    me.update()


def main():
    a = hd.args()
    level = a.get("level", "hd")
    share, floor = LEVELS[level]
    hd.open_master(a["master"])
    hd.clear_owned()
    arm = bpy.data.objects["CH_Fulmine_Armature"]
    src = parts()
    copies = {o.name: copy_of(o) for o in src}
    body = copies["CH_Fulmine_Body"]
    covers = [c for n, c in copies.items() if any(k in n for k in COVERS)]
    hidden, total = cut_hidden_skin(body, covers)
    hd.log(f"skin: {hidden} of {total} vertices hidden under the gear")
    before = after = 0
    for c in copies.values():
        b, f = decimate(c, share, floor)
        before += b
        after += f
    # one skinned mesh
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for c in copies.values():
        c.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    body.name = body.data.name = "CH_Fulmine_Body_LOD0"
    body.parent = arm
    bad = body.data.validate(verbose=False, clean_customdata=False)   # the exporter warned "not valid"
    hd.log(f"mesh validate fixed something: {bad}")
    if level == "game":
        merge_fixed(body)
    # clips from frame 0, gate pose out (as build/09_export.py)
    act = bpy.data.actions.get("ref_crouch")
    if act:
        bpy.data.actions.remove(act)
    for tr in list(arm.animation_data.nla_tracks):
        if tr.name == "ref_crouch":
            arm.animation_data.nla_tracks.remove(tr)
    for act in bpy.data.actions:
        for fc in act.fcurves:
            for kp in fc.keyframe_points:
                kp.co.x -= 1
                kp.handle_left.x -= 1
                kp.handle_right.x -= 1
        for m in act.pose_markers:
            m.frame -= 1
        s, e = act.frame_range
        act.frame_range = (s - 1, e - 1)
    for tr in arm.animation_data.nla_tracks:
        for st in tr.strips:
            st.frame_start_ui -= 1
    for o in bpy.data.objects:                       # only the delivery mesh stays in LOW
        if o.type == "MESH" and o is not body and "LOW" in [c.name for c in o.users_collection]:
            bpy.data.collections["LOW"].objects.unlink(o)
            if not o.users_collection:
                hd.col("HIGH").objects.link(o)
    hd.log(f"{level}: {before} -> {after} triangles, materials {[m.name for m in body.data.materials]}")
    out = a["out"]
    os.makedirs(out, exist_ok=True)
    delivery = os.path.join(out, f"CH_Fulmine_{level}_delivery.blend")
    hd.save_master(delivery)
    skill = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".claude", "skills",
                         "blender-image-to-3d", "scripts", "export_delivery.py")
    name = "CH_Fulmine_HD" if level == "hd" else "CH_Fulmine_game"
    cmd = [bpy.app.binary_path, "--background", "--python", os.path.abspath(skill), "--", "--blend", delivery,
           "--out", out, "--name", name, "--format", "GLB", "--collections", "LOW", "--engine", "three.js 0.186.1",
           "--inferred", "back and sides of the head and hair, crest depth, soles, palms of the gloves, "
                         "standing proportions, leg length (stretched 10 cm to the concept's ratio)"]
    sys.exit(subprocess.call(cmd))


main()
