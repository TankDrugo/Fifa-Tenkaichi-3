"""CH_Fulmine HD, phase 10: the body as one organic volume.

  blender --background --python build_hd/10_body.py -- --master <dir>/CH_Fulmine_HD.blend

Metaball masses for the anatomy (pelvis, ribcage, pecs, trapezius, deltoids, biceps, forearm
bellies, knees, calves), fused, voxel remeshed to an even 3 mm grid and shaped with brushes:
collarbones, sternum line, elbow and wrist bones, kneecaps, shin edge. The concept shows a lean,
sinewy teenager (ref/concept_front.webp: forearms, knees and calves drawn with bone lines).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hd  # noqa: E402
from dims import ARM_DIR, SHOULDER, ELBOW, WRIST, HIP, KNEE, ANKLE, NECK_BASE, SHIRT_HEM_Z, SHORTS_HEM_Z, mx, arm_dir  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

hd.PHASE = "10_body"


def elements():
    E = []
    cap, ell = hd.capsule_between, hd.ellipsoid_along
    # torso, measured on the standing proportions of dims.py
    E.append(dict(co=(0, 0.006, 0.935), size=(0.118, 0.088, 0.085)))                 # pelvis
    E.append(dict(co=(0, -0.004, 1.06), size=(0.108, 0.080, 0.105)))                  # abdomen
    E.append(dict(co=(0, 0.004, 1.235), size=(0.130, 0.090, 0.150)))                  # ribcage
    E.append(dict(co=(0, 0.02, 1.40), size=(0.120, 0.060, 0.050)))                    # upper back
    for s in (1, -1):
        E.append(dict(co=(0.055 * s, 0.04, 0.885), size=(0.06, 0.05, 0.07)))         # glutes
        E.append(dict(co=(0.064 * s, -0.05, 1.32), size=(0.078, 0.022, 0.045)))     # pecs, flat
        E.append(dict(co=(0.085 * s, 0.035, 1.25), size=(0.060, 0.050, 0.110)))     # lats
        E.append(ell((0.02 * s, 0.025, 1.49), (0.15 * s, 0.01, 1.445), 0.032, 0.036))  # trapezius
        E.append(cap((0.02 * s, -0.035, 1.435), (0.14 * s, -0.02, 1.445), 0.014))   # collarbone
        sh, el, wr, d = mx(SHOULDER, s), mx(ELBOW, s), mx(WRIST, s), arm_dir(s)
        E.append(dict(type="BALL", co=tuple(sh + Vector((0, 0, 0.005))), size=(0.056, 0, 0)))  # shoulder
        E.append(ell(sh - d * 0.02 + Vector((0, 0, 0.012)), sh + d * 0.13, 0.052, 0.056))     # deltoid
        E.append(cap(sh, el, 0.034))                                                       # humerus
        E.append(ell(sh + d * 0.10 + Vector((0, -0.012, 0)), el - d * 0.04, 0.036, 0.033))  # biceps
        E.append(ell(sh + d * 0.08 + Vector((0, 0.016, 0)), el - d * 0.02, 0.036, 0.034))   # triceps
        E.append(dict(type="BALL", co=tuple(el + Vector((0, 0.008, 0))), size=(0.031, 0, 0)))  # elbow
        E.append(ell(el + d * 0.02, el + d * 0.17, 0.041, 0.035))                          # forearm belly
        E.append(cap(el, wr, 0.027))                                                       # forearm
        E.append(dict(co=tuple(wr), size=(0.03, 0.022, 0.03)))                             # wrist
        E.append(cap(wr, wr + d * 0.07, 0.03))                                             # hand (in the glove)
        hp, kn, an = mx(HIP, s), mx(KNEE, s), mx(ANKLE, s)
        mid = hp + (kn - hp) * 0.45
        E.append(ell(hp + Vector((0, 0, 0.03)), mid, 0.068, 0.07))                       # upper thigh
        E.append(ell(mid + Vector((0, 0, 0.05)), kn + Vector((0, 0, 0.02)), 0.05, 0.052))  # lower thigh
        E.append(cap(hp, kn, 0.044))                                                       # femur
        E.append(dict(type="BALL", co=tuple(kn), size=(0.043, 0, 0)))                      # knee
        E.append(dict(co=tuple(kn + Vector((0, -0.036, 0.008))), size=(0.028, 0.02, 0.034)))  # kneecap
        E.append(dict(co=tuple(kn + Vector((0, 0.022, -0.14))), size=(0.05, 0.052, 0.11)))  # calf
        E.append(cap(kn, an, 0.036))                                                       # shin
        E.append(dict(type="BALL", co=tuple(an), size=(0.034, 0, 0)))                      # ankle
        E.append(cap(an, an + Vector((0.004 * s, -0.17, -0.07)), 0.034))                   # foot (in the boot)
    E.append(cap(NECK_BASE + Vector((0, 0, -0.03)), (0, 0.004, 1.585), 0.052))             # neck
    return E


def sculpt(ob):
    hd.laplacian(ob, iterations=8, factor=0.5)
    # collarbones and the notch between them
    for s in (1, -1):
        hd.line_brush(ob, (0.025 * s, -0.06, 1.44), (0.14 * s, -0.035, 1.452), 0.012, 0.004)
        # sternocleidomastoid: from behind the ear to the notch
        hd.line_brush(ob, (0.045 * s, 0.03, 1.56), (0.012 * s, -0.04, 1.452), 0.012, 0.004)
        el, wr, d = mx(ELBOW, s), mx(WRIST, s), arm_dir(s)
        hd.push(ob, el + Vector((0, 0.03, 0)), 0.018, 0.005)               # olecranon, the elbow point
        hd.push(ob, wr + Vector((0.012 * s, 0.0, 0.012)), 0.012, 0.003)    # ulna head at the wrist
        hd.line_brush(ob, el + d * 0.05 + Vector((0, -0.03, 0)), wr - d * 0.04 + Vector((0, -0.022, 0)), 0.01, -0.002)
        kn, an = mx(KNEE, s), mx(ANKLE, s)
        hd.push(ob, kn + Vector((0, -0.05, 0.01)), 0.025, 0.004)            # kneecap edge
        hd.push(ob, kn + Vector((0.035 * s, -0.02, -0.03)), 0.02, -0.003)   # dent beside the knee
        hd.line_brush(ob, kn + Vector((0, -0.045, -0.05)), an + Vector((0, -0.035, 0.08)), 0.012, 0.003)  # shin edge
    # sternum groove and the ribcage's lower edge, faint under the shirt
    hd.line_brush(ob, (0, -0.095, 1.38), (0, -0.09, 1.20), 0.015, -0.003)
    hd.laplacian(ob, iterations=2, factor=0.4)


def under_clothes(ob):
    """Pull the skin 1.4 cm in where the shirt and the shorts cover it, so no pose shows it
    through them (review 11: the back and the glutes came through). The collar's opening keeps
    its skin."""
    p = hd.co(ob)
    n = hd.normals(ob)
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    sh = np.array(SHOULDER)
    d = np.array(ARM_DIR)
    ax = np.abs(x)
    t = (np.stack([ax, y, z], 1) - sh) @ d
    arm = ax > 0.17
    shirt = (~arm & (z > SHIRT_HEM_Z - 0.02) & (z < 1.43)) | (arm & (t < 0.20) & (z > 1.2))
    shirt &= ~((ax < 0.085) & (y < 0) & (z > 1.36))
    shorts = (z > SHORTS_HEM_Z + 0.03) & (z <= SHIRT_HEM_Z) & (ax < 0.24)
    w = (shirt | shorts).astype(float)
    p -= n * (0.014 * w)[:, None]
    hd.set_co(ob, p)
    hd.laplacian(ob, iterations=3, factor=0.5)


def main():
    a = hd.args()
    hd.open_master(a["master"])
    hd.clear_owned()
    body = hd.metaball_mesh("CH_Fulmine_Body", elements(), resolution=0.005)
    hd.remesh(body, 0.003)
    sculpt(body)
    under_clothes(body)
    hd.smooth_shade(body)
    hd.paint(body, "pelle")
    zs = hd.co(body)[:, 2]
    hd.log(f"body: {len(body.data.vertices)} vertices, {hd.tris(body)} triangles, z {zs.min():.3f}..{zs.max():.3f}")
    hd.save_master(a["master"])


main()
