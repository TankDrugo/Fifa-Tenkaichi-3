"""CH_Fulmine, phase 06: Mixamo-named skeleton, weights, one skinned mesh.

  blender --background --python build/06_rig.py -- --master <dir>/CH_Fulmine_master.blend

Joints come from 02_body.py. The body takes bone-heat weights; the clothes over it copy the
body's weights from the nearest body vertices; the rigid parts (gloves, shoes, head, hair, face)
go whole to one bone. Then everything joins into CH_Fulmine_Body_LOD0 under the armature, with at
most four influences per vertex.
"""
import importlib.util
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bt  # noqa: E402
from bt import col, own, log, open_master, save_master, clear_owned, argv_after_dashes  # noqa: E402

import bpy  # noqa: E402
from mathutils import Vector, kdtree  # noqa: E402

spec = importlib.util.spec_from_file_location("body02", os.path.join(HERE, "02_body.py"))
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)
bt.PHASE = "06_rig"          # after the import: 02_body.py sets its own tag on load
bt.OWNER_TAG = "phase:06_rig"

P = "mixamorig:"


def v(*a):
    return Vector(a)


def bones():
    sh, el, wr = Vector(B.SHOULDER), B.ELBOW, B.WRIST
    hand_tip = wr + B.ARM_DIR * 0.16
    hip, knee, ankle = Vector(B.HIP), Vector(B.KNEE), Vector(B.ANKLE)
    ball = v(B.FOOT_X, -0.13, 0.035)
    toe = v(B.FOOT_X, -0.27, 0.035)
    out = [
        ("Hips", v(0, 0, 0.92), v(0, 0, 1.02), None),
        ("Spine", v(0, 0, 1.02), v(0, 0, 1.14), "Hips"),
        ("Spine1", v(0, 0, 1.14), v(0, 0, 1.27), "Spine"),
        ("Spine2", v(0, 0, 1.27), v(0, 0.01, 1.44), "Spine1"),
        ("Neck", v(0, 0.01, 1.44), v(0, 0.012, 1.51), "Spine2"),
        ("Head", v(0, 0.012, 1.51), v(0, 0.012, 1.81), "Neck"),
        ("HeadTop_End", v(0, 0.012, 1.81), v(0, 0.012, 2.06), "Head"),
    ]

    def mx(p, side):
        return v(p.x * side, p.y, p.z)

    for side, s in ((1, "Left"), (-1, "Right")):
        out += [
            (s + "Shoulder", v(0.03 * side, 0.0, 1.42), mx(sh, side), "Spine2"),
            (s + "Arm", mx(sh, side), mx(el, side), s + "Shoulder"),
            (s + "ForeArm", mx(el, side), mx(wr, side), s + "Arm"),
            (s + "Hand", mx(wr, side), mx(hand_tip, side), s + "ForeArm"),
            (s + "UpLeg", mx(hip, side), mx(knee, side), "Hips"),
            (s + "Leg", mx(knee, side), mx(ankle, side), s + "UpLeg"),
            (s + "Foot", mx(ankle, side), mx(ball, side), s + "Leg"),
            (s + "ToeBase", mx(ball, side), mx(toe, side), s + "Foot"),
        ]
    return [(P + n, h, t, (P + p) if p else None, 0, n != "HeadTop_End") for n, h, t, p in out]


# rigid parts: name fragment -> bone (side suffix .L/.R picks Left/Right)
RIGID = [("Glove", "Hand"), ("Shoe", "Foot"), ("Sole", "Foot"), ("Stud", "Foot"), ("ShoeStripe", "Foot"),
         ("Head", "Head"), ("Ear", "Head"), ("Eye", "Head"), ("Pupil", "Head"), ("Brow", "Head"),
         ("Nose", "Head"), ("Mouth", "Head"), ("Teeth", "Head"), ("Hair", "Head")]


def rigid_bone(name):
    part = name.replace("CH_Fulmine_", "").split(".")[0]
    side = {"L": "Left", "R": "Right"}.get(name.rsplit(".", 1)[-1], "")
    for frag, bone in RIGID:
        if part.startswith(frag):
            return P + (side + bone if bone in ("Hand", "Foot") else bone)
    return None


def copy_weights(src, dst, k=4):
    """dst vertex groups = inverse-distance average of the k nearest src vertices' weights."""
    tree = kdtree.KDTree(len(src.data.vertices))
    for vtx in src.data.vertices:
        tree.insert(src.matrix_world @ vtx.co, vtx.index)
    tree.balance()
    names = [g.name for g in src.vertex_groups]
    for n in names:
        if dst.vertex_groups.get(n) is None:
            dst.vertex_groups.new(name=n)
    for vtx in dst.data.vertices:
        acc, total = {}, 0.0
        for co, idx, dist in tree.find_n(dst.matrix_world @ vtx.co, k):
            w = 1.0 / max(dist, 1e-4)
            total += w
            for g in src.data.vertices[idx].groups:
                acc[g.group] = acc.get(g.group, 0.0) + g.weight * w
        for gi, wsum in acc.items():
            dst.vertex_groups[names[gi]].add([vtx.index], wsum / total, "REPLACE")


def limit_and_normalise(ob, limit=4):
    for vtx in ob.data.vertices:
        gs = sorted(((g.group, g.weight) for g in vtx.groups), key=lambda t: -t[1])
        keep, drop = gs[:limit], gs[limit:]
        for gi, _ in drop:
            ob.vertex_groups[gi].remove([vtx.index])
        s = sum(w for _, w in keep) or 1.0
        for gi, w in keep:
            ob.vertex_groups[gi].add([vtx.index], w / s, "REPLACE")


def build(scene, args):
    parts = [o for o in bpy.data.objects if o.get("owner") == "phase:02_body" and o.type == "MESH"]
    body = bpy.data.objects["CH_Fulmine_Body"]
    arm = bt.armature("CH_Fulmine_Armature", bones())
    # bone heat on a copy of the body so phase 02 stays untouched
    skin = body.copy()
    skin.data = body.data.copy()
    skin.name = "CH_Fulmine_Body_LOD0"
    col("LOW").objects.link(skin)
    own(skin)
    bt.bind(skin, arm)
    if len(skin.vertex_groups) == 0:
        raise SystemExit("bone heat gave no weights")
    joined = [skin]
    for o in parts:
        if o is body:
            continue
        c = o.copy()
        c.data = o.data.copy()
        col("LOW").objects.link(c)
        own(c)
        bone = rigid_bone(o.name)
        if bone:
            g = c.vertex_groups.new(name=bone)
            g.add([vtx.index for vtx in c.data.vertices], 1.0, "REPLACE")
        else:
            copy_weights(skin, c)
        joined.append(c)
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in joined:
        o.select_set(True)
    bpy.context.view_layer.objects.active = skin
    bpy.ops.object.join()
    skin.name = "CH_Fulmine_Body_LOD0"
    skin.data.name = "CH_Fulmine_Body_LOD0"
    limit_and_normalise(skin)
    for m in list(skin.modifiers):
        if m.type == "ARMATURE":
            m.object = arm
            break
    else:
        m = skin.modifiers.new("Armature", "ARMATURE")
        m.object = arm
    skin.parent = arm
    # move the phase-02 parts out of the delivery collection
    for o in parts:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        col("HIGH").objects.link(o)
    # the player's height for the game without the crest (glTF extras -> three userData.height,
    # read by apps/web/game/animation/modelAppearance.ts): the top of the hair cap
    cap = bpy.data.objects["CH_Fulmine_HairCap"]
    arm["height"] = round(max((cap.matrix_world @ vtx.co).z for vtx in cap.data.vertices), 3)
    unweighted = sum(1 for vtx in skin.data.vertices if not vtx.groups)
    skin.data.calc_loop_triangles()
    log(f"height {arm['height']} m, bones {len(arm.data.bones)}, vertices {len(skin.data.vertices)}, triangles "
        f"{len(skin.data.loop_triangles)}, materials {[m.name for m in skin.data.materials]}, "
        f"unweighted {unweighted}")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--master", required=True)
    a = p.parse_args(argv_after_dashes())
    scene = open_master(a.master)
    # parts moved to HIGH by an earlier run go back to LOW before rebuilding
    clear_owned()
    for o in bpy.data.objects:
        if o.get("owner") == "phase:02_body" and "HIGH" in [c.name for c in o.users_collection]:
            bpy.data.collections["HIGH"].objects.unlink(o)
            col("LOW").objects.link(o)
    build(scene, a)
    save_master(a.master)
    log("saved", a.master)
