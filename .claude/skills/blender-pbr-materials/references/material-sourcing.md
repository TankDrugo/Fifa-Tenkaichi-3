# Material sourcing: Poly Haven and commercially licensed assets

Read when choosing external PBR textures or HDRIs, or when procedural materials
look repetitive or synthetic. Keep the user's art direction, references, budget
and target engine as the selection criteria.

## Choose a source

| Situation | Action |
|---|---|
| User specifies a material, supplier or reference | Follow that choice; inspect the actual maps and relevant license |
| A suitable asset already exists in the project or user's licensed library | Reuse it and retain its source/license record |
| Realistic wood, stone, ground, plaster, metal, fabric | Search Poly Haven's scanned PBR library before building a procedural substitute |
| Stylized surfaces, masks or special effects | Procedural authoring or a scanned/procedural hybrid may fit better |
| A paid material is a better fit | Use an existing valid license; a new purchase needs an authorized budget/account. Otherwise present its asset link, price and applicable license alongside usable free alternatives |

Free and commercial are not opposite categories. Poly Haven assets are CC0 and
permit commercial work. Do not invent a paid Poly Haven material tier. Other
providers' free samples, subscriptions and paid packs have their own terms.
For those, verify the right to use the maps in the intended game AND to deliver
the requested source files/GLB: distributing an editable asset with extractable
textures can have different terms from shipping a finished game. Record the
actual terms rather than assuming that payment permits raw-file redistribution.

## Poly Haven API rules

Verified 2026-10-19 against the [API page](https://polyhaven.com/our-api),
[API terms](https://github.com/Poly-Haven/Public-API/blob/master/ToS.md),
[asset license](https://polyhaven.com/license),
[agent guide](https://polyhaven.com/llms.txt) and
[OpenAPI schema](https://api.polyhaven.com/api-docs/swagger.json).

- The current API is free for personal and commercial use; default endpoints
  require no API key. Send an application-specific User-Agent on each request.
- Clearly label results from the live API as **Poly Haven** and link the asset
  page, `https://polyhaven.com/a/<id>`. This service attribution requirement is
  separate from CC0: downloaded assets do not require credits in the final game.
- Use the API for listing/search/download metadata; do not scrape website grids.
  Recheck official documentation if requests or terms change.
- Cache metadata and reuse verified downloads. Use bounded requests and reasonable
  file sizes; on a service failure, report it and use cached/local alternatives
  or retry once after the server's suggested delay. Do not repeatedly hammer it.
- Source image maps are CC0. Website text, logos, sample renders and thumbnails
  are separate website content; inspect previews without treating them as texture
  maps or claiming they are CC0 assets.

## Search → inspect → plan → fetch

Run the host-only helper from the shell, outside the live Blender UI. It uses
stdlib Python, a named User-Agent, a 24-hour JSON cache, API-provided URLs,
file-size/MD5 verification, SHA256 provenance and atomic file writes.
`search`, `info` and `plan` do not download texture files.
Replace `<skills_dir>` with the absolute installed skills directory and quote
the script path if it contains spaces.

```sh
python3 <skills_dir>/blender-pbr-materials/scripts/fetch_polyhaven.py search "raw weathered wood grain" --limit 5
python3 <skills_dir>/blender-pbr-materials/scripts/fetch_polyhaven.py info rough_wood
python3 <skills_dir>/blender-pbr-materials/scripts/fetch_polyhaven.py plan rough_wood --resolution 1k
python3 <skills_dir>/blender-pbr-materials/scripts/fetch_polyhaven.py download rough_wood --resolution 1k --out /absolute/project/textures/rough_wood
```

1. Shortlist a few candidates. Read category, wear, color, dimensions and preview;
   API search relevance alone is not a visual suitability score. For a crate
   made of separate geometric planks, favor a single raw-wood surface over a
   floor scan that contains its own gaps, nails or multiple planks.
2. Start with 1k for look development; usually use 1k/2k for game props, raising
   resolution only for visible detail. Plan lists exact sizes before transfer;
   the default total budget is 128 MiB, configurable with `--max-mb`.
3. `download` gets BaseColor (JPG/PNG), OpenGL normal (PNG/EXR), Roughness
   (PNG/EXR), and Metallic/AO when available. Height is opt-in with `--maps`;
   avoid silently adding displacement geometry to a game prop. Missing maps or
   unavailable resolutions produce a clear error, without mixing resolutions or
   silently using lossy JPEG data maps.
4. Use the returned `texture_files` list as `textures=[...]` in
   `build_pbr_material.run`. Filenames use canonical suffixes the builder accepts.
   Keep `source_manifest.json` with the project. Inspect source maps, then judge
   the material in a neutral PBR render, not a Workbench material-color view.

For HDRIs, the same helper supports `--type hdris` (HDR or EXR):

```sh
python3 <skills_dir>/blender-pbr-materials/scripts/fetch_polyhaven.py search "neutral studio" --type hdris --limit 3
python3 <skills_dir>/blender-pbr-materials/scripts/fetch_polyhaven.py download studio_small_09 --type hdris --resolution 1k --out /absolute/project/hdri/studio_small_09
```

Load the returned local image into an Environment Texture. No change to the
Blender MCP server is needed: asset discovery/download happens on the host;
material wiring and look development use the existing Blender tools.

## Map, scale and export correctly

- Poly Haven texture `dimensions` are in **millimeters**; divide by 1000 for
  meters. Use the scan coverage to set UV density and Mapping scales. For a
  rectangular scan, set U/V separately rather than blindly using a uniform tile.
- Align longitudinal grain to each plank/post/brace, including diagonal braces.
  Use sensible per-piece UV offsets for variation; random rotations that cut
  across the wood grain look wrong. Avoid repeating distinctive knots identically.
- Keep BaseColor sRGB; normal, roughness, metallic, AO and height Non-Color.
  Prefer `nor_gl` for Blender/glTF. A DirectX-only source needs an explicit green
  flip; the helper intentionally fails rather than quietly substituting it.
- Wood is dielectric (Metallic 0). Missing Metallic on a wood scan is normal.
  Do not infer metal from a dark albedo or confuse a specular map with metallic.
- Source AO describes the scanned surface. Contact AO between the new asset's
  parts may require its own bake. Neither belongs baked into the BaseColor.
- For one-material GLB delivery, bake sampled source materials onto a unique
  non-overlapping atlas, then pack R=AO, G=Roughness, B=Metallic. Keep a named
  source UV map explicitly connected to source textures while baking to a
  different active target UV map; changing active UVs must not change sampling.
- Reimport the exported GLB, render it, and check that BaseColor, normal,
  roughness, metallic and occlusion survive. Verify bytes, dimensions, draw calls
  and target-engine compatibility. Pack/copy only files the license allows.

## Provenance for every external source

The helper's `source_manifest.json` stores supplier, asset ID/page, creator,
CC0 license URL, physical dimensions, API files hash, download time, per-map
URL/size/MD5/SHA256 and local paths. Keep it with the source project and retain
it when maps are renamed, baked or packed into a GLB.

For another supplier, record equivalent facts in `material_sources.json`:
supplier, asset title/ID/URL, creator, exact license name/URL, commercial-use
permission, source-file/GLB redistribution terms, applicable account/seat/project
scope, proof-of-license reference when relevant, downloaded files and hashes,
and which delivered material/atlas uses them. Keep proof references local; do
not put credentials, private download tokens or purchase records into a public GLB.

At delivery, identify external material sources and report unresolved usage
restrictions, if any. Do not claim that a non-CC0 pack is CC0 after baking it.
