"""Local adapter for the installed Blender MCP: structured results and visual review.

Usage (inside execute_blender_code; import this module in each fresh namespace):
  result = mcp_bridge.run("blender-asset-qa", "qa_check", objects=["Chair"])
  result = mcp_bridge.review(objects=["Chair"], mode="wire", frames=[1, 10])
Review renders Workbench contact sheets; it does not evaluate PBR shader appearance.
"""
import importlib.util
import os
from pathlib import Path
import re
import sys
import tempfile

import bpy

SKILLS = Path(__file__).resolve().parents[2]


def _module(skill, script, reload=False):
    if not re.fullmatch(r"blender-[a-z0-9-]+", skill):
        raise ValueError("expected an installed blender-* skill name")
    if not re.fullmatch(r"[a-zA-Z_][a-zA-Z_0-9]*", script):
        raise ValueError("expected a Python script stem, without path or .py")
    path = SKILLS / skill / "scripts" / (script + ".py")
    if not path.is_file():
        raise FileNotFoundError(path)
    name = "_local_blender_skills_" + skill.replace("-", "_") + "_" + script
    if reload or name not in sys.modules:
        spec = importlib.util.spec_from_file_location(name, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sys.modules[name] = module
    return sys.modules[name]


def run(skill, script, reload=False, **kwargs):
    """Call an installed script's run(), returning the dict expected by this MCP."""
    result = _module(skill, script, reload=reload).run(**kwargs)
    if not isinstance(result, dict):
        raise TypeError("skill run() must return a dict")
    return result


def review(objects, *, mode="solid", frames=None, views=None, res=512, out=None):
    """Render explicit mesh targets at selected frames, restoring live scene state.

    Saves new PNGs only; does not save the .blend. Preserves the frame, mode,
    selection, per-object colors and image output settings in addition to the
    engine/camera/visibility restored by upstream review_shots.
    """
    if not objects or isinstance(objects, str):
        raise ValueError("pass an explicit list of object names to review")
    sc = bpy.context.scene
    frames = [sc.frame_current] if frames is None else list(frames)
    if not frames or any(type(f) is not int for f in frames):
        raise ValueError("frames must be a nonempty list of integers")
    shots = _module("blender-asset-qa", "review_shots")
    if mode not in {"solid", "random", "wire", "material"}:
        raise ValueError("mode must be solid, random, wire, or material")
    if views is not None and (not views or any(v not in shots.DIRS for v in views)):
        raise ValueError("views must be names from review_shots.DIRS")
    if out is None:
        out = str(Path(tempfile.mkdtemp(prefix="blender_skill_review_")) / "review.png")
    else:
        out = bpy.path.abspath(os.fspath(out))
    stem = Path(out).with_suffix("")
    view_layer = bpy.context.view_layer
    active = view_layer.objects.active
    selected = [o for o in view_layer.objects if o.select_get()]
    old_mode = active.mode if active else "OBJECT"
    frame, subframe = sc.frame_current, sc.frame_subframe
    colors = [(o, tuple(o.color)) for o in sc.objects]
    image_settings = sc.render.image_settings
    image_state = {name: getattr(image_settings, name) for name in
                   ("media_type", "file_format", "color_mode", "color_depth", "compression", "quality")}
    reports = []
    try:
        for f in frames:
            sc.frame_set(f)
            target = str(stem) + (f"_frame_{f:06d}" if len(frames) > 1 else "") + ".png"
            report = shots.run(objects=list(objects), out=target, mode=mode, views=views, res=res)
            reports.append({"frame": f, **report})
    finally:
        sc.frame_set(frame, subframe=subframe)
        image_settings.media_type = image_state["media_type"]
        image_settings.file_format = image_state["file_format"]
        for name in ("color_mode", "color_depth", "compression", "quality"):
            setattr(image_settings, name, image_state[name])
        for ob, color in colors:
            ob.color = color
        current = view_layer.objects.active
        if current and current.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        for ob in view_layer.objects:
            ob.select_set(False)
        for ob in selected:
            ob.select_set(True)
        view_layer.objects.active = active
        if active and old_mode != "OBJECT":
            bpy.ops.object.mode_set(mode=old_mode)
    return {"ok": True, "mode": mode, "reviews": reports,
            "note": "Workbench geometry/color review. Inspect PNGs; use material-preview screenshots or final renders for PBR."}
