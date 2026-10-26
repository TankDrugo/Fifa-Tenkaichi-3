"""CH_Fulmine HD, phase 15: the leg stretch of dims.py on every finished part.

  blender --background --python build_hd/15_stretch.py -- --master <dir>/CH_Fulmine_HD.blend

Run after phases 10-14 (each rebuilds its parts unstretched) and before 16_rig.py. Parts carry
a 'stretched' flag so a second run does not stretch them twice.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hd  # noqa: E402
import bpy  # noqa: E402
from dims import stretch_z, STRETCH_ADD  # noqa: E402

hd.PHASE = "15_stretch"


def main():
    a = hd.args()
    hd.open_master(a["master"])
    n = 0
    for o in bpy.data.objects:
        if o.type != "MESH" or not str(o.get("owner", "")).startswith("phase:1") or o.get("stretched"):
            continue
        if o.get("owner") in ("phase:15_stretch", "phase:16_rig"):
            continue
        p = hd.co(o)
        p[:, 2] = stretch_z(p[:, 2])
        hd.set_co(o, p)
        o["stretched"] = STRETCH_ADD
        n += 1
    hd.log(f"{n} parts stretched by {STRETCH_ADD} m")
    hd.save_master(a["master"])


main()
