"""Golden Striker (Tancredi's Meshy model, 26/10/2026): skeleton, A pose, team materials, clips, GLB.

  blender --background --python art/CH_GoldenStriker/build/rig.py -- --out apps/web/public/models/golden.glb

The file from Meshy (ref/meshy_golden_striker.glb) is one mesh with positions only: no normals,
materials, skeleton or clips, 15.667 triangles, 0,952 units tall, facing +Z, legs apart, the right
arm hanging and the left hand on the hip. This script:
  1. imports it, brings it to 1,80 m with the feet on the ground and the pelvis on the origin;
  2. builds the 23 Mixamo-named bones of CH_Fulmine on joints measured on the file (cross sections
     and the front and side views, docs/DETTAGLI.md, "Golden Striker"), binds with bone heat;
  3. takes the left hand off the hip: arm and body weights apart, the faces joining them cut and
     both sides closed;
  4. paints the faces into the materials the game dresses (maglia, pantaloncini, calzettoni,
     scarpe; pelle and capelli keep their colour), from the bone each face follows and the hems
     measured on the file;
  5. moves legs and arms into the A pose of CH_Fulmine (legs straight under the hips, arms 40
     degrees below horizontal), makes that the rest pose and binds again with bone heat;
  6. keys idle, run and kick with the helpers of art/CH_Fulmine/build/08_anim.py, the targets
     taken from this skeleton (hips, ankles), and exports the GLB for apps/web.
"""
import importlib.util
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FULMINE = os.path.join(HERE, "..", "..", "CH_Fulmine", "build")
sys.path.insert(0, FULMINE)
import bt  # noqa: E402
import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

spec = importlib.util.spec_from_file_location("anim08", os.path.join(FULMINE, "08_anim.py"))
ANIM = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ANIM)
bt.PHASE = "golden_rig"
bt.OWNER_TAG = "phase:golden_rig"

P = "mixamorig:"
SOURCE = os.path.join(HERE, "..", "ref", "meshy_golden_striker.glb")
HEIGHT = 1.80
# the file's box in its own units (glTF, Y up): y from -0.4758 to 0.4758
Y_MIN, Y_MAX = -0.475830078125, 0.475830078125
S = HEIGHT / (Y_MAX - Y_MIN)
# the middle of the two hip joints, in the file's units: it goes to the origin
PELVIS_X, PELVIS_Z = 0.025, 0.035

# Joints measured on the file, glTF units (x to her left, y up, z forward): head and tail a bone.
JOINTS = {
    "Hips": ((0.025, -0.025, 0.035), (0.022, 0.03, 0.03)),
    "Spine": ((0.022, 0.03, 0.03), (0.015, 0.09, 0.02)),
    "Spine1": ((0.015, 0.09, 0.02), (0.008, 0.15, 0.008)),
    "Spine2": ((0.008, 0.15, 0.008), (-0.008, 0.245, -0.02)),
    "Neck": ((-0.008, 0.245, -0.02), (-0.01, 0.28, -0.03)),
    "Head": ((-0.01, 0.28, -0.03), (-0.005, 0.44, -0.035)),
    "HeadTop_End": ((-0.005, 0.44, -0.035), (-0.005, 0.476, -0.035)),
    "RightShoulder": ((-0.015, 0.215, -0.01), (-0.09, 0.205, -0.005)),
    "RightArm": ((-0.09, 0.205, -0.005), (-0.1, 0.072, 0.017)),
    "RightForeArm": ((-0.1, 0.072, 0.017), (-0.12, -0.05, 0.048)),
    "RightHand": ((-0.12, -0.05, 0.048), (-0.115, -0.135, 0.05)),
    "LeftShoulder": ((0.015, 0.215, -0.01), (0.09, 0.205, -0.015)),
    "LeftArm": ((0.09, 0.205, -0.015), (0.172, 0.13, -0.06)),
    "LeftForeArm": ((0.172, 0.13, -0.06), (0.11, 0.085, -0.005)),
    "LeftHand": ((0.11, 0.085, -0.005), (0.065, 0.07, 0.035)),
    "RightUpLeg": ((-0.035, -0.025, 0.035), (-0.081, -0.172, 0.012)),
    "RightLeg": ((-0.081, -0.172, 0.012), (-0.145, -0.405, -0.028)),
    "RightFoot": ((-0.145, -0.405, -0.028), (-0.16, -0.462, 0.045)),
    "RightToeBase": ((-0.16, -0.462, 0.045), (-0.165, -0.465, 0.11)),
    "LeftUpLeg": ((0.085, -0.025, 0.035), (0.111, -0.172, 0.015)),
    "LeftLeg": ((0.111, -0.172, 0.015), (0.138, -0.405, 0.0)),
    "LeftFoot": ((0.138, -0.405, 0.0), (0.15, -0.462, 0.07)),
    "LeftToeBase": ((0.15, -0.462, 0.07), (0.153, -0.465, 0.135)),
}
PARENT = {
    "Hips": None, "Spine": "Hips", "Spine1": "Spine", "Spine2": "Spine1", "Neck": "Spine2", "Head": "Neck",
    "HeadTop_End": "Head",
}
for s in ("Left", "Right"):
    PARENT.update({s + "Shoulder": "Spine2", s + "Arm": s + "Shoulder", s + "ForeArm": s + "Arm",
                   s + "Hand": s + "ForeArm", s + "UpLeg": "Hips", s + "Leg": s + "UpLeg",
                   s + "Foot": s + "Leg", s + "ToeBase": s + "Foot"})

# Hems measured on the front and side views of the file (glTF units).
BOOT_TOP = -0.37
SLEEVE_T = {"Right": 0.5, "Left": 0.6}              # share of the upper arm the sleeve covers


def shirt_hem(x):                                    # lower on her right, under the hand on her left
    return 0.045 + 0.13 * x


def shorts_hem(x):
    return -0.086 - 0.106 * (x - 0.02) if x < 0.03 else -0.082 + 0.29 * (x - 0.04)


def sock_top(x):
    return -0.221 - 0.25 * (x + 0.07) if x < 0.03 else -0.21


def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


# the team parts get the club's colours in the game (apps/web/game/modelAppearance.ts); these are
# what a viewer outside the game shows
MATERIALS = {
    "maglia": "#e23b2e", "pantaloncini": "#f2f0e6", "calzettoni": "#e23b2e", "scarpe": "#1d2433",
    "pelle": "#f1c6a2", "capelli": "#e3b13c",
}


def to_blender(p):
    """A point of the file (glTF units) on the rig: metres, Z up, facing -Y, pelvis on the origin."""
    x, y, z = p
    return Vector(((x - PELVIS_X) * S, -(z - PELVIS_Z) * S, (y - Y_MIN) * S))


def to_file(v):
    return ((v.x / S) + PELVIS_X, v.z / S + Y_MIN, -(v.y / S) + PELVIS_Z)


def import_mesh():
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(SOURCE))
    ob = next(o for o in bpy.context.selected_objects if o.type == "MESH")
    ob.name = "CH_GoldenStriker_Body"
    ob.data.name = ob.name
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    bt.col("LOW").objects.link(ob)
    bt.own(ob)
    ob.parent = None
    me = ob.data
    me.transform(ob.matrix_world)
    ob.matrix_world = Matrix.Identity(4)
    me.transform(Matrix.Scale(S, 4) @ Matrix.Translation((-PELVIS_X, PELVIS_Z, -Y_MIN)))
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=1e-5)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    for p in me.polygons:
        p.use_smooth = True
    for o in [o for o in bpy.data.objects if o.type == "EMPTY"]:
        bpy.data.objects.remove(o, do_unlink=True)
    lo = min(v.co.z for v in me.vertices)
    hi = max(v.co.z for v in me.vertices)
    bt.log(f"imported: {len(me.vertices)} vertices, {sum(len(p.vertices) - 2 for p in me.polygons)} triangles, z {lo:.3f}..{hi:.3f}")
    return ob


def build_armature():
    bones = []
    for n, (h, t) in JOINTS.items():
        par = PARENT[n]
        bones.append((P + n, to_blender(h), to_blender(t), (P + par) if par else None, 0, n != "HeadTop_End"))
    return bt.armature("CH_GoldenStriker_Armature", bones)


def bind(ob, arm):
    for g in list(ob.vertex_groups):
        ob.vertex_groups.remove(g)
    for m in [m for m in ob.modifiers if m.type == "ARMATURE"]:
        ob.modifiers.remove(m)
    ob.parent = None
    bt.bind(ob, arm)
    # bone heat leaves a vertex without weights when it cannot reach it (the studs are separate
    # pieces): such a vertex copies the weights of the nearest weighted one
    groups = {}
    for v in ob.data.vertices:
        if v.groups:
            groups[v.index] = [(g.group, g.weight) for g in v.groups]
    empty = [v for v in ob.data.vertices if v.index not in groups]
    if empty:
        from mathutils import kdtree
        tree = kdtree.KDTree(len(groups))
        for i in groups:
            tree.insert(ob.data.vertices[i].co, i)
        tree.balance()
        for v in empty:
            _, i, _ = tree.find(v.co)
            for gi, w in groups[i]:
                ob.vertex_groups[gi].add([v.index], w, "REPLACE")
    bt.log(f"bound: {len(ob.vertex_groups)} groups, {len(empty)} vertices took their neighbour's weights")


def dominant_bone(ob, poly):
    acc = {}
    for vi in poly.vertices:
        for g in ob.data.vertices[vi].groups:
            acc[g.group] = acc.get(g.group, 0.0) + g.weight
    if not acc:
        return ""
    return ob.vertex_groups[max(acc, key=acc.get)].name.replace(P, "")


def region(ob, arm, poly):
    """The material of one face, from its bone and the hems of the file."""
    bone = dominant_bone(ob, poly)
    x, y, z = to_file(poly.center)
    nz = -poly.normal.y                              # the file's forward
    side = "Left" if bone.startswith("Left") else "Right"
    if bone in ("Head", "HeadTop_End"):
        face = z > -0.01 and 0.255 < y < 0.37 and abs(x + 0.005) < 0.075 and nz > 0.15
        return "pelle" if face else "capelli"
    if bone == "Neck":
        return "pelle" if abs(x) < 0.05 and z > -0.06 and y < 0.30 else "capelli"
    if bone.endswith("Hand") or bone.endswith("ForeArm"):
        return "pelle"
    if bone.endswith("Arm"):
        b = arm.data.bones[P + bone]
        h, t = b.head_local, b.tail_local
        u = (poly.center - h).dot(t - h) / (t - h).length_squared
        return "maglia" if u < SLEEVE_T[side] else "pelle"
    if bone.endswith("Shoulder") or bone in ("Spine1", "Spine2"):
        return "maglia"
    if bone in ("Hips", "Spine"):
        return "maglia" if y > shirt_hem(x) else "pantaloncini"
    if bone.endswith("UpLeg"):
        return "pantaloncini" if y > shorts_hem(x) else "pelle"
    if bone.endswith("Foot") or bone.endswith("ToeBase") or y < BOOT_TOP:
        return "scarpe"
    if bone.endswith("Leg"):
        return "calzettoni" if y < sock_top(x) else "pelle"
    return "pelle"


def separate_arms(ob):
    """The left hand rests on the hip in the file, so bone heat ties hip and hand together: a
    vertex that follows the body loses its forearm and hand weights, one that follows a forearm or
    a hand loses the body's. Otherwise the A pose drags a sheet of shirt along with the hand."""
    names = [g.name.replace(P, "") for g in ob.vertex_groups]
    arm_of = {i: n[:-len(k)] for i, n in enumerate(names) for k in ("Shoulder", "Arm", "ForeArm", "Hand")
              if n.endswith(k) and n[:-len(k)] in ("Left", "Right")}
    lower = {i for i, n in enumerate(names) if n.endswith("ForeArm") or n.endswith("Hand")}
    changed = 0
    for v in ob.data.vertices:
        ws = [(g.group, g.weight) for g in v.groups if g.weight > 0]
        if not ws:
            continue
        top = max(ws, key=lambda t: t[1])[0]
        if top not in arm_of:
            drop = [gi for gi, _ in ws if gi in lower]
        elif top in lower:
            drop = [gi for gi, _ in ws if arm_of.get(gi) != arm_of[top]]
        else:
            drop = []
        if not drop:
            continue
        keep = [(gi, w) for gi, w in ws if gi not in drop]
        total = sum(w for _, w in keep) or 1.0
        for gi in drop:
            ob.vertex_groups[gi].remove([v.index])
        for gi, w in keep:
            ob.vertex_groups[gi].add([v.index], w / total, "REPLACE")
        changed += 1
    bt.log(f"arms separated from the body: {changed} vertices")


def cut_hands(ob):
    """The hand on the hip is one surface with the shirt: the faces that join a forearm or a hand
    to a vertex outside that arm are cut, and each side of the cut is closed on its own, the hand's
    holes with the hand's vertices and the body's with the body's."""
    import bmesh
    names = [g.name.replace(P, "") for g in ob.vertex_groups]

    def chain(gi):
        for side in ("Left", "Right"):
            if names[gi].startswith(side) and names[gi][len(side):] in ("Shoulder", "Arm", "ForeArm", "Hand"):
                return side
        return None

    me = ob.data
    top = []
    for v in me.vertices:
        ws = [(g.group, g.weight) for g in v.groups]
        top.append(max(ws, key=lambda t: t[1])[0] if ws else -1)
    lower = [names[t][:-7] if names[t].endswith("ForeArm") else names[t][:-4] if names[t].endswith("Hand") else None
             if t >= 0 else None for t in top]
    side_of = [chain(t) if t >= 0 else None for t in top]
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    before = sum(1 for e in bm.edges if e.is_boundary)
    cut = []
    for f in bm.faces:
        sides = {lower[v.index] for v in f.verts} - {None}
        if any(side_of[v.index] != s for s in sides for v in f.verts):
            cut.append(f)
    bmesh.ops.delete(bm, geom=cut, context="FACES_ONLY")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    border = [e for e in bm.edges if e.is_boundary]
    groups = {}
    for e in border:
        k = tuple(lower[v.index] or "" for v in e.verts)
        groups.setdefault(k[0] if k[0] == k[1] else "", []).append(e)
    filled = bm.faces.layers.int.get("filled") or bm.faces.layers.int.new("filled")
    made = []
    for edges in groups.values():
        made += bmesh.ops.holes_fill(bm, edges=edges, sides=0)["faces"]
    tris = bmesh.ops.triangulate(bm, faces=made)["faces"]
    for f in tris:
        f.smooth = True
        f[filled] = 1
    bm.to_mesh(me)
    bm.free()
    me.update()
    bt.log(f"hands cut from the body: {len(cut)} faces removed, {len(loose)} loose vertices, "
           f"{before} open edges before and {len(border)} after the cut, {len(tris)} triangles to close")


def paint(ob, arm):
    mats = {n: bt.material(n, srgb(c), roughness=0.55) for n, c in MATERIALS.items()}
    ob.data.materials.clear()
    order = list(mats)
    for n in order:
        ob.data.materials.append(mats[n])
    me = ob.data
    for p in me.polygons:
        p.material_index = order.index(region(ob, arm, p))
    # the faces that close the cut take the material around them; then a face whose neighbours
    # mostly wear another material takes theirs, twice, so the hems do not zig-zag across the
    # big triangles of the body
    filled = me.attributes.get("filled")
    closing = {i for i, a in enumerate(filled.data) if a.value} if filled else set()
    near = [[] for _ in me.polygons]
    by_edge = {}
    for p in me.polygons:
        for k in p.edge_keys:
            by_edge.setdefault(k, []).append(p.index)
    for faces in by_edge.values():
        for a in faces:
            near[a] += [b for b in faces if b != a]

    def majority(i, among):
        votes = {}
        for j in near[i]:
            if j in among:
                m = me.polygons[j].material_index
                votes[m] = votes.get(m, 0) + 1
        return max(votes, key=votes.get) if votes else None

    for _ in range(3):
        for i in closing:
            m = majority(i, set(range(len(me.polygons))) - closing)
            if m is not None:
                me.polygons[i].material_index = m
    every = set(range(len(me.polygons)))
    for _ in range(2):
        flips = []
        for p in me.polygons:
            m = majority(p.index, every)
            if m is not None and m != p.material_index and sum(me.polygons[j].material_index == m for j in near[p.index]) >= 2:
                flips.append((p.index, m))
        for i, m in flips:
            me.polygons[i].material_index = m
    if filled:
        me.attributes.remove(filled)
    count = dict.fromkeys(order, 0)
    for p in me.polygons:
        count[order[p.material_index]] += 1
    bt.log("faces per material", count, f"{len(closing)} closing faces")


def a_pose(ob, arm):
    """Legs straight under the hips and arms 40 degrees below horizontal, made the rest pose."""
    ANIM.reset(arm)
    pb = lambda n: arm.pose.bones[P + n]  # noqa: E731
    feet = {s: pb(s + "Foot").matrix.to_3x3().normalized() for s in ("Left", "Right")}
    down = math.radians(40)
    for side, s in ((1, "Left"), (-1, "Right")):
        hip = ANIM.head_of(pb(s + "UpLeg"))
        ANIM.aim(pb(s + "UpLeg"), hip + Vector((0.012 * side, 0, -1)))
        ANIM.aim(pb(s + "Leg"), ANIM.head_of(pb(s + "Leg")) + Vector((0, 0, -1)))
        f = pb(s + "Foot")
        bpy.context.view_layer.update()
        f.matrix = Matrix.Translation(ANIM.head_of(f)) @ feet[s].to_4x4()
        bpy.context.view_layer.update()
        d = Vector((side * math.cos(down), 0.0, -math.sin(down)))
        for n in ("Arm", "ForeArm", "Hand"):
            b = pb(s + n)
            ANIM.aim(b, ANIM.head_of(b) + d)
    bpy.context.view_layer.update()
    with bpy.context.temp_override(active_object=ob, object=ob, selected_objects=[ob]):
        bpy.ops.object.modifier_apply(modifier=next(m.name for m in ob.modifiers if m.type == "ARMATURE"))
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    # the feet back on the ground: the straight legs are longer than the open ones
    lo = min(v.co.z for v in ob.data.vertices)
    ob.data.transform(Matrix.Translation((0, 0, -lo)))
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for eb in arm.data.edit_bones:
        eb.head.z -= lo
        eb.tail.z -= lo
    bpy.ops.object.mode_set(mode="OBJECT")
    top = max(v.co.z for v in ob.data.vertices)
    bt.log(f"A pose: feet lowered by {-lo:.3f} m, height {top:.3f} m")
    return top


# --- clips: CH_Fulmine's (08_anim.py), with this skeleton's hips and ankles ----------------------

def rig_dims(arm):
    b = arm.data.bones
    return {"foot_x": abs(b[P + "LeftFoot"].head_local.x), "ankle_z": b[P + "LeftFoot"].head_local.z,
            "hip_z": b[P + "LeftUpLeg"].head_local.z}


def pose_stance(arm, d, crouch=0.035):
    pb = lambda n: arm.pose.bones[P + n]  # noqa: E731
    ANIM.reset(arm)
    ANIM.move(pb("Hips"), (0, 0, -crouch))
    ANIM.arms_down(arm)
    for side, s in ((1, "Left"), (-1, "Right")):
        ANIM.two_bone(pb(s + "UpLeg"), pb(s + "Leg"), (d["foot_x"] * side, 0.0, d["ankle_z"]), (0.1 * side, -1, 0.5))
        ANIM.foot_flat(arm, s, 0, 8 * side)
        ANIM.turn(pb(s + "ForeArm"), (1, 0, 0), -12)


def make_idle(arm, d):
    pb = lambda n: arm.pose.bones[P + n]  # noqa: E731
    act = ANIM.new_action(arm, "idle")
    n = 60
    for f in range(0, n + 1, 6):
        ph = 2 * math.pi * f / n
        pose_stance(arm, d, 0.035 + 0.006 * (1 - math.cos(ph)) / 2)
        ANIM.turn(pb("Spine2"), (1, 0, 0), -1.8 * math.sin(ph))
        ANIM.turn(pb("Head"), (0, 0, 1), 4 * math.sin(ph))
        for side, s in ((1, "Left"), (-1, "Right")):
            ANIM.turn(pb(s + "Arm"), (0, 1, 0), 2.0 * side * math.sin(ph))
        ANIM.key(arm, f)
    ANIM.finish_action(arm, act, 0, n, True)


def leg_target(d, s, side):
    """Ankle target at stride phase s (0 = this foot lands in front), 08_anim.py's stride."""
    stride, lift, z0 = 0.27, 0.30, d["ankle_z"]
    if s < 0.38:
        t = s / 0.38
        return Vector((d["foot_x"] * side, -stride + 2 * stride * t, z0)), -5 + 10 * t
    t = (s - 0.38) / 0.62
    y = stride - 2 * stride * (0.5 - 0.5 * math.cos(math.pi * t))
    z = z0 + lift * math.sin(math.pi * min(1.0, t * 1.25)) ** 1.2 * (1.0 if t < 0.8 else (1 - t) / 0.2)
    return Vector((d["foot_x"] * side, y, z)), 35 * math.sin(math.pi * t)


def make_run(arm, d):
    pb = lambda n: arm.pose.bones[P + n]  # noqa: E731
    act = ANIM.new_action(arm, "run")
    n = 20
    for f in range(0, n + 1, 2):
        ph = f / n
        ANIM.reset(arm)
        hips = pb("Hips")
        ANIM.move(hips, (0, 0, -0.07 + 0.025 * math.cos(4 * math.pi * ph)))
        ANIM.turn(hips, (0, 0, 1), 8 * math.cos(2 * math.pi * ph))
        ANIM.turn(hips, (1, 0, 0), 6)
        for nme in ("Spine1", "Spine2"):
            ANIM.turn(pb(nme), (1, 0, 0), 5)
            ANIM.turn(pb(nme), (0, 0, 1), -6 * math.cos(2 * math.pi * ph))
        ANIM.turn(pb("Head"), (1, 0, 0), -10)
        ANIM.arms_down(arm, 30)
        for side, s, off in ((1, "Left", 0.0), (-1, "Right", 0.5)):
            target, pitch = leg_target(d, (ph + off) % 1.0, side)
            hip = ANIM.head_of(pb(s + "UpLeg"))
            ANIM.two_bone(pb(s + "UpLeg"), pb(s + "Leg"), hip + (target - Vector((d["foot_x"] * side, 0, d["hip_z"]))),
                          hip + Vector((0, -1.0, -0.2)))
            ANIM.foot_flat(arm, s, pitch, 0)
            swing = 38 * math.cos(2 * math.pi * (ph + off))
            ANIM.turn(pb(s + "Arm"), (1, 0, 0), swing)
            ANIM.turn(pb(s + "ForeArm"), (1, 0, 0), -75)
        ANIM.key(arm, f)
    ANIM.finish_action(arm, act, 0, n, True)


def make_kick(arm, d):
    pb = lambda n: arm.pose.bones[P + n]  # noqa: E731
    act = ANIM.new_action(arm, "kick")
    keys = [  # frame, right thigh swing (deg, + back), knee bend, body lean back, left arm out
        (0, 0, 10, 0, 0), (4, 45, 95, -4, 25), (8, -55, 10, 12, 45), (12, -70, 5, 15, 40), (18, 0, 10, 0, 0)]
    for f, thigh, knee, lean, arm_out in keys:
        pose_stance(arm, d, 0.05)
        ANIM.turn(pb("Spine1"), (1, 0, 0), -lean)
        ANIM.turn(pb("RightUpLeg"), (1, 0, 0), thigh)
        ANIM.turn(pb("RightLeg"), (1, 0, 0), knee)
        ANIM.foot_flat(arm, "Right", 40 if f in (8, 12) else 0, 0)
        ANIM.turn(pb("LeftArm"), (0, 1, 0), -arm_out)
        ANIM.turn(pb("RightArm"), (1, 0, 0), thigh * 0.4)
        ANIM.key(arm, f)
    act.pose_markers.new("contact").frame = 8
    ANIM.finish_action(arm, act, 0, 18, False)


def export(ob, arm, out):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    ob.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(out), export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
        export_animations=True, export_animation_mode="ACTIONS", export_def_bones=True, export_skins=True,
        export_texcoords=False, export_normals=True, export_materials="EXPORT", export_extras=True,
        export_cameras=False, export_lights=False, export_rest_position_armature=True,
        export_optimize_animation_size=False)
    bt.log("exported", out, os.path.getsize(out), "bytes")


def main():
    a = bt.argv_after_dashes()
    out = a[a.index("--out") + 1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = ANIM.FPS
    ob = import_mesh()
    arm = build_armature()
    bind(ob, arm)
    separate_arms(ob)
    cut_hands(ob)
    paint(ob, arm)
    top = a_pose(ob, arm)
    bind(ob, arm)
    arm["height"] = round(top, 3)                # glTF extras -> three userData.height (modelAppearance.ts)
    d = rig_dims(arm)
    bt.log("rig", {k: round(v, 3) for k, v in d.items()})
    arm.animation_data_create()
    make_idle(arm, d)
    make_run(arm, d)
    make_kick(arm, d)
    ANIM.reset(arm)
    if "--blend" in a:
        bt.save_master(a[a.index("--blend") + 1])
    export(ob, arm, out)


main()
