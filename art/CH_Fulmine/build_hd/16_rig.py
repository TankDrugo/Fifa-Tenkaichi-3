"""CH_Fulmine HD, phase 16: the skeleton of build/06_rig.py, weights, the clips of build/08_anim.py.

  blender --background --python build_hd/16_rig.py -- --master <dir>/CH_Fulmine_HD.blend

Bone heat on 3 million triangles is slow and fragile, so the body is decimated to a proxy of
about 20 thousand triangles, the proxy takes bone heat, and every deforming part copies the
weights of its 6 nearest proxy vertices. Rigid parts go whole to one bone: head, face and hair
to the head, gloves to the hands, boots to the feet. Same 23 Mixamo-named bones and the same
actions (ref_crouch, idle, run, kick) as the game version, so the clips are shared.
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "..", "build")
sys.path.insert(0, HERE)
sys.path.insert(0, BUILD)
import hd  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import kdtree  # noqa: E402


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(BUILD, file))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


RIG = load("rig06", "06_rig.py")
ANIM = load("anim08", "08_anim.py")
import bt  # noqa: E402

hd.PHASE = "16_rig"
P = "mixamorig:"

RIGID = [("Head", "Head"), ("Ear", "Head"), ("Eye", "Head"), ("Iris", "Head"), ("Pupil", "Head"), ("Lids", "Head"),
         ("Brow", "Head"), ("Teeth", "Head"), ("MouthInside", "Head"), ("Hair", "Head"),
         ("Glove", "Hand"), ("Boot", "Foot"), ("Sole", "Foot"), ("Studs", "Foot"), ("Lace", "Foot")]


def rigid_bone(name):
    part = name.replace("CH_Fulmine_", "").split(".")[0]
    side = {"L": "Left", "R": "Right"}.get(name.rsplit(".", 1)[-1], "")
    for frag, bone in RIGID:
        if part.startswith(frag):
            return P + (side + bone if bone in ("Hand", "Foot") else bone)
    return None


def proxy_of(body):
    px = body.copy()
    px.data = body.data.copy()
    px.name = "CH_Fulmine_WeightProxy"
    hd.col("HIGH").objects.link(px)
    hd.own(px)
    hd.modifier(px, "DECIMATE", ratio=0.045)
    hd.apply_modifiers(px)
    return px


def copy_weights(src, dst, k=6):
    p = hd.co(src)
    tree = kdtree.KDTree(len(p))
    for i, v in enumerate(p):
        tree.insert(v, i)
    tree.balance()
    names = [g.name for g in src.vertex_groups]
    groups = [dst.vertex_groups.get(n) or dst.vertex_groups.new(name=n) for n in names]
    # weights of the proxy as a dense array: vertices x groups
    W = np.zeros((len(p), len(names)))
    for v in src.data.vertices:
        for g in v.groups:
            W[v.index, g.group] = g.weight
    acc = {}
    for v in dst.data.vertices:
        idx, wts = [], []
        for _, i, d in tree.find_n(v.co, k):
            idx.append(i)
            wts.append(1.0 / max(d, 1e-4) ** 2)
        w = (W[idx] * np.array(wts)[:, None]).sum(0) / sum(wts)
        top = np.argsort(-w)[:4]
        s = w[top].sum() or 1.0
        for gi in top:
            if w[gi] > 1e-4:
                acc.setdefault(gi, []).append((v.index, float(w[gi] / s)))
    for gi, items in acc.items():
        for vi, wv in items:
            groups[gi].add([vi], wv, "REPLACE")


def main():
    a = hd.args()
    hd.open_master(a["master"])
    hd.clear_owned()
    bt.OWNER_TAG = hd.tag()
    from dims import stretch_z
    bones = [(n, h.copy(), t.copy(), par, roll, d) for n, h, t, par, roll, d in RIG.bones()]
    for _, h, t, _, _, _ in bones:                  # the leg stretch of 15_stretch.py
        h.z, t.z = stretch_z(h.z), stretch_z(t.z)
    arm = bt.armature("CH_Fulmine_Armature", bones, collection="RIG_DEF")
    parts = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("CH_Fulmine_")
             and o.get("owner", "").startswith("phase:1") and o.get("owner") != hd.tag()]
    body = bpy.data.objects["CH_Fulmine_Body"]
    px = proxy_of(body)
    bt.bind(px, arm)
    if not px.vertex_groups:
        raise SystemExit("bone heat gave no weights on the proxy")
    for o in parts:
        for g in list(o.vertex_groups):
            o.vertex_groups.remove(g)
        for m in [m for m in o.modifiers if m.type == "ARMATURE"]:
            o.modifiers.remove(m)
        bone = rigid_bone(o.name)
        if bone:
            g = o.vertex_groups.new(name=bone)
            g.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
        else:
            copy_weights(px, o)
        m = o.modifiers.new("Armature", "ARMATURE")
        m.object = arm
        o.parent = arm
        o.matrix_parent_inverse = arm.matrix_world.inverted()
    px.hide_render = True
    px.hide_viewport = True
    # the clips of the game version, on this skeleton
    arm.animation_data_create()
    ANIM.make_ref(arm)
    ANIM.make_idle(arm)
    ANIM.make_run(arm)
    ANIM.make_kick(arm)
    ANIM.reset(arm)
    arm["height"] = round(stretch_z(1.80), 3)   # glTF extras -> three userData.height: top of the hair cap
    hd.log(f"{len(parts)} parts weighted, proxy {hd.tris(px)} triangles, actions {[x.name for x in bpy.data.actions]}")
    hd.save_master(a["master"])


main()
