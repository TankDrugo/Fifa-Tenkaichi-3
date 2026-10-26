"""Measurements of CH_Fulmine shared by the build_hd phases (metres, Z up, facing -Y).

Standing proportions are inferred from asset-brief.md (the concept is a crouch in perspective)
and from the gates of build/ (review 02-06: head 0.40 of the shoulder width, shoulders right
under the chin, gloves as wide as the head, chunky cleats).
"""
import math
from mathutils import Vector

ARM_DOWN = math.radians(40)                          # A pose
ARM_DIR = Vector((math.cos(ARM_DOWN), 0.0, -math.sin(ARM_DOWN)))
SHOULDER = Vector((0.17, 0.0, 1.44))
UPPER_ARM, FOREARM = 0.33, 0.30
ELBOW = SHOULDER + ARM_DIR * UPPER_ARM + Vector((0, 0.012, 0))
WRIST = ELBOW + ARM_DIR * FOREARM + Vector((0, -0.017, 0))
HIP = Vector((0.095, 0.0, 0.86))
KNEE = Vector((0.105, -0.012, 0.50))
ANKLE = Vector((0.105, 0.012, 0.105))
NECK_BASE = Vector((0.0, 0.012, 1.45))
HEAD_C = Vector((0.0, 0.006, 1.645))                # centre of the skull ellipsoid
HEAD_R = Vector((0.098, 0.118, 0.135))              # half width, depth, height of the skull
CHIN_Z = 1.505
FOOT_X = 0.115
SHIRT_HEM_Z = 0.965
SHORTS_HEM_Z = 0.635
SOCK_TOP_Z = 0.445


def mx(p, side):
    """Mirror a left-side point (+X) to the side (+1 left, -1 right)."""
    return Vector((p.x * side, p.y, p.z))


def arm_dir(side):
    return Vector((ARM_DIR.x * side, ARM_DIR.y, ARM_DIR.z))


# Review 16: in the concept the legs from the shorts' hem to the soles are 0.43 of the crouched
# figure, in the model 0.29; the legs grow 10 cm between the ankle and the hip, everything above
# moves up. Applied to the finished meshes (15_stretch.py) and to the bones (16_rig.py).
STRETCH_FROM, STRETCH_TO, STRETCH_ADD = 0.16, 0.86, 0.10


def stretch_z(z):
    """Vertical map of the leg stretch; works on floats and numpy arrays."""
    k = STRETCH_ADD / (STRETCH_TO - STRETCH_FROM)
    import numpy as np
    z = np.asarray(z, dtype=float)
    out = np.where(z < STRETCH_FROM, z, np.where(z > STRETCH_TO, z + STRETCH_ADD, z + (z - STRETCH_FROM) * k))
    return float(out) if out.ndim == 0 else out
