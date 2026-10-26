"""CH_Fulmine HD, phase 18: the game-level mesh as FBX for Mixamo's automatic rig.

  blender --background <exports>/game/CH_Fulmine_game_delivery.blend --python build_hd/18_mixamo.py -- --out <file.fbx>

Mixamo takes FBX, OBJ or ZIP uploads (https://www.mixamo.com), not GLB: the mesh of the game
delivery, without its armature, in the A pose, Y up and facing +Z as Mixamo expects.
"""
import sys

import bpy

out = sys.argv[sys.argv.index("--out") + 1]
body = bpy.data.objects["CH_Fulmine_Body_LOD0"]
body.parent = None
for m in list(body.modifiers):
    body.modifiers.remove(m)
for g in list(body.vertex_groups):
    body.vertex_groups.remove(g)
for o in bpy.context.view_layer.objects:
    o.select_set(o is body)
bpy.context.view_layer.objects.active = body
bpy.ops.export_scene.fbx(filepath=out, use_selection=True, object_types={"MESH"}, axis_forward="-Z", axis_up="Y",
                         add_leaf_bones=False, bake_anim=False, path_mode="COPY")
print("exported", out)
