"""CH_Fulmine, phase 02: every part of the footballer, in world space, standing in A pose.

  blender --background --python build/02_body.py -- --master <dir>/CH_Fulmine_master.blend

Metres, Z up, the player looks toward -Y, feet on z = 0. Constants come from asset-brief.md:
the head is read off ref/concept_front.webp at 1 px = 1 mm (chin at y 470 px -> z 1.55 m,
face centre at x 505 px -> x 0); everything the concept does not show is marked # inferred.
Every part is its own object in LOW with identity transforms; 06_rig.py weights and joins them.
"""
import os
import sys
import math

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bt  # noqa: E402  (the skill's build template, used as a library)
from bt import col, own, log, apply_all_modifiers, open_master, save_master, clear_owned, argv_after_dashes  # noqa: E402

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402

bt.PHASE = "02_body"
bt.OWNER_TAG = "phase:02_body"

# --- colours (sRGB hex from the concept) --------------------------------------------------------
SKIN = "#e8a27a"
NOSE = "#e9806a"
HAIR = "#15131c"
HAIR_HI = "#3a2f8a"
GLOVE = "#f2efe6"
GLOVE_PAD = "#d9d4c8"
EYE_WHITE = "#f4efe2"
PUPIL = "#1a1420"
MOUTH = "#5a1c1c"
TEETH = "#f6f1e4"
WHITE = "#ffffff"
TEAM = {  # the named materials the game recolours (docs/STUDIO-PERSONAGGI.md, section 11)
    "maglia": "#d93a26",
    "maglia2": "#f0e6c8",
    "pantaloncini": "#efe4c4",
    "calzettoni": "#d93a26",
    "scarpe": "#1c1c22",
}
FIXED = "fissi"   # one material for every part the team does not recolour, coloured per vertex


def lin(hex_colour):
    """sRGB hex -> linear RGBA, the space Blender keeps colours in."""
    h = hex_colour.lstrip("#")
    out = []
    for i in range(3):
        c = int(h[2 * i:2 * i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


def materials():
    mats = {}
    for name, hexc in TEAM.items():
        m = bt.material(name, lin(hexc), roughness=0.7)
        mats[name] = m
    m = bpy.data.materials.get(FIXED) or bpy.data.materials.new(FIXED)
    if bpy.app.version < (5, 0, 0):
        m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = 0.7
    attr = next((n for n in nt.nodes if n.type == "VERTEX_COLOR"), None) or nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    mats[FIXED] = m
    return mats


# --- mesh helpers -------------------------------------------------------------------------------

def frame(origin, axis):
    """4x4 matrix whose local Z runs along axis from origin."""
    z = Vector(axis).normalized()
    helper = Vector((0, 0, 1)) if abs(z.z) < 0.9 else Vector((0, 1, 0))
    x = helper.cross(z).normalized()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = Vector(origin)
    return m


def finish(name, bm, colour, mat_name, smooth=True):
    """bmesh -> object in LOW, one material, one vertex colour, identity transform."""
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    col("LOW").objects.link(ob)
    own(ob)
    ob.data.materials.append(MATS[mat_name])
    paint(ob, lambda c: colour)
    for p in me.polygons:
        p.use_smooth = smooth
    return ob


def paint(ob, colour_of):
    """Corner colour attribute 'Col' from colour_of(face centre) -> hex."""
    me = ob.data
    attr = me.color_attributes.get("Col") or me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    for p in me.polygons:
        c = lin(colour_of(p.center))
        for li in p.loop_indices:
            attr.data[li].color = c


def tube(name, origin, axis, length, r0, r1, colour, mat, segments=16, caps=False, scale_xy=(1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=segments,
                          radius1=r0, radius2=r1, depth=length)
    bmesh.ops.scale(bm, vec=(scale_xy[0], scale_xy[1], 1), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, 0, length / 2), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=frame(origin, axis), verts=bm.verts)
    return finish(name, bm, colour, mat)


def ellipsoid(name, centre, radii, colour, mat, u=16, v=10, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0)
    bmesh.ops.scale(bm, vec=radii, verts=bm.verts)
    if rot is not None:
        bmesh.ops.transform(bm, matrix=rot.to_4x4(), verts=bm.verts)
    bmesh.ops.translate(bm, vec=centre, verts=bm.verts)
    return finish(name, bm, colour, mat)


def rounded_box(name, size, m, colour, mat, bevel=0.01):
    """Box of size (x, y, z) placed by the 4x4 matrix m, edges bevelled."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect="EDGES", profile=0.5)
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return finish(name, bm, colour, mat)


def loft_sections(name, sections, colour, mat):
    """Closed rings of equal point count bridged in order, both ends capped."""
    bm = bmesh.new()
    rings = [[bm.verts.new(p) for p in ring] for ring in sections]
    n = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(name, bm, colour, mat)


def scale_parts(parts, pivot, f):
    """Scale finished parts about pivot by f = (fx, fy, fz): the brief's size corrections."""
    pv = Vector(pivot)
    for ob in parts:
        for v in ob.data.vertices:
            d = v.co - pv
            v.co = pv + Vector((d.x * f[0], d.y * f[1], d.z * f[2]))
        ob.data.update()
    return parts


def mirror_x(p):
    return (-p[0], p[1], p[2])


# --- measurements (metres) ----------------------------------------------------------------------
# Standing proportions are inferred from the brief (the concept is a crouch in perspective):
# skull top 1.78, chin 1.55, crotch 0.84, long arms (wrist at 0.80 when hanging).
SHOULDER = (0.17, 0.0, 1.44)                     # review 06: shoulders right under the chin
ARM_DOWN = math.radians(40)                      # A pose: upper arm 40 degrees below horizontal
ARM_DIR = Vector((math.cos(ARM_DOWN), 0.0, -math.sin(ARM_DOWN)))
UPPER_ARM, FOREARM = 0.33, 0.30                  # inferred: long arms (brief, proportion 9)
ELBOW = Vector(SHOULDER) + ARM_DIR * UPPER_ARM + Vector((0, 0.012, 0))
WRIST = ELBOW + ARM_DIR * FOREARM + Vector((0, -0.017, 0))
HIP = (0.095, 0.0, 0.86)
KNEE = (0.105, -0.01, 0.50)
ANKLE = (0.105, 0.01, 0.11)
FOOT_X = 0.112


def body():
    """Torso, neck, arms and legs as one Skin-modifier mesh: quad loops at every joint."""
    L = [
        ((0, 0, 0.93), (0.125, 0.095)),        # 0 pelvis
        ((0, 0, 1.03), (0.112, 0.082)),        # 1 waist (brief: waist 0.8 of chest)
        ((0, 0, 1.14), (0.122, 0.086)),        # 2 belly
        ((0, -0.005, 1.26), (0.145, 0.094)),   # 3 chest
        ((0, 0, 1.38), (0.165, 0.092)),        # 4 upper chest (review 06: wider)
        ((0, 0.01, 1.46), (0.060, 0.057)),     # 5 neck base
        ((0, 0.012, 1.57), (0.052, 0.052)),    # 6 neck top, inside the skull
    ]
    edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6)]

    def limb(points, start):
        first = len(L)
        for p, r in points:
            L.append((p, r))
        edges.append((start, first))
        for i in range(first, first + len(points) - 1):
            edges.append((i, i + 1))

    mid_upper = Vector(SHOULDER) + ARM_DIR * (UPPER_ARM / 2)
    mid_fore = ELBOW + (WRIST - ELBOW) / 2
    arm = [(tuple(SHOULDER), (0.058, 0.058)), (tuple(mid_upper), (0.047, 0.047)),
           (tuple(ELBOW), (0.040, 0.040)), (tuple(mid_fore), (0.040, 0.037)), (tuple(WRIST), (0.031, 0.029))]
    leg = [(HIP, (0.084, 0.084)), ((0.10, -0.005, 0.68), (0.066, 0.068)), (KNEE, (0.049, 0.051)),
           ((0.105, 0.0, 0.33), (0.047, 0.050)), (ANKLE, (0.032, 0.034))]
    limb(arm, 4)
    limb([(mirror_x(p), r) for p, r in arm], 4)
    limb(leg, 0)
    limb([(mirror_x(p), r) for p, r in leg], 0)

    me = bpy.data.meshes.new("CH_Fulmine_Body")
    me.from_pydata([p for p, _ in L], edges, [])
    ob = bpy.data.objects.new("CH_Fulmine_Body", me)
    col("LOW").objects.link(ob)
    own(ob)
    skin = ob.modifiers.new("Skin", "SKIN")
    skin.use_smooth_shade = True
    for i, (_, r) in enumerate(L):
        me.skin_vertices[0].data[i].radius = r
        me.skin_vertices[0].data[i].use_root = (i == 0)
    sub = ob.modifiers.new("Subdivision", "SUBSURF")
    sub.levels = 1
    apply_all_modifiers(ob)

    # one material per zone of the costume, read off the concept
    for m in (MATS["maglia"], MATS["pantaloncini"], MATS["calzettoni"], MATS[FIXED]):
        ob.data.materials.append(m)
    slot = {"maglia": 0, "pantaloncini": 1, "calzettoni": 2, FIXED: 3}

    def zone(c):
        if abs(c.x) > 0.16 and c.z > 0.95:                       # arms
            t = (Vector((abs(c.x), c.y, c.z)) - Vector(SHOULDER)).dot(ARM_DIR)
            return "maglia" if t < 0.20 else FIXED               # under the sleeve, then skin
        if c.z > 1.44:
            return FIXED                                         # neck
        if c.z < 0.86 and abs(c.x) > 0.03:                       # legs
            if c.z > 0.62:
                return "pantaloncini"
            return FIXED if c.z > 0.45 else "calzettoni"         # knee skin, then socks
        return "maglia" if c.z > 0.99 else "pantaloncini"

    for p in ob.data.polygons:
        p.material_index = slot[zone(p.center)]
    paint(ob, lambda c: SKIN if zone(c) == FIXED else WHITE)
    return ob


def radius_at(body_ob, centre_xy, z, dz=0.012, side=None):
    """Largest distance from a vertical axis of the body's vertices near height z."""
    cx, cy = centre_xy
    best = 0.0
    for v in body_ob.data.vertices:
        if abs(v.co.z - z) < dz and (side is None or v.co.x * side > 0.02):
            d = math.hypot(v.co.x - cx, v.co.y - cy)
            if d < 0.12:
                best = max(best, d)
    return best


def clothes(body_ob):
    parts = []
    for side, tag in ((1, "L"), (-1, "R")):
        s = Vector((SHOULDER[0] * side, SHOULDER[1], SHOULDER[2]))
        d = Vector((ARM_DIR.x * side, ARM_DIR.y, ARM_DIR.z))
        start = s - d * 0.03
        # bell sleeve, 1.6 times the arm (brief, proportion 6), cuff in the second colour
        parts.append(tube(f"CH_Fulmine_Sleeve.{tag}", start, d, 0.215, 0.066, 0.088, WHITE, "maglia"))
        parts.append(tube(f"CH_Fulmine_Cuff.{tag}", start + d * 0.2, d, 0.03, 0.089, 0.091, WHITE, "maglia2"))
        # wide shorts over each thigh, hem above the knee (brief, proportion 7); the tops lean in
        # under the waist band so nothing sticks out at the hips
        top = Vector((0.062 * side, -0.003, 0.93))
        hem = Vector((0.112 * side, -0.008, 0.625))
        parts.append(tube(f"CH_Fulmine_ShortsLeg.{tag}", hem, top - hem, (top - hem).length, 0.108, 0.078,
                          WHITE, "pantaloncini"))
        # two light stripes at the top of the sock (brief, proportion 8)
        for k, z in enumerate((0.405, 0.372)):
            r = radius_at(body_ob, (KNEE[0] * side, -0.004), z, side=side) + 0.003
            parts.append(tube(f"CH_Fulmine_SockStripe{k}.{tag}", (0.105 * side, -0.004, z - 0.0065), (0, 0, 1),
                              0.013, r, r, WHITE, "maglia2", segments=20))
    # waist of the shorts, under the shirt hem
    parts.append(tube("CH_Fulmine_ShortsWaist", (0, -0.002, 0.84), (0, 0, 1), 0.14, 0.142, 0.13, WHITE,
                      "pantaloncini", segments=24, scale_xy=(1.0, 0.76)))
    # shirt hem hanging over the shorts
    parts.append(tube("CH_Fulmine_ShirtHem", (0, 0, 0.955), (0, 0, 1), 0.08, 0.135, 0.124, WHITE, "maglia",
                      segments=24, scale_xy=(1.0, 0.78)))
    # collar: a ring at the neck base, lower in front
    bm = bmesh.new()
    seg, minor_seg = 24, 8
    verts = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        ring = []
        for j in range(minor_seg):
            b = 2 * math.pi * j / minor_seg
            rx, ry = 0.072 + 0.017 * math.cos(b), 0.064 + 0.017 * math.cos(b)
            x, y = rx * math.sin(a), -ry * math.cos(a)
            z = 1.462 + 0.014 * math.sin(b) - 0.035 * max(0.0, -y / 0.064) ** 2   # dips at the front
            ring.append(bm.verts.new((x, y + 0.008, z)))
        verts.append(ring)
    for i in range(seg):
        for j in range(minor_seg):
            a, b = verts[i], verts[(i + 1) % seg]
            bm.faces.new((a[j], b[j], b[(j + 1) % minor_seg], a[(j + 1) % minor_seg]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    parts.append(finish("CH_Fulmine_Collar", bm, WHITE, "maglia2"))
    return parts


def emblem(body_ob):
    """Lightning in a circle on the left breast (concept: x 570 px, y 500 px)."""
    origin = Vector((0.075, -0.3, 1.30))
    hit, loc, normal, _ = body_ob.ray_cast(origin, Vector((0, 1, 0)))
    if not hit:
        log("emblem: no hit on the chest")
        return []
    n = Vector(normal).normalized()
    m = frame(loc + n * 0.003, n)
    bm = bmesh.new()
    seg, r0, r1 = 24, 0.028, 0.034
    inner = [bm.verts.new((r0 * math.cos(2 * math.pi * i / seg), r0 * math.sin(2 * math.pi * i / seg), 0)) for i in range(seg)]
    outer = [bm.verts.new((r1 * math.cos(2 * math.pi * i / seg), r1 * math.sin(2 * math.pi * i / seg), 0)) for i in range(seg)]
    for i in range(seg):
        bm.faces.new((inner[i], outer[i], outer[(i + 1) % seg], inner[(i + 1) % seg]))
    bolt = [(-0.004, 0.024), (0.012, 0.024), (0.002, 0.004), (0.012, 0.004), (-0.010, -0.026), (-0.002, -0.004),
            (-0.012, -0.004)]
    bm.faces.new([bm.verts.new((x, y, 0)) for x, y in bolt])
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = finish("CH_Fulmine_Emblem", bm, WHITE, "maglia2", smooth=False)
    for p in ob.data.polygons:   # face the viewer
        if p.normal.dot(n) < 0:
            p.flip()
    return [ob]


def gloves():
    """Big fists (brief, proportion 4: as wide as the head). Local frame: u along the arm,
    nrm out of the palm (toward the thigh), w toward the thumb (forward)."""
    parts = []
    for side, tag in ((1, "L"), (-1, "R")):
        u = Vector((ARM_DIR.x * side, 0, ARM_DIR.z)).normalized()
        nrm = Vector((-math.sin(ARM_DOWN) * side, 0, -math.cos(ARM_DOWN)))
        w = Vector((0, -1, 0))
        wr = Vector((WRIST.x * side, WRIST.y, WRIST.z))

        def at(du, dn, dw):
            return wr + u * du + nrm * dn + w * dw

        rot = Matrix((u, nrm, w)).transposed()   # local x=u, y=nrm, z=w

        def placed(du, dn, dw):
            m = rot.to_4x4()
            m.translation = at(du, dn, dw)
            return m

        parts.append(tube(f"CH_Fulmine_GloveCuff.{tag}", at(-0.015, 0, 0), u, 0.07, 0.047, 0.052, GLOVE, FIXED))
        parts.append(rounded_box(f"CH_Fulmine_GloveFist.{tag}", (0.105, 0.08, 0.112), placed(0.115, 0.004, 0.0),
                                 GLOVE, FIXED, bevel=0.022))
        parts.append(tube(f"CH_Fulmine_GloveFingers.{tag}", at(0.158, 0.02, -0.055), w, 0.11, 0.036, 0.036,
                          GLOVE, FIXED, segments=12, caps=True))
        parts.append(rounded_box(f"CH_Fulmine_GloveThumb.{tag}", (0.07, 0.038, 0.036), placed(0.10, 0.03, 0.06),
                                 GLOVE, FIXED, bevel=0.012))
        parts.append(rounded_box(f"CH_Fulmine_GlovePad.{tag}", (0.07, 0.012, 0.085), placed(0.11, -0.04, 0.0),
                                 GLOVE_PAD, FIXED, bevel=0.004))
        # review 02: the fist was 0.11 m wide against a 0.17 m head; the concept has them equal
        scale_parts(parts[-5:], wr, (GLOVE_SCALE,) * 3)
    return parts


def shoes():
    """Big cleats (brief, proportion 5), black upper, red sole, side stripes and studs."""
    # (y, half width, top z) along the foot, heel to toe; the sole sits under z 0.03
    stations = [(0.075, 0.044, 0.13), (0.045, 0.054, 0.15), (0.0, 0.058, 0.15), (-0.06, 0.060, 0.12),
                (-0.12, 0.062, 0.095), (-0.18, 0.058, 0.08), (-0.225, 0.047, 0.066), (-0.248, 0.028, 0.052)]
    parts = []

    def ring(x0, y, hw, zb, zt, n=16, e=0.55):
        pts = []
        zm, hz = (zb + zt) / 2, (zt - zb) / 2
        for i in range(n):
            a = 2 * math.pi * i / n
            c, s = math.cos(a), math.sin(a)
            pts.append((x0 + hw * math.copysign(abs(c) ** e, c), y, zm + hz * math.copysign(abs(s) ** e, s)))
        return pts

    for side, tag in ((1, "L"), (-1, "R")):
        x0 = FOOT_X * side
        parts.append(loft_sections(f"CH_Fulmine_Shoe.{tag}", [ring(x0, y, hw, 0.026, zt) for y, hw, zt in stations],
                                   WHITE, "scarpe"))
        parts.append(loft_sections(f"CH_Fulmine_Sole.{tag}",
                                   [ring(x0, y, hw + 0.006, 0.012, 0.034, e=0.35) for y, hw, _ in stations],
                                   WHITE, "maglia"))
        for k, (dx, y) in enumerate([(0.03, 0.045), (-0.03, 0.045), (0.032, -0.07), (-0.032, -0.07),
                                     (0.03, -0.17), (-0.03, -0.17)]):
            parts.append(tube(f"CH_Fulmine_Stud{k}.{tag}", (x0 + dx, y, 0.0), (0, 0, 1), 0.014, 0.012, 0.010,
                              WHITE, "maglia", segments=8, caps=True))
        # three slanted stripes on the outside of the upper (concept: red bars on the black shoe)
        for k, y in enumerate((-0.005, -0.045, -0.085)):
            hw = 0.060
            m = (Matrix.Translation((x0 + side * (hw + 0.001), y, 0.075)) @
                 Matrix.Rotation(math.radians(25 * side), 4, "X"))
            parts.append(rounded_box(f"CH_Fulmine_ShoeStripe{k}.{tag}", (0.006, 0.014, 0.075), m, WHITE, "maglia",
                                     bevel=0.002))
        scale_parts([o for o in parts if o.name.endswith("." + tag)], (x0, 0.0, 0.0), SHOE_SCALE)
    return parts


GLOVE_SCALE = 1.55                # review 06: glove 0.68 of the head width, the concept has 1.0
SHOE_SCALE = (1.25, 1.10, 1.30)   # review 02: chunkier cleats, as in the concept
HEAD_SCALE = 1.22                 # review 02: head 0.40 of the shoulder width as in the concept
HEAD_PIVOT = (0.0, 0.01, 1.53)
HEAD_DROP = 0.04                  # review 06: the concept shows no neck between chin and collar
HEAD_C = Vector((0.0, 0.005, 1.668))
HEAD_R = (0.083, 0.098, 0.112)


def head():
    parts = []
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=1.0)
    bmesh.ops.scale(bm, vec=HEAD_R, verts=bm.verts)
    bmesh.ops.translate(bm, vec=HEAD_C, verts=bm.verts)
    for v in bm.verts:            # V jaw, chin forward (concept: chin at x 505, y 470 px)
        if v.co.z < 1.64:
            t = (1.64 - v.co.z) / (1.64 - 1.556)
            v.co.x *= 1.0 - 0.55 * t
            v.co.y -= 0.012 * t
        elif v.co.z < 1.70:
            v.co.x *= 1.0 + 0.04 * math.sin(math.pi * (v.co.z - 1.64) / 0.06)   # cheekbones
    parts.append(finish("CH_Fulmine_Head", bm, SKIN, FIXED))
    for side, tag in ((1, "L"), (-1, "R")):
        parts.append(ellipsoid(f"CH_Fulmine_Ear.{tag}", (0.083 * side, 0.012, 1.655), (0.014, 0.022, 0.032), SKIN,
                               FIXED, u=10, v=8))
        # angry eyes: inner corners low
        tilt = Matrix.Rotation(math.radians(-14 * side), 3, "Y")
        parts.append(ellipsoid(f"CH_Fulmine_Eye.{tag}", (0.034 * side, -0.086, 1.668), (0.018, 0.007, 0.0095),
                               EYE_WHITE, FIXED, u=12, v=8, rot=tilt))
        parts.append(ellipsoid(f"CH_Fulmine_Pupil.{tag}", (0.031 * side, -0.0925, 1.666), (0.006, 0.003, 0.006),
                               PUPIL, FIXED, u=8, v=6))
        brow = Matrix.Translation((0.036 * side, -0.088, 1.690)) @ Matrix.Rotation(math.radians(-22 * side), 4, "Y")
        parts.append(rounded_box(f"CH_Fulmine_Brow.{tag}", (0.046, 0.012, 0.011), brow, HAIR, FIXED, bevel=0.003))
    parts.append(tube("CH_Fulmine_Nose", (0, -0.088, 1.632), (0, -1, -0.35), 0.024, 0.012, 0.002, NOSE, FIXED,
                      segments=8, caps=True))
    parts.append(grin("CH_Fulmine_Mouth", 0.0295, 0.0105, -0.0726, MOUTH))
    parts.append(grin("CH_Fulmine_Teeth", 0.0255, 0.0055, -0.0752, TEETH))
    return parts


def grin(name, half, thick, y, colour):
    """Wide grin, corners up (concept: mouth 70 px wide at y 405 px, teeth showing)."""
    bm = bmesh.new()
    n = 10
    top, bot = [], []
    for i in range(n + 1):
        x = -half + 2 * half * i / n
        zc = 1.592 + 9.0 * x * x                       # corners rise ~8 mm
        t = thick * max(0.0, 1 - (x / half) ** 2) ** 0.5 + 0.0015
        bend = 0.006 * (x / half) ** 2                 # follows the face round
        top.append(bm.verts.new((x + 0.004, y + bend, zc + t * 0.35)))
        bot.append(bm.verts.new((x + 0.004, y + bend, zc - t * 0.65)))
    for i in range(n):
        bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.003)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(name, bm, colour, FIXED)


# front silhouette of the hair, image px (ref/concept_front.webp), clockwise from the left temple
HAIR_PX = [(410, 330), (418, 290), (403, 272), (422, 255), (410, 232), (428, 215), (424, 175), (500, 118),
           (467, 104), (615, 20), (550, 108), (593, 104), (550, 165), (585, 213), (563, 232), (588, 262),
           (567, 282), (590, 305), (578, 330), (560, 300), (530, 292), (505, 322), (482, 293), (450, 300),
           (428, 330)]


def px(x, y):
    return ((x - 505) * 0.001, 1.55 + (470 - y) * 0.001)


HAIR_HI_PX = [(445, 213), (520, 150), (500, 192), (532, 186), (470, 262), (487, 216), (458, 226)]


def crest_y(x, z, y0):
    """Depth of the extruded crest: thinner toward the tip and round in plan (inferred)."""
    fz = 0.8 if z < 1.76 else max(0.15, 0.8 - 0.65 * (z - 1.76) / 0.24)   # review 08: thinner
    fx = math.sqrt(max(0.25, 1.0 - (x / 0.105) ** 2))
    yc = 0.005 + 0.035 * max(0.0, z - 1.76) / 0.24
    return yc + (y0 - 0.005) * fz * fx


def crest_front(x, z):
    return crest_y(x, z, -0.10)


def hair():
    parts = []
    # cap over the back and sides of the skull, open over the face
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0)
    bmesh.ops.scale(bm, vec=(0.091, 0.106, 0.119), verts=bm.verts)
    bmesh.ops.translate(bm, vec=HEAD_C + Vector((0, 0.008, 0.004)), verts=bm.verts)
    drop = [v for v in bm.verts if (v.co.y < -0.035 and v.co.z < 1.735) or v.co.z < 1.60
            or (abs(v.co.x) > 0.055 and v.co.z < 1.64 and v.co.y < 0.03)]
    bmesh.ops.delete(bm, geom=drop, context="VERTS")
    parts.append(finish("CH_Fulmine_HairCap", bm, HAIR, FIXED))

    # the crest: the front silhouette extruded through the head, thinned toward the tip
    bm = bmesh.new()
    front = [bm.verts.new((px(x, y)[0], -0.10, px(x, y)[1])) for x, y in HAIR_PX]
    face = bm.faces.new(front)
    res = bmesh.ops.extrude_face_region(bm, geom=[face])
    back = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0.21, 0), verts=back)
    for v in bm.verts:
        v.co.y = crest_y(v.co.x, v.co.z, v.co.y)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    crest = finish("CH_Fulmine_HairCrest", bm, HAIR, FIXED, smooth=False)
    parts.append(crest)
    # blue-violet streak on the front of the crest (concept: x 445-530, y 150-262 px)
    bm = bmesh.new()
    pts = []
    for x, y in HAIR_HI_PX:
        hx, hz = px(x, y)
        pts.append(bm.verts.new((hx, crest_front(hx, hz) - 0.003, hz)))
    bm.faces.new(pts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    hi = finish("CH_Fulmine_HairStreak", bm, HAIR_HI, FIXED, smooth=False)
    for p in hi.data.polygons:
        if p.normal.y > 0:
            p.flip()
    parts.append(hi)
    # spikes at the back (inferred: the concept shows only the front)
    for k, (az, el) in enumerate([(150, 10), (180, 25), (210, 10), (165, -15), (195, -15), (180, -35)]):
        a, e = math.radians(az), math.radians(el)
        d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
        base = HEAD_C + Vector((d.x * 0.08, d.y * 0.095, d.z * 0.10 + 0.03))
        parts.append(tube(f"CH_Fulmine_HairSpike{k}", base, d + Vector((0, 0, 0.25)), 0.07, 0.03, 0.0, HAIR, FIXED,
                          segments=6, caps=True))
    return parts


def build(scene, args):
    global MATS
    MATS = materials()
    b = body()
    heads = head() + hair()
    scale_parts(heads, HEAD_PIVOT, (HEAD_SCALE,) * 3)
    for ob in heads:
        for vtx in ob.data.vertices:
            vtx.co.z -= HEAD_DROP
        ob.data.update()
    parts = [b] + clothes(b) + emblem(b) + gloves() + shoes() + heads
    tris = 0
    for ob in parts:
        ob.data.calc_loop_triangles()
        tris += len(ob.data.loop_triangles)
    zmin = min((ob.matrix_world @ v.co).z for ob in parts for v in ob.data.vertices)
    zmax = max((ob.matrix_world @ v.co).z for ob in parts for v in ob.data.vertices)
    log(f"{len(parts)} objects, {tris} triangles, z {zmin:.3f} .. {zmax:.3f}")


MATS = {}

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--master", required=True)
    a = p.parse_args(argv_after_dashes())
    scene = open_master(a.master)
    clear_owned()
    build(scene, a)
    save_master(a.master)
    log("saved", a.master)
