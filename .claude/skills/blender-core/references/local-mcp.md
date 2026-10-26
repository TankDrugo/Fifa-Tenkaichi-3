# Local Blender MCP adapter

This adapter targets the `mcp__blender__*` tool set whose code executor returns
a dict named `result`. Check the connected server's tool schema first: other
Blender MCP implementations may expose different tools or return conventions.
No MCP server or add-on replacement is needed for this mapping.

Replace `<skills_dir>` in examples with the absolute directory containing the
installed `blender-*` folders (for example `~/.agents/skills`, `~/.codex/skills`,
or a project's `.agents/skills`, with `~` expanded). The bridge locates sibling
skills relative to its own file; it has no machine-specific paths.

## Inspect and execute

Call `mcp__blender__get_blendfile_summary_datablocks({})` and
`mcp__blender__get_objects_summary({})` before editing the live scene.
For one object use `mcp__blender__get_object_detail_summary({"name":"Chair"})`.
Prefer those dedicated tools for inspection. Use `execute_blender_code` for
the skill scripts or operations that have no suitable dedicated tool.

This server executes each request in a fresh namespace and requires a
JSON-serializable **dict named `result`**. A print-only call is insufficient.
Modules remain cached, so import on each request and pass `reload=True` to
the bridge only after changing an installed script.

Send this Python as the `code` argument of `mcp__blender__execute_blender_code`:

```python
import sys
p = "<skills_dir>/blender-core/scripts"
if p not in sys.path:
    sys.path.insert(0, p)
import mcp_bridge as bridge
result = bridge.run("blender-core", "env_report")
```

Use the same import preamble in subsequent calls, e.g.:

```python
result = bridge.run("blender-asset-qa", "qa_check", objects=["Chair"], profile="game")
```

Existing script docstrings may show `print(module.run(...))`. For this server,
assign `result = module.run(...)`, or use `bridge.run(...)` as above. Check both
the tool's outer `status` and the returned result's `ok` / QA `pass` fields;
an execution error can appear in structured content even without `isError`.

## Visual review

This MCP does not expose the upstream `look`, `search_assets`, `import_asset`,
`generate_3d`, or `world_bounding_box` tools. Use the following available paths.

| Need | Available operation |
|---|---|
| Current 3D view screenshot | `mcp__blender__get_screenshot_of_area_as_image({"area_ui_type":"VIEW_3D","size_limit_in_bytes":100000})` |
| Whole Blender window | `mcp__blender__get_screenshot_of_window_as_image({"size_limit_in_bytes":100000})` |
| Current viewport render to disk | `mcp__blender__render_viewport_to_path({"output_path":"/absolute/review.png"})` |
| Focus an object, when useful | `mcp__blender__jump_to_view3d_object_by_name({"name":"Chair","allow_edits":false})` |
| Multi-angle geometry or wireframe review | `bridge.review(...)` below, then open the returned PNGs |
| Multi-frame deformation review | `bridge.review(..., frames=[...])` below, then open every returned sheet |

```python
# Use the same import preamble as above in each execute_blender_code call.
result = bridge.review(objects=["Chair"], mode="solid", res=512)
# Separate call for topology:
result = bridge.review(objects=["Chair"], mode="wire", res=512)
# Rig / animation review: pass the skinned mesh names, not just the armature.
result = bridge.review(objects=["Body"], mode="solid", frames=[1, 10, 20, 30])
```

Keep screenshot responses bounded. If a full-size response produces an
unterminated-JSON transport error, try a 100000-byte limit as shown above.
For higher-detail inspection, render to an absolute local path and open the image.

Choose one operation per call. `review` defaults to front/right/top/three-quarter;
`views=["front","right","back","left","top","three_quarter"]` requests six.
Each result lists `reviews`, each containing `sheet` and individual `views`
paths. View these with the host image reader; an existing PNG alone is not a
visual check. The bridge restores frame, mode, selection, camera, render engine,
visibility, colors and image settings. It writes PNGs without saving the .blend.

**Workbench `material` mode displays material viewport colors, not PBR textures,
shader nodes, roughness or normal maps.** For PBR, lighting and weather, inspect
the current MATERIAL/RENDERED viewport with the screenshot tool or render with
the scene's intended engine and camera. For X-ray bone placement use the live
viewport's X-ray/armature-in-front controls and take screenshots; preserve and
restore temporary view/object settings. Geometry contact sheets omit bones.

Long renders: start at low resolution and split frames into bounded calls.
Do not run overlapping scene mutations or renders against the same live Blender.

## Assets, bounds and headless fallback

For PBR textures or HDRIs, use the host-side Poly Haven API workflow in
[material sourcing](../../blender-pbr-materials/references/material-sourcing.md),
then pass the local files to Blender. Discovery/download does not require a new
MCP server; return dictionaries through `result` for material creation as usual.
Import existing local files through the appropriate Blender importer after
checking its API. The current MCP has no built-in asset-search or 3D-generation
service. Load local HDRIs with `bpy.data.images.load` and an environment texture node.
World bounds come from `ob.matrix_world @ Vector(corner)` for each `ob.bound_box`
corner after updating the view layer; dimensions alone do not give world bounds.

If the MCP server cannot connect to Blender (often on localhost:9876), open
Blender and check that its MCP extension is enabled and running at the configured
address. Do not reset preferences or the
scene to establish a connection. Use the existing CLI fallback for saved files:

```text
python3 <skills_dir>/blender-core/scripts/run_in_blender.py --blend /absolute/in.blend <skills_dir>/blender-asset-qa/scripts/qa_check.py -- --objects Chair
```

Headless processes see disk contents, not unsaved live changes. If a task needs
the current unsaved scene in a background process, explicitly save a copy to a
new temporary path first.
