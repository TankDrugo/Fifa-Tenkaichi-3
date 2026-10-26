"""Shared helpers for the detailed CH_Fulmine (build_hd/NN_*.py): metaball volumes, voxel remesh,
numpy sculpt brushes, tubes and lofts with clean frames, booleans, materials.

Every phase script imports this, sets PHASE, opens the master, deletes what it owns, rebuilds and
saves. Metres, Z up, the player looks toward -Y, feet on z = 0.
"""
import math
import os
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Vector, Matrix

PHASE = "hd"


def tag():
    return "phase:" + PHASE


def args():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = {}
    for i, k in enumerate(a):
        if k.startswith("--"):
            out[k[2:]] = a[i + 1] if i + 1 < len(a) and not a[i + 1].startswith("--") else True
    return out


def open_master(path):
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(path))


def save_master(path):
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(path))


def col(name):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def clear_owned():
    for ob in [o for o in bpy.data.objects if o.get("owner") == tag()]:
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if data is not None and data.users == 0:
            if isinstance(data, bpy.types.Mesh):
                bpy.data.meshes.remove(data)
            elif isinstance(data, bpy.types.Armature):
                bpy.data.armatures.remove(data)
            elif isinstance(data, bpy.types.Curve):
                bpy.data.curves.remove(data)


def own(ob, collection="HIGH"):
    ob["owner"] = tag()
    if not ob.users_collection:
        col(collection).objects.link(ob)
    return ob


def log(*a):
    print("[" + PHASE + "]", *a, flush=True)


# --- mesh data as numpy -------------------------------------------------------------------------

def co(ob):
    me = ob.data
    a = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)


def set_co(ob, a):
    ob.data.vertices.foreach_set("co", np.ascontiguousarray(a, dtype=np.float64).ravel())
    ob.data.update()


def normals(ob):
    me = ob.data
    a = np.empty(len(me.vertices) * 3)
    me.vertex_normals.foreach_get("vector", a)
    return a.reshape(-1, 3)


def edges(ob):
    me = ob.data
    e = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", e)
    return e.reshape(-1, 2)


def mesh_object(name, me, collection="HIGH"):
    ob = bpy.data.objects.new(name, me)
    col(collection).objects.link(ob)
    return own(ob)


def from_bmesh(name, bm, collection="HIGH"):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return mesh_object(name, me, collection)


def apply_modifiers(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    if old.users == 0 and isinstance(old, bpy.types.Mesh):
        bpy.data.meshes.remove(old)
    return ob


def smooth_shade(ob):
    me = ob.data
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    return ob


def tris(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


# --- volumes ------------------------------------------------------------------------------------

MB_FACTOR = 0.575   # surface radius / element radius at stiffness 2, threshold 0.6 (measured)


def metaball_mesh(name, elements, resolution=0.004, collection="HIGH"):
    """elements: dicts with type BALL|ELLIPSOID|CAPSULE, co, size (surface half sizes, metres),
    rot (Matrix 3x3 or None), neg (bool). Returns a mesh object, the metaball removed."""
    mb = bpy.data.metaballs.new(name + "_mb")
    mb.resolution = resolution
    mb.render_resolution = resolution
    mb.threshold = 0.6
    for el in elements:
        e = mb.elements.new()
        e.type = el.get("type", "ELLIPSOID")
        e.co = el["co"]
        e.stiffness = el.get("stiffness", 2.0)
        e.use_negative = el.get("neg", False)
        sx, sy, sz = el["size"]
        if e.type == "BALL":
            e.radius = sx / MB_FACTOR
        elif e.type == "CAPSULE":
            # size: (half length of the straight part, radius, radius)
            e.radius = sy / MB_FACTOR
            e.size_x = sx
        else:
            r = max(sx, sy, sz)
            e.radius = r / MB_FACTOR
            e.size_x, e.size_y, e.size_z = sx / r, sy / r, sz / r
        if el.get("rot") is not None:
            e.rotation = el["rot"].to_quaternion()
    ob = bpy.data.objects.new(name + "_mb", mb)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.metaballs.remove(mb)
    me.name = name
    return mesh_object(name, me, collection)


def capsule_between(a, b, r, **kw):
    """Metaball capsule element from point a to point b with surface radius r."""
    a, b = Vector(a), Vector(b)
    d = b - a
    rot = d.to_track_quat("X", "Z").to_matrix()
    return dict(type="CAPSULE", co=tuple((a + b) / 2), size=(d.length / 2, r, r), rot=rot, **kw)


def ellipsoid_along(a, b, rx, rz=None, roll=0.0, **kw):
    """Metaball ellipsoid spanning a..b (its long axis), radii rx (side) and rz (depth)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    rot = d.to_track_quat("X", "Z").to_matrix() @ Matrix.Rotation(roll, 3, "X")
    return dict(type="ELLIPSOID", co=tuple((a + b) / 2), size=(d.length / 2, rx, rz or rx), rot=rot, **kw)


def remesh(ob, voxel=0.004, smooth=True):
    m = ob.modifiers.new("Remesh", "REMESH")
    m.mode = "VOXEL"
    m.voxel_size = voxel
    m.use_smooth_shade = smooth
    return apply_modifiers(ob)


def modifier(ob, kind, **props):
    m = ob.modifiers.new(kind.title(), kind)
    for k, v in props.items():
        setattr(m, k, v)
    return m


def subdivide(ob, levels=1):
    modifier(ob, "SUBSURF", levels=levels, render_levels=levels)
    return apply_modifiers(ob)


def solidify(ob, thickness, offset=-1.0, rim=True):
    modifier(ob, "SOLIDIFY", thickness=thickness, offset=offset, use_rim=rim, use_even_offset=True)
    return apply_modifiers(ob)


def boolean(ob, cutter, op="DIFFERENCE"):
    m = ob.modifiers.new("Bool", "BOOLEAN")
    m.operation = op
    m.solver = "EXACT"
    m.object = cutter
    cutter.hide_render = True
    cutter.hide_viewport = True
    apply_modifiers(ob)
    bpy.data.objects.remove(cutter, do_unlink=True)
    return ob


def cutter_box(size, matrix):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
    me = bpy.data.meshes.new("cutter")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("cutter", me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def cutter_cylinder(r, depth, matrix, segments=64):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=r, radius2=r, depth=depth)
    bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
    me = bpy.data.meshes.new("cutter")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("cutter", me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def frame(origin, axis):
    z = Vector(axis).normalized()
    helper = Vector((0, 0, 1)) if abs(z.z) < 0.9 else Vector((0, 1, 0))
    x = helper.cross(z).normalized()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = Vector(origin)
    return m


# --- sculpt brushes (numpy, in place on a mesh object) ------------------------------------------

def _fall(d, radius, kind="smooth"):
    t = np.clip(1.0 - d / radius, 0.0, 1.0)
    if kind == "sharp":
        return t * t
    if kind == "flat":
        return np.clip(t * 3.0, 0, 1)
    return t * t * (3 - 2 * t)


def push(ob, center, radius, amount, direction=None, scale=(1, 1, 1), kind="smooth", mask=None):
    """Move vertices within an ellipsoidal radius of center along their normal (or direction)."""
    p = co(ob)
    s = np.array(scale, dtype=float)
    d = np.linalg.norm((p - np.array(center)) / s, axis=1)
    w = _fall(d, radius, kind)
    if mask is not None:
        w = w * mask(p)
    if direction is None:
        n = normals(ob)
        p += n * (w * amount)[:, None]
    else:
        p += np.array(direction, dtype=float)[None, :] * (w * amount)[:, None]
    set_co(ob, p)


def line_brush(ob, a, b, radius, amount, kind="smooth", direction=None, taper=True, mask=None):
    """Ridge (+) or groove (-) along segment a-b, normal direction unless given; tapered ends."""
    p = co(ob)
    a, b = np.array(a, float), np.array(b, float)
    ab = b - a
    L2 = float(ab @ ab) or 1e-9
    t = np.clip(((p - a) @ ab) / L2, 0, 1)
    d = np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
    w = _fall(d, radius, kind)
    if taper:
        w *= np.sin(np.pi * t) ** 0.6
    if mask is not None:
        w = w * mask(p)
    if direction is None:
        p += normals(ob) * (w * amount)[:, None]
    else:
        p += np.array(direction, float)[None, :] * (w * amount)[:, None]
    set_co(ob, p)


def scale_region(ob, center, radius, factors, kind="smooth", mask=None):
    """Scale vertices about center inside radius (pinch < 1, inflate > 1 per axis)."""
    p = co(ob)
    c = np.array(center, float)
    d = np.linalg.norm(p - c, axis=1)
    w = _fall(d, radius, kind)
    if mask is not None:
        w = w * mask(p)
    f = np.array(factors, float)
    p = p + (c + (p - c) * f - p) * w[:, None]
    set_co(ob, p)


def laplacian(ob, iterations=5, factor=0.5, mask=None):
    """Umbrella smoothing; mask(p) -> 0..1 weight per vertex limits it to a region."""
    e = edges(ob)
    n = len(ob.data.vertices)
    deg = np.bincount(e.ravel(), minlength=n).astype(float)
    deg[deg == 0] = 1
    p = co(ob)
    w = factor * (mask(p) if mask is not None else np.ones(n))
    for _ in range(iterations):
        acc = np.zeros_like(p)
        np.add.at(acc, e[:, 0], p[e[:, 1]])
        np.add.at(acc, e[:, 1], p[e[:, 0]])
        avg = acc / deg[:, None]
        p = p + (avg - p) * w[:, None]
    set_co(ob, p)


def warp(ob, fn):
    """p -> fn(p) on all vertices (numpy array in, array out)."""
    set_co(ob, fn(co(ob)))


# --- tubes and lofts ----------------------------------------------------------------------------

def _frames(points):
    """Rotation-minimising frames along a polyline."""
    pts = [Vector(p) for p in points]
    tangents = []
    for i in range(len(pts)):
        a = pts[max(0, i - 1)]
        b = pts[min(len(pts) - 1, i + 1)]
        tangents.append((b - a).normalized())
    t0 = tangents[0]
    ref = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    n = t0.cross(ref).normalized()
    out = []
    for i, t in enumerate(tangents):
        if i:
            prev = tangents[i - 1]
            q = prev.rotation_difference(t)
            n = (q @ n).normalized()
        b = t.cross(n).normalized()
        out.append((t, n, b))
    return out


def tube(name, points, radii, segments=24, cap=True, flat=1.0, twist=0.0, collection="HIGH", tip=False):
    """Tube through points with radius per point (scalar or (r_n, r_b)), flat < 1 squashes the
    section along the binormal; tip=True closes the end in a point."""
    bm = bmesh.new()
    rings = []
    fr = _frames(points)
    for i, (p, r) in enumerate(zip(points, radii)):
        t, n, b = fr[i]
        rn, rb = (r, r * flat) if not isinstance(r, (tuple, list)) else r
        ring = []
        for k in range(segments):
            a = 2 * math.pi * k / segments + twist * i / max(1, len(points) - 1)
            ring.append(bm.verts.new(Vector(p) + n * math.cos(a) * rn + b * math.sin(a) * rb))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(segments):
            bm.faces.new((r0[k], r0[(k + 1) % segments], r1[(k + 1) % segments], r1[k]))
    if cap:
        bm.faces.new(rings[0][::-1])
        if tip:
            v = bm.verts.new(Vector(points[-1]) + fr[-1][0] * 0.001)
            for k in range(segments):
                bm.faces.new((rings[-1][k], rings[-1][(k + 1) % segments], v))
        else:
            bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return from_bmesh(name, bm, collection)


def bezier(p0, p1, p2, p3, n):
    out = []
    for i in range(n):
        t = i / (n - 1)
        u = 1 - t
        out.append(tuple(u ** 3 * Vector(p0) + 3 * u * u * t * Vector(p1) + 3 * u * t * t * Vector(p2) + t ** 3 * Vector(p3)))
    return out


def loft(name, sections, cap=True, collection="HIGH"):
    bm = bmesh.new()
    rings = [[bm.verts.new(p) for p in ring] for ring in sections]
    n = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    if cap:
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return from_bmesh(name, bm, collection)


def join(name, objects, collection="HIGH"):
    """New object from several (world space), sources removed."""
    bm = bmesh.new()
    for o in objects:
        me = o.data.copy()
        me.transform(o.matrix_world)
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    for o in objects:
        bpy.data.objects.remove(o, do_unlink=True)
    return from_bmesh(name, bm, collection)


def transform(ob, m):
    ob.data.transform(m)
    ob.data.update()
    return ob


# --- materials ----------------------------------------------------------------------------------

def lin(hex_colour):
    h = hex_colour.lstrip("#")
    out = []
    for i in range(3):
        c = int(h[2 * i:2 * i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


# name -> (sRGB hex, roughness); names in the first block are the team's (STUDIO-PERSONAGGI, 11)
PALETTE = {
    "maglia": ("#d8321f", 0.75),
    "maglia2": ("#f1e7cb", 0.8),
    "pantaloncini": ("#efe3c3", 0.8),
    "calzettoni": ("#d8321f", 0.85),
    "scarpe": ("#18181d", 0.45),
    "pelle": ("#eaa57c", 0.55),
    "pelle_rossore": ("#e47f66", 0.55),
    "capelli": ("#121019", 0.45),
    "capelli_riflesso": ("#3b2f93", 0.4),
    "guanti": ("#f3f0e7", 0.6),
    "guanti_dettagli": ("#cfcabd", 0.6),
    "occhi": ("#f6f1e6", 0.2),
    "iride": ("#2a1f1a", 0.2),
    "pupilla": ("#0b0a0d", 0.2),
    "denti": ("#f7f3e6", 0.3),
    "bocca": ("#4a1418", 0.6),
    "sopracciglia": ("#121019", 0.6),
}


def mat(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        if bpy.app.version < (5, 0, 0):
            m.use_nodes = True
    hexc, rough = PALETTE[name]
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = lin(hexc)
    bsdf.inputs["Roughness"].default_value = rough
    m.diffuse_color = lin(hexc)
    return m


def paint(ob, name):
    ob.data.materials.clear()
    ob.data.materials.append(mat(name))
    return ob


def paint_faces(ob, names, pick):
    """Several materials; pick(face centre Vector, face normal Vector) -> index into names."""
    ob.data.materials.clear()
    for n in names:
        ob.data.materials.append(mat(n))
    for p in ob.data.polygons:
        p.material_index = pick(p.center, p.normal)
    return ob
