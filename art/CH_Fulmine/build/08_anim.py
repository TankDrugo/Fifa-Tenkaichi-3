"""CH_Fulmine, phase 08: actions on the Mixamo-named skeleton, posed from world-space targets.

  blender --background --python build/08_anim.py -- --master <dir>/CH_Fulmine_master.blend

Actions (in place, 30 fps):
  ref_crouch  1 frame, the pose of ref/concept_front.webp, for the silhouette gate
  idle        frames 1-61, loop: breathing in a ready stance
  run         frames 1-21, loop: one full stride (left and right step) in 20 frames; the game
              drives it by the stride phase of the simulation, so its length in seconds is free
  kick        frames 1-19: right-foot shot, contact at frame 9 (pose marker 'contact')
Poses are built by aiming bones at points and rotating them about world axes, then keyed as
quaternions; legs and arms reach their targets through a two-bone solver.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bt  # noqa: E402
from bt import log, open_master, save_master, argv_after_dashes  # noqa: E402

import bpy  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402

bt.PHASE = "08_anim"
P = "mixamorig:"
FPS = 30


def upd():
    bpy.context.view_layer.update()


def pb(arm, name):
    return arm.pose.bones[P + name]


def reset(arm):
    for b in arm.pose.bones:
        b.rotation_mode = "QUATERNION"
        b.rotation_quaternion = (1, 0, 0, 0)
        b.location = (0, 0, 0)
        b.scale = (1, 1, 1)
    upd()


def head_of(b):
    return b.matrix.to_translation()


def tail_of(b):
    return b.matrix @ Vector((0, b.length, 0))


def rotate_world(b, q, pivot=None):
    upd()
    m = b.matrix.copy()
    c = pivot if pivot is not None else m.to_translation()
    b.matrix = Matrix.Translation(c) @ q.to_matrix().to_4x4() @ Matrix.Translation(-c) @ m
    upd()


def turn(b, axis, deg):
    rotate_world(b, Matrix.Rotation(math.radians(deg), 3, Vector(axis)).to_quaternion())


def aim(b, target):
    upd()
    cur = (tail_of(b) - head_of(b)).normalized()
    want = (Vector(target) - head_of(b)).normalized()
    rotate_world(b, cur.rotation_difference(want))


def move(b, delta):
    upd()
    m = b.matrix.copy()
    m.translation = m.translation + Vector(delta)
    b.matrix = m
    upd()


def two_bone(upper, lower, target, pole):
    """Aim upper and lower so lower's tail reaches target, bending toward pole."""
    upd()
    root = head_of(upper)
    l1, l2 = upper.length, lower.length
    t = Vector(target)
    d = min((t - root).length, (l1 + l2) * 0.999)
    n = (t - root).normalized()
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = math.sqrt(max(0.0, l1 * l1 - a * a))
    bend = Vector(pole) - root
    bend = (bend - n * bend.dot(n)).normalized()
    joint = root + n * a + bend * h
    aim(upper, joint)
    aim(lower, root + n * d)


def foot_flat(arm, side, pitch_deg=0.0, yaw_deg=0.0):
    """Point the foot along its rest direction, pitched (toes down +) and turned out."""
    foot = pb(arm, side + "Foot")
    rest = foot.bone.tail_local - foot.bone.head_local
    r = Matrix.Rotation(math.radians(yaw_deg), 3, "Z") @ Matrix.Rotation(math.radians(-pitch_deg), 3, "X")
    aim(foot, head_of(foot) + r @ rest)


def key(arm, frame):
    for b in arm.pose.bones:
        b.keyframe_insert("rotation_quaternion", frame=frame)
        if b.name == P + "Hips":
            b.keyframe_insert("location", frame=frame)


def new_action(arm, name):
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    return act


def finish_action(arm, act, first, last, cyclic):
    act.frame_range = (first, last)
    act.use_frame_range = True
    act.use_cyclic = cyclic
    fcurves = act.fcurves if hasattr(act, "fcurves") else []
    for fc in fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
        if cyclic:
            fc.modifiers.new("CYCLES")
    arm.animation_data.action = None
    # every action gets its own NLA track so the glTF exporter writes them all
    tr = arm.animation_data.nla_tracks.new()
    tr.name = act.name
    tr.strips.new(act.name, first, act).mute = False
    tr.mute = True


def arms_down(arm, down_deg=38.0):
    """From the A pose (40 degrees below horizontal) toward the sides."""
    turn(pb(arm, "LeftArm"), (0, 1, 0), down_deg)
    turn(pb(arm, "RightArm"), (0, 1, 0), -down_deg)


# --- poses --------------------------------------------------------------------------------------

def pose_ref_crouch(arm):
    """ref/concept_front.webp: knees bent wide over the feet, chest forward, fists hanging outside
    the knees, head up toward the viewer. Measured on the concept (px of 1472): feet centres 635 px
    apart = 1.3 shoulder widths; wrists at 0.63 of the height from the top, outside the knees."""
    reset(arm)
    hips = pb(arm, "Hips")
    move(hips, (0, 0.03, -RC["drop"]))
    turn(hips, (1, 0, 0), RC["hips"])
    for n in ("Spine", "Spine1", "Spine2"):
        turn(pb(arm, n), (1, 0, 0), RC["spine"])
    turn(pb(arm, "Neck"), (1, 0, 0), -RC["neck"])
    turn(pb(arm, "Head"), (1, 0, 0), -RC["head"])
    for side, s in ((1, "Left"), (-1, "Right")):
        two_bone(pb(arm, s + "UpLeg"), pb(arm, s + "Leg"), (RC["feet"] * side, -0.02, 0.15),
                 (1.4 * side, -1.0, 0.2))           # knees out and forward over the feet (concept)
        foot_flat(arm, s, 0, 40 * side)       # toes out: the concept shows the shoes at an angle
        two_bone(pb(arm, s + "Arm"), pb(arm, s + "ForeArm"), (RC["wx"] * side, RC["wy"], RC["wz"]),
                 (0.9 * side, 0.6, 1.4))
        turn(pb(arm, s + "Hand"), (0, 1, 0), 30 * side)


RC = {"drop": 0.13, "hips": 10, "spine": 10, "neck": 2, "head": 14, "feet": 0.34,
      "wx": 0.48, "wy": -0.26, "wz": 0.62}


def pose_stance(arm, crouch=0.035):
    reset(arm)
    move(pb(arm, "Hips"), (0, 0, -crouch))
    arms_down(arm)
    for side, s in ((1, "Left"), (-1, "Right")):
        two_bone(pb(arm, s + "UpLeg"), pb(arm, s + "Leg"), (0.12 * side, 0.0, 0.112), (0.1 * side, -1, 0.5))
        foot_flat(arm, s, 0, 8 * side)
        turn(pb(arm, s + "ForeArm"), (1, 0, 0), -12)


def make_idle(arm):
    act = new_action(arm, "idle")
    n = 60
    for f in range(0, n + 1, 6):
        ph = 2 * math.pi * f / n
        pose_stance(arm, 0.035 + 0.006 * (1 - math.cos(ph)) / 2)
        turn(pb(arm, "Spine2"), (1, 0, 0), -1.8 * math.sin(ph))
        turn(pb(arm, "Head"), (0, 0, 1), 4 * math.sin(ph / 1))
        for side, s in ((1, "Left"), (-1, "Right")):
            turn(pb(arm, s + "Arm"), (0, 1, 0), 2.0 * side * math.sin(ph))
        key(arm, f + 1)
    finish_action(arm, act, 1, n + 1, True)


def leg_target(s, side):
    """Ankle target at stride phase s (0 = this foot lands in front)."""
    stride, lift = 0.27, 0.30
    if s < 0.38:                                   # stance: foot slides back under the body
        t = s / 0.38
        return Vector((0.10 * side, -stride + 2 * stride * t, 0.112)), -5 + 10 * t
    t = (s - 0.38) / 0.62                          # swing: heel up behind, knee forward
    y = stride - 2 * stride * (0.5 - 0.5 * math.cos(math.pi * t))
    z = 0.112 + lift * math.sin(math.pi * min(1.0, t * 1.25)) ** 1.2 * (1.0 if t < 0.8 else (1 - t) / 0.2)
    return Vector((0.10 * side, y, z)), 35 * math.sin(math.pi * t)


def make_run(arm):
    act = new_action(arm, "run")
    n = 20
    for f in range(0, n + 1, 2):
        ph = f / n
        reset(arm)
        hips = pb(arm, "Hips")
        move(hips, (0, 0, -0.07 + 0.025 * math.cos(4 * math.pi * ph)))
        turn(hips, (0, 0, 1), 8 * math.cos(2 * math.pi * ph))
        turn(hips, (1, 0, 0), 6)
        for nme in ("Spine1", "Spine2"):
            turn(pb(arm, nme), (1, 0, 0), 5)
            turn(pb(arm, nme), (0, 0, 1), -6 * math.cos(2 * math.pi * ph))
        turn(pb(arm, "Head"), (1, 0, 0), -10)
        arms_down(arm, 30)
        for side, s, off in ((1, "Left", 0.0), (-1, "Right", 0.5)):
            target, pitch = leg_target((ph + off) % 1.0, side)
            hip = head_of(pb(arm, s + "UpLeg"))
            rest_hip = pb(arm, s + "UpLeg").bone.head_local.z      # 0.86, or more with longer legs
            two_bone(pb(arm, s + "UpLeg"), pb(arm, s + "Leg"), hip + (target - Vector((0.10 * side, 0, rest_hip))),
                     hip + Vector((0, -1.0, -0.2)))
            foot_flat(arm, s, pitch, 0)
            # arms swing against the leg on their side
            swing = 38 * math.cos(2 * math.pi * (ph + off))
            turn(pb(arm, s + "Arm"), (1, 0, 0), swing)
            turn(pb(arm, s + "ForeArm"), (1, 0, 0), -75)
        key(arm, f + 1)
    finish_action(arm, act, 1, n + 1, True)


def make_kick(arm):
    act = new_action(arm, "kick")
    keys = [  # frame, right thigh swing (deg, + back), knee bend, body lean back, left arm out
        (1, 0, 10, 0, 0), (5, 45, 95, -4, 25), (9, -55, 10, 12, 45), (13, -70, 5, 15, 40), (19, 0, 10, 0, 0)]
    for f, thigh, knee, lean, arm_out in keys:
        pose_stance(arm, 0.05)
        turn(pb(arm, "Spine1"), (1, 0, 0), -lean)
        turn(pb(arm, "RightUpLeg"), (1, 0, 0), thigh)
        turn(pb(arm, "RightLeg"), (1, 0, 0), knee)
        foot_flat(arm, "Right", 40 if f in (9, 13) else 0, 0)
        turn(pb(arm, "LeftArm"), (0, 1, 0), -arm_out)
        turn(pb(arm, "RightArm"), (1, 0, 0), thigh * 0.4)
        key(arm, f)
    m = act.pose_markers.new("contact")
    m.frame = 9
    finish_action(arm, act, 1, 19, False)


def make_ref(arm):
    act = new_action(arm, "ref_crouch")
    pose_ref_crouch(arm)
    key(arm, 1)
    finish_action(arm, act, 1, 1, False)


def main():
    a = sys.argv[sys.argv.index("--") + 1:]
    master = a[a.index("--master") + 1]
    scene = open_master(master)
    scene.render.fps = FPS
    arm = bpy.data.objects["CH_Fulmine_Armature"]
    arm.animation_data_create()
    for tr in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(tr)
    make_ref(arm)
    make_idle(arm)
    make_run(arm)
    make_kick(arm)
    reset(arm)
    log("actions", [x.name for x in bpy.data.actions])
    save_master(master)
    log("saved", master)


if __name__ == "__main__":
    main()
