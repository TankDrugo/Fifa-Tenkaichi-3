"""CH_Fulmine, phase 09: delivery copy without the review pose, clips from frame 0, then the skill's exporter.

  blender --background --python build/09_export.py -- --master <master.blend> --out <dir>

Removes the action ref_crouch (a gate pose, not a game clip) from a copy of the master and runs
export_delivery.py on that copy: GLB with the armature, the joined mesh and every other action.
"""
import os
import subprocess
import sys

import bpy

a = sys.argv[sys.argv.index("--") + 1:]
master, out = a[a.index("--master") + 1], a[a.index("--out") + 1]
bpy.ops.wm.open_mainfile(filepath=os.path.abspath(master))
for name in ("ref_crouch",):
    act = bpy.data.actions.get(name)
    if act:
        bpy.data.actions.remove(act)
arm = bpy.data.objects["CH_Fulmine_Armature"]
for tr in list(arm.animation_data.nla_tracks):
    if tr.name == "ref_crouch":
        arm.animation_data.nla_tracks.remove(tr)
# clips start at frame 1 in the master; the game wants t = 0 on the first key, or a loop holds
# its first pose for one frame
for act in bpy.data.actions:
    for fc in act.fcurves:
        for kp in fc.keyframe_points:
            kp.co.x -= 1
            kp.handle_left.x -= 1
            kp.handle_right.x -= 1
    for m in act.pose_markers:
        m.frame -= 1
    s, e = act.frame_range
    act.frame_range = (s - 1, e - 1)
for tr in arm.animation_data.nla_tracks:
    for st in tr.strips:
        st.frame_start_ui -= 1
delivery = os.path.join(os.path.dirname(os.path.abspath(master)), "CH_Fulmine_delivery.blend")
bpy.ops.wm.save_as_mainfile(filepath=delivery)
skill = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".claude", "skills", "blender-image-to-3d", "scripts")
cmd = [bpy.app.binary_path, "--background", "--python", os.path.abspath(os.path.join(skill, "export_delivery.py")),
       "--", "--blend", delivery, "--out", out, "--name", "CH_Fulmine", "--format", "GLB", "--collections", "LOW",
       "--engine", "three.js 0.186.1",
       "--inferred", "back and sides of the head and hair, crest depth, soles, palms of the gloves, standing proportions"]
sys.exit(subprocess.call(cmd))
