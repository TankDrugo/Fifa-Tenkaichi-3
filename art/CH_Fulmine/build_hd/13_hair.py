"""CH_Fulmine HD, phase 13: spiky hair with the lightning crest.

  blender --background --python build_hd/13_hair.py -- --master <dir>/CH_Fulmine_HD.blend

From ref/concept_front.webp, head crop, mapped with the eyes and chin of the model:
1 px = 1.2 mm, z = 1.505 + (470 - y) * 0.0012, x = (x_px - 505) * 0.0012. The crest is the
front outline extruded and thinned toward its tip; the spikes are tapered blades from the cap;
cap, crest and spikes are fused by a 1.6 mm voxel remesh into one mass. The back and the depth
of the crest are inferred (the concept shows the front only). The blue-violet streak of the
concept is its own thin mesh laid on the crest.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hd  # noqa: E402
from dims import HEAD_C, HEAD_R  # noqa: E402
import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

hd.PHASE = "13_hair"
PX = 0.0012


def px(x, y):
    return ((x - 505) * PX, 1.505 + (470 - y) * PX)


def on_cap(x, z, side_y=None, out=0.004):
    """Point on the skull ellipsoid (offset out) at (x, z), on the front unless side_y given."""
    u = x / (HEAD_R.x + out)
    w = (z - HEAD_C.z) / (HEAD_R.z + out)
    r = max(0.0, 1 - u * u - w * w)
    y = math.sqrt(r) * (HEAD_R.y + out)
    return Vector((x, HEAD_C.y + (y if side_y == "back" else -y), z))


def cap():
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=31, use_grid_fill=True)
    for v in bm.verts:
        v.co = v.co.normalized()
        v.co = Vector((v.co.x * (HEAD_R.x + 0.006), v.co.y * (HEAD_R.y + 0.008), v.co.z * (HEAD_R.z + 0.008))) + HEAD_C
    drop = []
    for v in bm.verts:
        x, y, z = v.co
        if y < -0.05:
            hairline = 1.725 + 1.5 * x * x          # forehead, concept y 290 px
        elif y < 0.03:
            hairline = 1.672 if abs(x) > 0.07 else 1.70   # over the temples, ears below
        else:
            hairline = 1.575                        # nape (inferred)
        if z < hairline:
            drop.append(v)
    bmesh.ops.delete(bm, geom=drop, context="VERTS")
    ob = hd.from_bmesh("hair_cap", bm)
    hd.solidify(ob, 0.007, offset=-1.0)
    return ob


# front outline of the crest, image px, from the left corner of the hair mass to the bolt's tip
# and back down its right edge; the bottom sits inside the hair mass
CREST_PX = [(447, 290), (430, 230), (424, 175), (500, 118), (467, 104), (615, 20), (550, 108),
            (593, 104), (550, 165), (570, 215), (563, 290), (505, 280)]   # review 13: inside the cap at the temples


def outline_points(poly_px, step_px=4):
    pts = []
    for (x0, y0), (x1, y1) in zip(poly_px, poly_px[1:] + poly_px[:1]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step_px))
        for k in range(n):
            t = k / n
            pts.append(px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    return pts


def crest_depth(z):
    t = np.clip((np.asarray(z) - 1.80) / 0.245, 0.0, 1.0)
    return 0.055 * (1 - t) ** 0.9 + 0.010         # inferred: 13 cm at the base, 2 cm at the tip, before rounding


def crest_centre(z):
    t = np.clip((np.asarray(z) - 1.80) / 0.245, 0.0, 1.0)
    return HEAD_C.y + 0.004 + 0.03 * t              # leans back toward the tip (inferred)


def crest():
    """The front outline extruded through the crest's depth; rounded after the remesh."""
    pts = outline_points(CREST_PX)
    bm = bmesh.new()
    front = [bm.verts.new((x, -1.0, z)) for x, z in pts]
    face = bm.faces.new(front)
    res = bmesh.ops.extrude_face_region(bm, geom=[face])
    back = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 2.0, 0), verts=back)
    for v in bm.verts:
        y = float(crest_centre(v.co.z)) + (-1 if v.co.y < 0 else 1) * float(crest_depth(v.co.z))
        v.co.y = y
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return hd.from_bmesh("hair_crest", bm)


def inside(poly, q):
    """Points q (n, 2) inside polygon poly (m, 2), even-odd rule."""
    x, y = q[:, 0][:, None], q[:, 1][:, None]
    a, b = poly, np.roll(poly, -1, axis=0)
    cross = ((a[:, 1] > y) != (b[:, 1] > y)) & (x < (b[:, 0] - a[:, 0]) * (y - a[:, 1]) / (b[:, 1] - a[:, 1] + 1e-12) + a[:, 0])
    return cross.sum(1) % 2 == 1


def round_crest(hair, round_w=0.075):   # review 13: 2.4 cm left a flat plate over the forehead
    """Pillow the crest: its half depth grows from 0 on the outline to the full depth round_w
    inside it, so the rim is round and the tips stay thin; blended in above the hair mass."""
    poly = np.array(outline_points(CREST_PX, step_px=3))
    p = hd.co(hair)
    # crest vertices: above the temples and outside the cap's shell
    e = np.sqrt((((p - np.array(HEAD_C)) / np.array(HEAD_R)) ** 2).sum(1))
    sel = np.where((p[:, 2] > 1.66) & (e > 1.10))[0]
    q = p[sel][:, [0, 2]]
    a, b = poly, np.roll(poly, -1, axis=0)
    ab = b - a
    d = np.full(len(q), np.inf)
    for i in range(len(a)):
        t = np.clip(((q - a[i]) @ ab[i]) / max(ab[i] @ ab[i], 1e-12), 0, 1)
        d = np.minimum(d, np.linalg.norm(a[i] + t[:, None] * ab[i] - q, axis=1))
    d = np.where(inside(poly, q), d, 0.0)
    z = p[sel, 2]
    yc = crest_centre(z)
    target = crest_depth(z) * np.sin(np.pi / 2 * np.clip(d / round_w, 0, 1)) ** 0.7
    blend = np.ones_like(z)
    off = p[sel, 1] - yc
    near_crest = np.abs(off) <= crest_depth(z) + 0.004     # spikes sticking out keep their shape
    new = yc + np.sign(off) * np.minimum(np.abs(off), target)
    p[sel, 1] = np.where(near_crest, off * 0 + p[sel, 1] + (new - p[sel, 1]) * blend, p[sel, 1])
    hd.set_co(hair, p)
    hd.laplacian(hair, iterations=4, factor=0.5, mask=lambda pp: np.clip((pp[:, 2] - 1.70) / 0.05, 0, 1))


def strands(ob):
    """Grooves along the bolt on both faces of the crest, the way the concept draws strands."""
    for k, (a_px, b_px) in enumerate([((440, 200), (520, 130)), ((455, 215), (540, 140)), ((475, 230), (560, 150)),
                                      ((500, 240), (565, 175)), ((485, 105), (600, 32)), ((500, 102), (590, 45)),
                                      ((430, 185), (490, 128)), ((520, 245), (575, 205))]):
        ax, az = px(*a_px)
        bx, bz = px(*b_px)
        for side in (-1, 1):
            p = hd.co(ob)
            near = lambda x, z: p[(np.abs(p[:, 0] - x) < 0.004) & (np.abs(p[:, 2] - z) < 0.004)][:, 1]  # noqa: E731
            ya, yb = near(ax, az), near(bx, bz)
            if not len(ya) or not len(yb):
                continue
            pick = (lambda a: a.min()) if side < 0 else (lambda a: a.max())
            hd.line_brush(ob, (ax, float(pick(ya)), az), (bx, float(pick(yb)), bz), 0.0045, -0.0022)


def spike(root, tip, r0, bend=(0, 0, 0), flat=0.55, n=10):
    a, b = Vector(root), Vector(tip)
    m1 = a + (b - a) * 0.35 + Vector(bend) * 0.6
    m2 = a + (b - a) * 0.7 + Vector(bend)
    pts = hd.bezier(a, m1, m2, b, n)
    radii = [r0 * (1 - i / (n - 1)) ** 0.85 + 0.0004 for i in range(n)]
    return hd.tube("spike", pts, radii, segments=12, flat=flat, tip=True)


def spikes():
    out = []
    # sides: the concept's tufts over the temples (image left = his right = -x)
    for tip_px, root_px, r in [((403, 272), (440, 268), 0.022), ((410, 232), (447, 232), 0.022),
                               ((418, 290), (445, 300), 0.018), ((410, 330), (432, 316), 0.014),
                               ((588, 262), (556, 258), 0.022), ((585, 213), (548, 215), 0.024),
                               ((590, 305), (560, 300), 0.018), ((578, 330), (565, 312), 0.014),
                               ((563, 232), (540, 230), 0.016)]:
        rx, rz = px(*root_px)
        tx, tz = px(*tip_px)
        root = on_cap(rx, rz, out=-0.01)
        tip = Vector((tx, root.y + 0.03, tz))
        out.append(spike(root, tip, r, bend=(0, 0.01, 0.018), flat=0.8))   # review 13: end-on they read as plates
    # bangs pointing down onto the forehead (concept: centre lock to y 322 px)
    for tip_px, root_px, r in [((505, 322), (505, 255), 0.02), ((470, 305), (468, 255), 0.016),
                               ((540, 302), (542, 255), 0.016), ((448, 318), (448, 265), 0.012),
                               ((563, 318), (565, 268), 0.012), ((488, 312), (488, 262), 0.012),
                               ((522, 310), (522, 262), 0.012), ((432, 322), (436, 270), 0.012),
                               ((578, 322), (575, 272), 0.012), ((455, 300), (458, 258), 0.010),
                               ((555, 298), (553, 258), 0.010)]:   # review 13: the rim read as a helmet
        rx, rz = px(*root_px)
        tx, tz = px(*tip_px)
        root = on_cap(rx, rz, out=0.0)
        tip = on_cap(tx, tz, out=0.012)
        out.append(spike(root, tip, r, bend=(0, -0.012, 0.0), flat=0.4))
    # back and crown: a mane of blades sweeping out, back and up like the crest (inferred);
    # review 13: blades pointing down read as bumps and even rows as a pine cone, so every blade
    # leans out and back, with angles and lengths drawn from a fixed seed
    rng = np.random.default_rng(7)
    for el in (55, 30, 5, -18, -36):
        for az in range(100, 261, 22 if el > -30 else 28):
            a = math.radians(az + rng.uniform(-9, 9) + (11 if el in (30, -18) else 0))
            e = math.radians(el + rng.uniform(-7, 7))
            d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
            root = HEAD_C + Vector((d.x * HEAD_R.x, d.y * HEAD_R.y, d.z * HEAD_R.z)) * 0.95
            lift = Vector((rng.uniform(-0.1, 0.1), 0.30, 0.32)) if el > -30 else Vector((0, 0.35, -0.25))
            length = (0.07 + 0.045 * max(0.0, el) / 55) * rng.uniform(0.8, 1.3)
            tip = root + (d + lift).normalized() * length
            out.append(spike(root, tip, (0.02 + 0.007 * (el > 10)) * rng.uniform(0.85, 1.15),
                             bend=(0, 0.01, 0.014)))
    return out


def streak(hair):
    """The blue-violet lightning in the crest (concept: x 445-532, y 150-262 px), laid on the
    crest's front 0.8 mm out."""
    poly = [(445, 213), (520, 150), (500, 192), (532, 186), (470, 262), (487, 216), (458, 226)]
    p = hd.co(hair)
    bm = bmesh.new()
    vs = [bm.verts.new((px(x, y)[0], 0.0, px(x, y)[1])) for x, y in poly]
    es = [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=es)   # concave-safe
    for _ in range(3):
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
    for v in bm.verts:
        near = (np.abs(p[:, 0] - v.co.x) < 0.003) & (np.abs(p[:, 2] - v.co.z) < 0.003)
        v.co.y = (float(p[near][:, 1].min()) if near.any() else -0.06) - 0.0008
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = hd.from_bmesh("CH_Fulmine_HairStreak", bm)
    for f in ob.data.polygons:
        if f.normal.y > 0:
            f.flip()
    hd.solidify(ob, 0.0008, offset=1.0)
    hd.smooth_shade(ob)
    return hd.paint(ob, "capelli_riflesso")


def main():
    a = hd.args()
    hd.open_master(a["master"])
    hd.clear_owned()
    parts = [cap(), crest()] + spikes()
    hair = hd.join("CH_Fulmine_Hair", parts)
    hd.remesh(hair, 0.0016)
    hd.laplacian(hair, iterations=2, factor=0.4)
    round_crest(hair)
    strands(hair)
    hd.smooth_shade(hair)
    hd.paint(hair, "capelli")
    st = streak(hair)
    zs = hd.co(hair)[:, 2]
    hd.log(f"hair {hd.tris(hair)} triangles, z {zs.min():.3f}..{zs.max():.3f}; streak {hd.tris(st)}")
    hd.save_master(a["master"])


main()
