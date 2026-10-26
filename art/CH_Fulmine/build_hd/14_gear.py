"""CH_Fulmine HD, phase 14: goalkeeper gloves and football boots.

  blender --background --python build_hd/14_gear.py -- --master <dir>/CH_Fulmine_HD.blend

Concept: white padded gloves closed in fists, as wide as the head, with a wide cuff and a strap;
black boots with three red slanted stripes on the side, a red sole with chunky red studs.
Glove local frame: u along the arm toward the knuckles, n out of the palm (toward the thigh in
the A pose), w toward the thumb (forward).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hd  # noqa: E402
from dims import ARM_DOWN, WRIST, ANKLE, FOOT_X, arm_dir, mx  # noqa: E402
import bmesh  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402

hd.PHASE = "14_gear"
G = 1.0          # glove scale: the fist 0.16 m across, about the head's width with the ears


def glove(side):
    tag = "L" if side > 0 else "R"
    u = arm_dir(side).normalized()
    n = Vector((-math.sin(ARM_DOWN) * side, 0, -math.cos(ARM_DOWN)))
    w = Vector((0, -1, 0))
    o = mx(WRIST, side)

    def at(du, dn, dw):
        return o + u * (du * G) + n * (dn * G) + w * (dw * G)

    rot = Matrix((u, n, w)).transposed()
    cap, E = hd.capsule_between, []
    E.append(dict(co=tuple(at(0.07, 0.0, 0.0)), size=(0.064 * G, 0.038 * G, 0.07 * G), rot=rot))     # palm block
    for k, dw in enumerate((-0.05, -0.017, 0.017, 0.05)):                                          # fingers
        knuckle = at(0.135, -0.012, dw)
        p1 = at(0.172, 0.022, dw * 0.96)
        p2 = at(0.150, 0.055, dw * 0.92)
        r = (0.0205 if k in (1, 2) else 0.019) * G
        E += [cap(knuckle, p1, r * 0.92, stiffness=4.0), cap(p1, p2, r * 0.9, stiffness=4.0)]   # review 14: distinct fingers
    E += [cap(at(0.035, 0.02, 0.06), at(0.095, 0.05, 0.045), 0.021 * G),                          # thumb
          cap(at(0.095, 0.05, 0.045), at(0.128, 0.06, 0.012), 0.020 * G)]
    E.append(cap(at(-0.005, 0, 0), at(0.03, 0, 0), 0.05 * G))                                      # wrist
    ob = hd.metaball_mesh(f"CH_Fulmine_Glove.{tag}", E, resolution=0.003)
    hd.remesh(ob, 0.0018)
    hd.laplacian(ob, iterations=3, factor=0.5)
    # grooves between the fingers and across the knuckles, the panel on the back of the hand
    for dw in (-0.0335, 0.0, 0.0335):
        hd.line_brush(ob, at(0.135, -0.035, dw), at(0.19, 0.03, dw), 0.005, -0.005, taper=False)
        hd.line_brush(ob, at(0.19, 0.03, dw), at(0.16, 0.075, dw), 0.005, -0.005, taper=False)
    hd.line_brush(ob, at(0.145, -0.03, -0.075), at(0.145, -0.03, 0.075), 0.004, -0.002)
    for a, b in (((0.04, -0.05, -0.055), (0.115, -0.05, -0.055)), ((0.115, -0.05, -0.055), (0.115, -0.05, 0.055)),
                 ((0.115, -0.05, 0.055), (0.04, -0.05, 0.055)), ((0.04, -0.05, 0.055), (0.04, -0.05, -0.055))):
        hd.line_brush(ob, at(*a), at(*b), 0.0035, -0.002, taper=False)
    hd.smooth_shade(ob)
    hd.paint_faces(ob, ["guanti", "guanti_dettagli"], lambda c, nrm: 0)
    parts = [ob]
    # cuff: a wide padded band, and the strap across the back of the wrist
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=64, radius1=0.056 * G, radius2=0.054 * G, depth=0.075 * G)
    bmesh.ops.transform(bm, matrix=hd.frame(at(-0.012, 0, 0), u), verts=bm.verts)
    cuff = hd.from_bmesh(f"CH_Fulmine_GloveCuff.{tag}", bm)
    hd.solidify(cuff, 0.008, offset=-1.0)
    hd.modifier(cuff, "BEVEL", width=0.003, segments=3)
    hd.apply_modifiers(cuff)
    hd.smooth_shade(cuff)
    parts.append(hd.paint(cuff, "guanti"))
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=64, radius1=0.0605 * G, radius2=0.0605 * G, depth=0.034 * G)
    bmesh.ops.transform(bm, matrix=hd.frame(at(-0.010, 0, 0), u), verts=bm.verts)
    strap = hd.from_bmesh(f"CH_Fulmine_GloveStrap.{tag}", bm)
    hd.solidify(strap, 0.004, offset=-1.0)
    hd.modifier(strap, "BEVEL", width=0.0015, segments=2)
    hd.apply_modifiers(strap)
    hd.smooth_shade(strap)
    parts.append(hd.paint(strap, "guanti_dettagli"))
    return parts


# (y, half width, top z) along the boot, heel to toe; big chunky cleats (brief, proportion 5)
STATIONS = [(0.088, 0.040, 0.120), (0.080, 0.050, 0.140), (0.060, 0.058, 0.155), (0.030, 0.062, 0.160),
            (0.000, 0.064, 0.150), (-0.030, 0.066, 0.135), (-0.060, 0.068, 0.118), (-0.095, 0.069, 0.100),
            (-0.130, 0.069, 0.088), (-0.165, 0.066, 0.078), (-0.195, 0.060, 0.070), (-0.220, 0.050, 0.062),
            (-0.240, 0.036, 0.055), (-0.252, 0.018, 0.048)]


def ring(x0, y, hw, zb, zt, n=40, e=0.5):
    out = []
    zm, hz = (zb + zt) / 2, (zt - zb) / 2
    for i in range(n):
        a = 2 * math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        out.append((x0 + hw * math.copysign(abs(c) ** e, c), y, zm + hz * math.copysign(abs(s) ** e, s)))
    return out


def stations(fine=3):
    """STATIONS resampled with a Catmull-Rom pass so the loft has no kinks."""
    st = np.array(STATIONS)
    out = []
    for i in range(len(st) - 1):
        p0, p1, p2, p3 = st[max(0, i - 1)], st[i], st[i + 1], st[min(len(st) - 1, i + 2)]
        for k in range(fine):
            t = k / fine
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(st[-1])
    return out


def boot(side):
    tag = "L" if side > 0 else "R"
    x0 = FOOT_X * side
    st = stations()
    upper = hd.loft(f"CH_Fulmine_Boot.{tag}", [ring(x0, y, hw, 0.030, zt) for y, hw, zt in st])
    hd.subdivide(upper, 2)
    hd.laplacian(upper, iterations=4, factor=0.5)
    hd.smooth_shade(upper)
    hd.paint(upper, "scarpe")
    parts = [upper]
    sole = hd.loft(f"CH_Fulmine_Sole.{tag}", [ring(x0, y, hw + 0.006, 0.012, 0.036, e=0.3) for y, hw, _ in st])
    hd.subdivide(sole, 2)
    hd.smooth_shade(sole)
    parts.append(hd.paint(sole, "maglia"))
    # chunky studs, wider at the sole (concept: red blocks under the boot)
    bm = bmesh.new()
    for dx, y in ((0.034, 0.055), (-0.034, 0.055), (0.0, 0.07), (0.04, -0.075), (-0.04, -0.075),
                  (0.036, -0.165), (-0.036, -0.165), (0.0, -0.21)):
        vs = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=16, radius1=0.010, radius2=0.015,
                                   depth=0.016)["verts"]
        bmesh.ops.translate(bm, vec=(x0 + dx, y, 0.008), verts=vs)
    studs = hd.from_bmesh(f"CH_Fulmine_Studs.{tag}", bm)
    hd.modifier(studs, "BEVEL", width=0.002, segments=2)
    hd.apply_modifiers(studs)
    hd.smooth_shade(studs)
    parts.append(hd.paint(studs, "maglia"))
    # three slanted stripes on each side of the upper, laid on its surface
    p = hd.co(upper)
    for out_side in (1, -1):     # both sides; review 14 kept them under z 0.112 so they stay on the wall
        bm = bmesh.new()
        for k, y in enumerate((-0.005, -0.04, -0.075)):
            quad = []
            for dy, z in ((-0.009, 0.048), (0.009, 0.048), (0.028, 0.112), (0.010, 0.112)):   # on the side wall
                quad.append((y + dy, z))
            grid = []
            for i in range(9):
                row = []
                for j in range(4):
                    a, b = i / 8, j / 3
                    yb = quad[0][0] + (quad[1][0] - quad[0][0]) * b
                    yt = quad[3][0] + (quad[2][0] - quad[3][0]) * b
                    zz = quad[0][1] + (quad[3][1] - quad[0][1]) * a
                    yy = yb + (yt - yb) * a
                    near = (np.abs(p[:, 1] - yy) < 0.003) & (np.abs(p[:, 2] - zz) < 0.003) & ((p[:, 0] - x0) * out_side > 0)
                    xs = p[near][:, 0]
                    xx = (xs.max() if out_side > 0 else xs.min()) + 0.0012 * out_side if len(xs) else x0 + 0.07 * out_side
                    row.append(bm.verts.new((xx, yy, zz)))
                grid.append(row)
            for i in range(8):
                for j in range(3):
                    bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        st_ob = hd.from_bmesh(f"CH_Fulmine_BootStripes{'Out' if out_side == side else 'In'}.{tag}", bm)
        for f in st_ob.data.polygons:
            if (f.normal.x > 0) != (out_side > 0):
                f.flip()
        hd.solidify(st_ob, 0.0012, offset=1.0)
        hd.smooth_shade(st_ob)
        parts.append(hd.paint(st_ob, "maglia"))
    # laces across the instep, laid on the upper's top (review 14: a tongue box and a collar ring
    # stood out of the boot like planks)
    def top_z(x, y):
        near = (np.abs(p[:, 0] - x) < 0.004) & (np.abs(p[:, 1] - y) < 0.004)
        return float(p[near][:, 2].max()) if near.any() else 0.12

    for k, y in enumerate(np.linspace(0.005, -0.09, 6)):
        xa, xb = x0 - 0.02, x0 + 0.02
        ya, yb = (y, y - 0.014) if k % 2 else (y - 0.014, y)
        a = (xa, ya, top_z(xa, ya) + 0.0015)
        b = (xb, yb, top_z(xb, yb) + 0.0015)
        mid = ((xa + xb) / 2, (ya + yb) / 2, top_z(x0, (ya + yb) / 2) + 0.003)
        lace = hd.tube(f"CH_Fulmine_Lace{k}.{tag}", [a, mid, b], [0.0026] * 3, segments=10)
        hd.smooth_shade(lace)
        parts.append(hd.paint(lace, "scarpe"))
    return parts


def main():
    a = hd.args()
    hd.open_master(a["master"])
    hd.clear_owned()
    parts = glove(1) + glove(-1) + boot(1) + boot(-1)
    hd.log(f"{len(parts)} objects, {sum(hd.tris(o) for o in parts)} triangles")
    hd.save_master(a["master"])


main()
