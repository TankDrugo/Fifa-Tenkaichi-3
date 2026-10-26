"""CH_Fulmine HD, phase 11: shirt, shorts, socks, collar, cuffs, emblem.

  blender --background --python build_hd/11_clothes.py -- --master <dir>/CH_Fulmine_HD.blend

Garments are loose volumes around the body (metaballs), remeshed, given folds, made hollow
(solidify) and cut with clean booleans at the hem, the neck and the sleeves, so every opening
has a rim with thickness. The collar and the cuffs follow the cut edges, found by sampling the
garment surface. From the concept: red shirt with a cream crew collar and cream cuffs on wide
bell sleeves, a lightning-in-a-circle emblem on his left breast, wide cream shorts ending above
the knee, red socks to just under the knee with two cream stripes.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hd  # noqa: E402
from dims import SHOULDER, ELBOW, HIP, KNEE, ANKLE, SHIRT_HEM_Z, SHORTS_HEM_Z, SOCK_TOP_Z, mx, arm_dir  # noqa: E402
import bmesh  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector, Matrix, kdtree  # noqa: E402

hd.PHASE = "11_clothes"
SLEEVE_END = 0.235          # along the arm from the shoulder joint (concept: cuff above the elbow)
NECK_R = 0.068              # review 11: 0.075 with a steep tilt cut a scoop, the concept has a crew neck


def tree_of(ob):
    p = hd.co(ob)
    t = kdtree.KDTree(len(p))
    for i, v in enumerate(p):
        t.insert(v, i)
    t.balance()
    return t


def surface_ring(tree, centre, axis, u, v, r_min, r_max, n=48):
    """Points where rays from centre in the plane (u, v) meet the surface sampled by tree."""
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        d = u * math.cos(a) + v * math.sin(a)
        best, best_r = 1e9, r_min
        r = r_min
        while r <= r_max:
            _, _, dist = tree.find(centre + d * r)
            if dist < best:
                best, best_r = dist, r
            r += 0.0015
        pts.append(centre + d * best_r)
    return pts


def shirt():
    cap, ell = hd.capsule_between, hd.ellipsoid_along
    E = [dict(co=(0, -0.004, 1.31), size=(0.160, 0.112, 0.13)),        # chest
         dict(co=(0, 0.0, 1.13), size=(0.148, 0.108, 0.16)),           # belly, loose
         dict(co=(0, 0.002, 0.985), size=(0.152, 0.112, 0.07)),        # hem, a little flared
         dict(co=(0, 0.02, 1.415), size=(0.13, 0.075, 0.06))]          # upper back
    for s in (1, -1):
        sh, d = mx(SHOULDER, s), arm_dir(s)
        E.append(ell((0.02 * s, 0.022, 1.47), (0.15 * s, 0.008, 1.455), 0.04, 0.045))     # over the trapezius
        E.append(dict(type="BALL", co=tuple(sh + Vector((0, 0, 0.012))), size=(0.07, 0, 0)))  # shoulder
        # bell sleeve: 1.6 times the arm at the opening (brief, proportion 6)
        E.append(ell(sh - d * 0.02, sh + d * 0.14, 0.066, 0.068))
        E.append(ell(sh + d * 0.10, sh + d * (SLEEVE_END + 0.03), 0.082, 0.08))
    ob = hd.metaball_mesh("CH_Fulmine_Shirt", E, resolution=0.005)
    hd.remesh(ob, 0.003)
    hd.laplacian(ob, iterations=10, factor=0.5)
    # folds read off the concept: under the chest, at the belly, from the armpits, on the sleeves
    for s in (1, -1):
        hd.line_brush(ob, (0.135 * s, -0.05, 1.32), (0.05 * s, -0.11, 1.17), 0.012, -0.004)
        hd.line_brush(ob, (0.14 * s, -0.03, 1.27), (0.07 * s, -0.11, 1.09), 0.010, -0.003)
        hd.line_brush(ob, (0.14 * s, 0.03, 1.30), (0.06 * s, 0.11, 1.14), 0.010, -0.003)
        sh, d = mx(SHOULDER, s), arm_dir(s)
        up = Vector((0, 0, 1))
        for k, t in enumerate((0.09, 0.15, 0.20)):
            c = sh + d * t
            side = d.cross(up).normalized()
            hd.line_brush(ob, c + side * 0.09 + up * 0.03, c - side * 0.09 - up * 0.02, 0.008, -0.003 + 0.0006 * k)
    for k, z in enumerate((1.04, 1.10, 1.17)):
        hd.line_brush(ob, (-0.13, -0.11, z + 0.01 * k), (0.12, -0.115, z - 0.012), 0.010, -0.0028)
    hd.line_brush(ob, (-0.08, 0.12, 1.06), (0.09, 0.12, 1.09), 0.012, -0.003)
    hd.laplacian(ob, iterations=2, factor=0.4)
    hd.solidify(ob, 0.0045, offset=-1.0)
    # openings
    hd.boolean(ob, hd.cutter_box((1.0, 1.0, 1.0), Matrix.Translation((0, 0, SHIRT_HEM_Z - 0.5))))
    neck_axis = Vector((0, 0.25, 1.0)).normalized()                 # crew neck, a little lower in front
    m = hd.frame((0, 0.012, 1.50), neck_axis) @ Matrix.Diagonal((1.0, 0.88, 1.0, 1.0))
    hd.boolean(ob, hd.cutter_cylinder(NECK_R, 0.30, m))
    for s in (1, -1):
        sh, d = mx(SHOULDER, s), arm_dir(s)
        hd.boolean(ob, hd.cutter_box((0.5, 0.5, 0.5), hd.frame(sh + d * (SLEEVE_END + 0.25), d)))
    hd.smooth_shade(ob)
    hd.paint(ob, "maglia")
    return ob, neck_axis


def collar(shirt, neck_axis):
    tree = tree_of(shirt)
    c = Vector((0, 0.012, 1.50))
    # the cut's edge: the neck cylinder (r 0.075, squashed 0.88 in depth) meeting the shirt
    fr = hd.frame(c, neck_axis)
    u, v = Vector(fr.col[0][:3]), Vector(fr.col[1][:3])
    pts = []
    for k in range(64):
        a = 2 * math.pi * k / 64
        radial = u * math.cos(a) * NECK_R + v * math.sin(a) * NECK_R * 0.88
        best, best_t = 1e9, 0.0
        t = -0.16
        while t <= 0.10:
            _, _, dist = tree.find(c + radial + neck_axis * t)
            if dist < best:
                best, best_t = dist, t
            t += 0.002
        pts.append(c + radial * 1.04 + neck_axis * (best_t - 0.004))
    # review 11: the sampled edge is noisy; a circular moving average over 7 samples
    pts = [sum((pts[(k + j) % 64] for j in range(-3, 4)), Vector()) / 7 for k in range(64)]
    pts.append(pts[0])
    # a broad band (concept: cream collar about 2.5 cm), not a cord: (radial thickness, height)
    ob = hd.tube("CH_Fulmine_Collar", [tuple(p) for p in pts], [(0.005, 0.016)] * len(pts), segments=16, cap=False)
    hd.subdivide(ob, 1)
    hd.smooth_shade(ob)
    return hd.paint(ob, "maglia2")


def cuffs(shirt):
    tree = tree_of(shirt)
    out = []
    for s, tag in ((1, "L"), (-1, "R")):
        sh, d = mx(SHOULDER, s), arm_dir(s)
        end = sh + d * SLEEVE_END
        u = d.cross(Vector((0, 1, 0))).normalized()
        v = d.cross(u).normalized()
        ring = surface_ring(tree, end - d * 0.012, d, u, v, 0.04, 0.11)
        r = sum((p - (end - d * 0.012)).length for p in ring) / len(ring) + 0.0025
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=False, segments=48, radius1=r, radius2=r + 0.001, depth=0.024)
        bmesh.ops.transform(bm, matrix=hd.frame(end - d * 0.0125, d), verts=bm.verts)
        ob = hd.from_bmesh(f"CH_Fulmine_Cuff.{tag}", bm)
        hd.solidify(ob, 0.004, offset=-1.0)
        hd.modifier(ob, "BEVEL", width=0.0012, segments=2)
        hd.apply_modifiers(ob)
        hd.smooth_shade(ob)
        out.append(hd.paint(ob, "maglia2"))
    return out


def shorts():
    ell = hd.ellipsoid_along
    E = [dict(co=(0, 0.006, 0.93), size=(0.146, 0.11, 0.09)),
         dict(co=(0, 0.004, 0.99), size=(0.14, 0.104, 0.05))]
    for s in (1, -1):
        hp, kn = mx(HIP, s), mx(KNEE, s)
        hem = hp + (kn - hp) * ((HIP.z - SHORTS_HEM_Z) / (HIP.z - KNEE.z))
        # wide legs, flaring toward the hem (concept: 455 px across both legs at the hem)
        # review 11: one A-line leg each, no bulge at the hem
        E.append(ell(hp + Vector((0.008 * s, 0, 0.05)), hem + Vector((0.035 * s, 0, -0.05)), 0.097, 0.1))
    # the gap between the legs below the crotch (concept: inverted V at y 800 px)
    E.append(dict(co=(0, 0, 0.69), size=(0.03, 0.16, 0.14), neg=True, stiffness=4.0))   # review 16: higher, wider
    ob = hd.metaball_mesh("CH_Fulmine_Shorts", E, resolution=0.005)
    hd.remesh(ob, 0.003)
    hd.laplacian(ob, iterations=10, factor=0.5)
    for s in (1, -1):                 # folds from the crotch and down the legs
        hd.line_brush(ob, (0.03 * s, -0.10, 0.84), (0.13 * s, -0.11, 0.70), 0.010, -0.0035)
        hd.line_brush(ob, (0.05 * s, -0.10, 0.88), (0.17 * s, -0.08, 0.76), 0.010, -0.003)
        hd.line_brush(ob, (0.03 * s, 0.11, 0.84), (0.12 * s, 0.11, 0.69), 0.010, -0.003)
        hd.line_brush(ob, (0.20 * s, -0.02, 0.80), (0.21 * s, -0.04, 0.66), 0.010, -0.003)
    hd.laplacian(ob, iterations=2, factor=0.4)
    hd.solidify(ob, 0.0045, offset=-1.0)
    hd.boolean(ob, hd.cutter_box((1.0, 1.0, 1.0), Matrix.Translation((0, 0, 1.02 + 0.5))))
    for s in (1, -1):
        hp, kn = mx(HIP, s), mx(KNEE, s)
        axis = (kn - hp).normalized()
        hem = hp + (kn - hp) * ((HIP.z - SHORTS_HEM_Z) / (HIP.z - KNEE.z))
        hd.boolean(ob, hd.cutter_box((0.5, 0.5, 0.5), hd.frame(hem + axis * 0.25 + Vector((0.08 * s, 0, 0)), axis)))
    hd.smooth_shade(ob)
    return hd.paint(ob, "pantaloncini")


def socks(body):
    """Red socks from inside the boot to under the knee, ribbed top, two cream stripes."""
    p = hd.co(body)
    out = []
    for s, tag in ((1, "L"), (-1, "R")):
        kn, an = mx(KNEE, s), mx(ANKLE, s)
        rings = []
        zs = np.linspace(0.07, SOCK_TOP_Z, 40)
        n = 40
        for z in zs:
            t = (kn.z - z) / (kn.z - an.z)
            cx = kn.x + (an.x - kn.x) * t
            cy = kn.y + (an.y - kn.y) * t
            sl = p[(np.abs(p[:, 2] - z) < 0.004) & (np.abs(p[:, 0] - cx) < 0.09)]
            ang = np.arctan2(sl[:, 1] - cy, sl[:, 0] - cx)
            rad = np.hypot(sl[:, 0] - cx, sl[:, 1] - cy)
            ring = []
            for k in range(n):
                a = -math.pi + 2 * math.pi * k / n
                sel = np.abs(((ang - a + math.pi) % (2 * math.pi)) - math.pi) < math.pi / n * 1.5
                r = (rad[sel].max() if sel.any() else rad.max()) + 0.003
                if z > SOCK_TOP_Z - 0.03:
                    r += 0.002 * (1 + math.cos(k * math.pi / 2))     # ribbed top
                ring.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
            rings.append(ring)
        ob = hd.loft(f"CH_Fulmine_Sock.{tag}", rings, cap=False)
        hd.solidify(ob, 0.003, offset=-1.0)
        hd.subdivide(ob, 1)
        hd.smooth_shade(ob)
        # concept: two cream stripes just under the top
        hd.paint_faces(ob, ["calzettoni", "maglia2"],
                       lambda c, nrm: 1 if (0.392 < c.z < 0.408 or 0.362 < c.z < 0.378) else 0)
        out.append(ob)
    return out


def emblem(shirt):
    """Lightning in a circle on his left breast (concept: x 570 px, y 500 px)."""
    p = hd.co(shirt)
    cx, cz, r0, r1 = 0.078, 1.305, 0.030, 0.036

    def on_shirt(x, z):
        near = (np.abs(p[:, 0] - x) < 0.003) & (np.abs(p[:, 2] - z) < 0.003) & (p[:, 1] < 0)
        return float(p[near][:, 1].min()) - 0.0012 if near.any() else -0.12

    parts = []
    bm = bmesh.new()
    seg = 48
    inner = [bm.verts.new((cx + r0 * math.cos(2 * math.pi * k / seg), 0, cz + r0 * math.sin(2 * math.pi * k / seg))) for k in range(seg)]
    outer = [bm.verts.new((cx + r1 * math.cos(2 * math.pi * k / seg), 0, cz + r1 * math.sin(2 * math.pi * k / seg))) for k in range(seg)]
    for k in range(seg):
        bm.faces.new((inner[k], outer[k], outer[(k + 1) % seg], inner[(k + 1) % seg]))
    bolt = [(-0.005, 0.025), (0.013, 0.025), (0.003, 0.005), (0.013, 0.005), (-0.010, -0.027), (-0.002, -0.005),
            (-0.012, -0.005)]
    vs = [bm.verts.new((cx + x, 0, cz + z)) for x, z in bolt]
    es = [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=es)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
    for v in bm.verts:
        v.co.y = on_shirt(v.co.x, v.co.z)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = hd.from_bmesh("CH_Fulmine_Emblem", bm)
    for f in ob.data.polygons:
        if f.normal.y > 0:
            f.flip()
    hd.solidify(ob, 0.0008, offset=1.0)
    parts.append(hd.paint(ob, "maglia2"))
    return parts


def main():
    a = hd.args()
    hd.open_master(a["master"])
    hd.clear_owned()
    body = next(o for o in hd.bpy.data.objects if o.name == "CH_Fulmine_Body")
    sh, neck_axis = shirt()
    parts = [sh, collar(sh, neck_axis)] + cuffs(sh) + [shorts()] + socks(body) + emblem(sh)
    hd.log(", ".join(f"{o.name} {hd.tris(o)}" for o in parts))
    hd.save_master(a["master"])


main()
