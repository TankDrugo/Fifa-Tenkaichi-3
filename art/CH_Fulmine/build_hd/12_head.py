"""CH_Fulmine HD, phase 12: head and face.

  blender --background --python build_hd/12_head.py -- --master <dir>/CH_Fulmine_HD.blend

Read off ref/concept_front.webp (head crop, 1 px ~ 1 mm before the 1.22 head scale of the
gates): V jaw with a pointed chin, high cheekbones, long sharp nose with a reddish tip, eyes
narrowed under heavy brows whose inner ends drop to the nose, a wide grin showing clenched teeth,
ears that stand out. The skull is a subdivided quad sphere shaped by numpy brushes; eyes, lids,
brows, teeth and ears are their own meshes so each takes its material.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hd  # noqa: E402
from dims import HEAD_C, HEAD_R, CHIN_Z  # noqa: E402
import bmesh  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402

hd.PHASE = "12_head"

C = np.array(HEAD_C)
R = np.array(HEAD_R)
EYE_Z = 1.655           # concept: eyes at y 345 px, 0.6 of the way from chin to hairline
EYE_X = 0.040
EYE_R = 0.020           # review 12: eye 0.28 of the face width in the concept, was 0.17
MOUTH_Z = 1.571         # concept: grin at y 405 px, half way from the eyes to the chin
NOSE_TIP = Vector((0.0, -0.142, 1.603))


def quad_sphere(name, level=6):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2 ** level - 1, use_grid_fill=True)
    for v in bm.verts:
        v.co = v.co.normalized()
    return hd.from_bmesh(name, bm)


def skull(ob):
    p = hd.co(ob)                                  # unit sphere
    p = p * R + C
    u = (p[:, 0] - C[0]) / R[0]
    v = (p[:, 1] - C[1]) / R[1]
    w = (p[:, 2] - C[2]) / R[2]
    # the cranium is wider at the back-top, the face hangs below the front
    lower = np.clip((-0.05 - w) / 0.95, 0, 1)     # 0 above the cheekbones, 1 at the chin
    p[:, 0] *= 1.0 - 0.58 * lower ** 1.25          # V jaw
    back = np.clip(v, 0, 1)
    p[:, 1] -= 0.075 * lower ** 1.1 * back         # no jaw at the back: the neck goes there
    p[:, 1] -= 0.012 * lower ** 2 * np.clip(-v, 0, 1)   # chin forward
    p[:, 2] -= 0.01 * lower                         # a longer face
    # flatter face plane, rounder back
    front = np.clip(-v, 0, 1)
    p[:, 1] += 0.010 * front ** 3 * np.clip(1 - np.abs(u) * 0.8, 0, 1)
    # temples pinched a little, crown a little higher
    temple = np.exp(-((w - 0.25) / 0.25) ** 2) * np.clip(-v + 0.3, 0, 1)
    p[:, 0] *= 1.0 - 0.06 * temple
    hd.set_co(ob, p)


def surf(ob, x, z, out=0.0):
    """Front surface point of ob at (x, z), moved out along -Y by out: the front-most vertex
    near that column (ray_cast reads a cached copy of the mesh and misses the brushes)."""
    p = hd.co(ob)
    near = (np.abs(p[:, 0] - x) < 0.004) & (np.abs(p[:, 2] - z) < 0.004)
    if not near.any():
        raise SystemExit(f"no surface at x {x}, z {z}")
    q = p[near]
    k = np.argmin(q[:, 1] + 0.5 * np.hypot(q[:, 0] - x, q[:, 2] - z))
    return Vector((x, float(q[k, 1]) - out, z))


def face(ob):
    P = hd.push
    S = lambda x, z, out=0.0: surf(ob, x, z, out)  # noqa: E731
    for s in (1, -1):
        # eye sockets, then the heavy brow ridge over them
        P(ob, S(EYE_X * s, EYE_Z), 0.031, -0.012, scale=(1.25, 1, 0.85))
        hd.line_brush(ob, S(0.012 * s, EYE_Z + 0.018), S(0.074 * s, EYE_Z + 0.032), 0.013, 0.006)
        # cheekbones, high and sharp; hollows under them
        P(ob, S(0.07 * s, EYE_Z - 0.032), 0.03, 0.006)
        P(ob, S(0.056 * s, 1.578), 0.026, -0.005)
        # jaw corner
        P(ob, (0.074 * s, -0.02, 1.552), 0.03, 0.004)
    # nose: bridge, then the long sharp tip with a pinched end
    top, tip = S(0, EYE_Z + 0.004), S(0, NOSE_TIP.z)
    hd.line_brush(ob, top, tip + Vector((0, 0, 0.010)), 0.010, 0.020, direction=(0, -1, 0), taper=False)
    tip = S(0, NOSE_TIP.z)
    hd.log("nose: bridge top y", round(top.y, 4), "tip y after the bridge", round(tip.y, 4))
    P(ob, tip, 0.022, 0.030, direction=(0, -0.92, -0.38), kind="sharp")   # review 12: the nose stood out too little
    for s in (1, -1):
        P(ob, S(0.016 * s, NOSE_TIP.z - 0.004), 0.010, 0.004)                # nostril wings
        hd.line_brush(ob, S(0.022 * s, NOSE_TIP.z - 0.002), S(0.047 * s, 1.556), 0.007, -0.0025)  # smile folds
    P(ob, S(0, NOSE_TIP.z - 0.016), 0.010, -0.004)                            # under the tip
    hd.line_brush(ob, S(0, 1.590), S(0, 1.574), 0.005, -0.002)                # philtrum
    P(ob, S(0, CHIN_Z + 0.014), 0.028, 0.008, direction=(0, -0.6, -0.8))     # pointed chin
    # the grin: a recess along an arc, corners up (concept: 70 px wide)
    p = hd.co(ob)
    x = p[:, 0]
    arc = MOUTH_Z + 7.5 * x ** 2
    half = 0.040
    inside = np.clip(1 - np.abs(x) / half, 0, 1)
    thick = 0.0085 * inside ** 0.35
    dz = np.abs(p[:, 2] - arc)
    w = np.clip(1 - dz / np.maximum(thick, 1e-4), 0, 1) * (p[:, 1] < -0.06) * (inside > 0)
    p[:, 1] += 0.010 * w ** 0.7
    hd.set_co(ob, p)
    # lips: a rim above and below the recess
    for sign in (1, -1):
        p = hd.co(ob)
        x = p[:, 0]
        arc = MOUTH_Z + 7.5 * x ** 2 + sign * (0.0095 * np.clip(1 - np.abs(x) / half, 0, 1) ** 0.35 + 0.002)
        w = np.exp(-((p[:, 2] - arc) / 0.0035) ** 2) * np.clip(1 - np.abs(x) / (half + 0.004), 0, 1) * (p[:, 1] < -0.06)
        p[:, 1] -= 0.002 * w
        hd.set_co(ob, p)
    hd.laplacian(ob, iterations=3, factor=0.35)


def eye(head, side):
    """Eyeball (white), iris, pupil, and the lids: a skin shell with an angry almond opening."""
    c = surf(head, EYE_X * side, EYE_Z) + Vector((0, 0.0075, 0))
    parts = []
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=EYE_R)
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    parts.append(hd.paint(hd.smooth_shade(hd.from_bmesh(f"CH_Fulmine_Eye.{'L' if side > 0 else 'R'}", bm)), "occhi"))
    # iris and pupil: caps of the eyeball, looking straight ahead and a little up at the viewer
    look = Vector((-0.05 * side, -1.0, 0.08)).normalized()
    # iris and pupil: spherical caps on the eyeball (review 16: flat discs sank into it and
    # only their rims showed, so the irises read pale)
    for name, r, colour, grow in (("Iris", 0.0095, "iride", 1.025), ("Pupil", 0.0045, "pupilla", 1.04)):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=48, radius=EYE_R * grow)
        cos_max = math.cos(math.asin(min(0.99, r / EYE_R)))
        drop = [v for v in bm.verts if v.co.normalized().z < cos_max]   # keep the cap round +Z
        bmesh.ops.delete(bm, geom=drop, context="VERTS")
        rot = Vector((0, 0, 1)).rotation_difference(look).to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ rot, verts=bm.verts)
        ob = hd.from_bmesh(f"CH_Fulmine_{name}.{'L' if side > 0 else 'R'}", bm)
        hd.smooth_shade(ob)
        parts.append(hd.paint(ob, colour))
    # lids
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=48, radius=EYE_R * 1.10)
    drop = []
    for v in bm.verts:
        lx, ly, lz = v.co.x / (EYE_R * 1.1), v.co.y / (EYE_R * 1.1), v.co.z / (EYE_R * 1.1)
        if ly > -0.15:
            continue
        out = lx * side                                      # +1 toward the temple
        upper = 0.10 + 0.34 * out - 0.12 * out * out         # inner corner low: angry
        lower = -0.36 + 0.10 * out + 0.22 * out * out
        if lower < lz < upper and abs(lx) < 0.92:
            drop.append(v)
    bmesh.ops.delete(bm, geom=drop, context="VERTS")
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    lids = hd.from_bmesh(f"CH_Fulmine_Lids.{'L' if side > 0 else 'R'}", bm)
    hd.solidify(lids, 0.0016, offset=1.0)
    hd.smooth_shade(lids)
    # the dark upper lid line of the concept: faces of the shell near the opening's top edge
    def pick(cen, nrm):
        q = (cen - c) / (EYE_R * 1.1)
        out = q.x * side
        upper = 0.10 + 0.34 * out - 0.12 * out * out
        return 1 if (q.y < -0.3 and upper < q.z < upper + 0.22 and abs(q.x) < 1.0) else 0
    hd.paint_faces(lids, ["pelle", "sopracciglia"], pick)
    parts.append(lids)
    return parts


def brow(head, side):
    """Thick angular brow, inner end low over the nose, outer end up (concept)."""
    s = side
    guide = hd.bezier((0.012 * s, 0, EYE_Z + 0.006), (0.03 * s, 0, EYE_Z + 0.018),
                      (0.056 * s, 0, EYE_Z + 0.026), (0.084 * s, 0, EYE_Z + 0.036), 14)   # review 12: on the eyes
    pts = [tuple(surf(head, x, z, 0.0025)) for x, _, z in guide]
    # (depth out of the face, height): review 12 had them swapped and the brows read as lines
    radii = [(0.0035, 0.0095 * (1 - 0.62 * i / 13) + 0.0012) for i in range(14)]
    ob = hd.tube(f"CH_Fulmine_Brow.{'L' if s > 0 else 'R'}", pts, radii, segments=16, tip=True)
    hd.subdivide(ob, 1)
    hd.smooth_shade(ob)
    return hd.paint(ob, "sopracciglia")


def teeth(head):
    """Clenched rows along the grin, each tooth rounded, a groove between upper and lower."""
    parts = []
    n = 12
    half = 0.036
    for row, dz, h in (("Upper", 0.0028, 0.0052), ("Lower", -0.0028, 0.0045)):
        bm = bmesh.new()
        for i in range(n):
            x = -half + (i + 0.5) * 2 * half / n
            z = MOUTH_Z + 7.5 * x * x + dz
            y = surf(head, x, z).y + 0.0042              # front face 1.2 mm behind the recess
            w = 2 * half / n * 0.92 * (1 - 0.25 * (abs(x) / half) ** 2)
            t = bmesh.ops.create_cube(bm, size=1.0)["verts"]
            bmesh.ops.scale(bm, vec=(w, 0.006, h * (1 - 0.3 * (abs(x) / half) ** 2)), verts=t)
            yaw = math.atan2(36.0 * x, 1.0)
            bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(yaw, 3, "Z"), verts=t)
            bmesh.ops.translate(bm, vec=(x, y, z), verts=t)
        ob = hd.from_bmesh(f"CH_Fulmine_Teeth{row}", bm)
        hd.modifier(ob, "BEVEL", width=0.0008, segments=2)
        hd.apply_modifiers(ob)
        hd.smooth_shade(ob)
        parts.append(hd.paint(ob, "denti"))
    # dark inside of the mouth behind the teeth
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=1.0)
    bmesh.ops.scale(bm, vec=(0.034, 0.012, 0.009), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, surf(head, 0, MOUTH_Z).y + 0.020, MOUTH_Z + 0.002), verts=bm.verts)   # behind the teeth
    parts.append(hd.paint(hd.from_bmesh("CH_Fulmine_MouthInside", bm), "bocca"))
    return parts


def ear(side):
    """Ear standing out: a flattened shell, the helix rim as a tube, the bowl pushed in."""
    s = side
    base = Vector((0.094 * s, 0.012, 1.645))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=24, radius=1.0)
    bmesh.ops.scale(bm, vec=(0.012, 0.031, 0.046), verts=bm.verts)   # review 12: bigger, as in the concept
    ob = hd.from_bmesh(f"CH_Fulmine_Ear.{'L' if s > 0 else 'R'}", bm)
    # bowl
    hd.push(ob, (0.010, -0.002, 0.004), 0.026, -0.008, direction=(-1, 0, 0), scale=(1, 1.1, 1.4))
    rim = []
    for i in range(20):
        a = math.radians(-70 + 250 * i / 19)
        rim.append((0.005, -0.029 * math.cos(a) * 0.95 + 0.002, 0.044 * math.sin(a) * 0.95 + 0.002))
    helix = hd.tube("helix", rim, [0.0045 * (0.6 + 0.4 * math.sin(math.pi * i / 19)) for i in range(20)], segments=10)
    ob = hd.join(f"CH_Fulmine_Ear.{'L' if s > 0 else 'R'}", [ob, helix])
    hd.remesh(ob, 0.0012)
    hd.laplacian(ob, iterations=4, factor=0.5)
    m = (Matrix.Translation(base) @ Matrix.Rotation(math.radians(-24 * s), 4, "Z")
         @ Matrix.Rotation(math.radians(8 * s), 4, "Y"))
    if s < 0:
        m = m @ Matrix.Scale(-1, 4, (1, 0, 0))
    hd.transform(ob, m)
    if s < 0:
        bpy_flip(ob)
    hd.smooth_shade(ob)
    return hd.paint(ob, "pelle")


def bpy_flip(ob):
    for p in ob.data.polygons:
        p.flip()
    ob.data.update()


def main():
    a = hd.args()
    hd.open_master(a["master"])
    hd.clear_owned()
    head = quad_sphere("CH_Fulmine_Head", level=7)   # review 12: 1.8 mm grid, the nose needs it
    skull(head)
    face(head)
    hd.smooth_shade(head)
    # skin, with the reddish nose tip of the concept
    tip = surf(head, 0, NOSE_TIP.z)
    hd.paint_faces(head, ["pelle", "pelle_rossore"], lambda c, n: 1 if (c - tip).length < 0.012 else 0)
    parts = [head, ear(1), ear(-1), brow(head, 1), brow(head, -1)] + eye(head, 1) + eye(head, -1) + teeth(head)
    total = sum(hd.tris(o) for o in parts)
    zs = hd.co(head)[:, 2]
    hd.log(f"{len(parts)} objects, {total} triangles, head z {zs.min():.3f}..{zs.max():.3f}")
    hd.save_master(a["master"])


main()
