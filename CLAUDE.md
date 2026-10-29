# Fifa Tenkaichi 3 (Strike Legends) — project facts

Technical facts about the repository. `docs/MAPPA.md` maps each part of the game (match, AI,
skills, animations, Ultimate Team, …) to its files and state, `README.md` says what is where, `docs/DETTAGLI.md` why each
number is what it is, `docs/PIANO-3D-ONLINE.md` the phases of the new game. Tancredi owns the
project and writes in Italian.

## The game

- Arcade football, 4 outfield players and a keeper per side, closed 28 × 16 m pitch: no fouls, no
  throw-ins, the ball is won with a shoulder hit or a slide (`packages/sim/src/constants.ts`).
- The match runs at 60 Hz in `packages/sim`, the same code in the browser and on the server.
- Team bar «Tensione», 3 notches: 1 notch = charged shot, 3 notches = Colpo della Cometa.
- Collectible cards with rarities, packs, Ultimate Team (`packages/sim/src/data.ts`); clubs and
  players are invented, no real club or footballer.
- Interface text is Italian; code, identifiers and commit messages are English.

## Where things are

- `apps/web`: the new game, Next.js 16 + three.js 0.186 with `@react-three/fiber` (pages in `app/`,
  3D scene in `game/`: `core/` loop, input, options, practice; `animation/` player appearance,
  rig, GLB models and clips; `render/` stadium, code pieces, faces, materials; `ui/` React views);
  `apps/realtime`: matches over WebSocket; `packages/shared`: zod schemas
  shared by client and server; `packages/sim`: simulation, AI, skills, cards; `infra/`: Docker.
- `web/`: the old game (WebGL sprites, no build step), still published: GitHub Pages rebuilds it
  from `main` (`.github/workflows/pages.yml`) and the Windows exe downloads it from there at every
  start (`tools/web_launcher/update.go`). The working link of the old game is
  https://claude.ai/artifact/P8PppHnpvqoj76uJorB6rE (`Artifact` read, then publish with `url`,
  `file_path` `web/index.html` and the changed `js/...` files).
- `art/`: Blender sources of the GLB players; `tools/`: checks, benches and distribution of the old
  game; `docs/`: design and measurements.
- Godot is abandoned; nothing in the repository depends on it.
- `graphify-out/` maps the project without `.claude/skills/` (`.graphifyignore`). Its communities
  carry Italian names by game part («Partita · …», «Animazioni · …», «Ultimate Team · …») kept in
  `graphify-out/.graphify_labels.json` with member signatures in `.graphify_labels.json.sig`; a
  community that changes after `graphify update .` falls back to a file name until it is named
  there again and `graphify cluster-only . --no-label` rewrites the report.

## Running and checking

- From the repository root, the same steps as CI (`.github/workflows/ci.yml`):
  `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Old game: `node tools/web_checks.js` (11 checks), `node tools/ai_bench.js 12 4 1` (12 matches
  swing by about one goal: compare small differences on 48 or 96), `node tools/tension_bench.js`,
  `node tools/skill_frames.js`; in the page, `SL.debug` gives the match, the demo, the save, the
  mode and the session.
- New game: `packages/sim/bench/*.ts` (parity with the old game, browser, AI, tension, speed),
  `node apps/web/scripts/bench3d.ts http://localhost:3000` (draw budget), pages `/partita`,
  `/prova`, `/personaggi`, `/bench`, `/status`.
- Browser tests: headless Chromium with Playwright (preinstalled in cloud chats), a static server on
  `web/` or `pnpm --filter @ft3/web dev`, a fake pad by replacing `navigator.getGamepads` with
  `page.addInitScript`.
- Stack: `cd infra && docker compose up --build`, then `node infra/check-status.mjs` (exit 0 = the
  four services and the WebSocket answer) and http://localhost:3000/status. In a cloud chat start
  `dockerd` first and build with the chat network's certificate:
  `BUILDX_BAKE_ENTITLEMENTS_FS=0 docker compose -f docker-compose.yml -f docker-compose.cloud.yml up --build`
  (`docs/DETTAGLI.md`, «Docker nelle chat cloud»). Without `dockerd`, the container has Redis 7.0
  and Postgres 16 (runs as the `postgres` user) to start as child processes.
- Cloud chats render WebGL in software: frames per second are measured on Tancredi's laptop; the
  draw budget is checked with `renderer.info` (plan, section 4.6).

## Technical conventions

- TypeScript: relative imports carry the `.ts` extension and `erasableSyntaxOnly` is on, so plain
  `node` runs the sources (`node apps/realtime/src/main.ts`).
- Versions are exact in every `package.json` and image tag; the reason for each library is in
  `docs/DETTAGLI.md`, «Gioco nuovo». Docker images run on amd64 and arm64, so a tag must list both
  on Docker Hub.
- Git: only `main` and the chat's branch exist; GitHub deletes a merged branch («Automatically
  delete head branches») because `git push --delete` and tag pushes get 403 from a cloud chat.

## Players and animations

- The game draws a player from code pieces (`apps/web/game/render/parts.ts`) or from a GLB in
  `apps/web/public/models/` chosen with `?modello=<id>` (`apps/web/game/animation/models.ts`). The GLB
  contract is in `docs/STUDIO-PERSONAGGI.md`, section 11.
- A GLB's clips are played by name: `idle`, `run`, `kick` (`apps/web/game/animation/modelAppearance.ts`).
  The code reads no bone names.
- New animations are made with Meshy; Mixamo is allowed, not required, and new code must not
  assume a Mixamo skeleton. The two current models (CH_Fulmine, Golden Striker) have Mixamo-named
  bones from `art/CH_Fulmine/build_hd/16_rig.py` and `art/CH_GoldenStriker/build/rig.py` and stay as
  they are. Future goal, not started: accept Meshy clips without Mixamo naming.
- 68 skills are vendored in `.claude/skills/` (sources: `.claude/skills/SOURCES.md`; usage in
  Italian: `docs/SKILL-3D.md`): `threejs-*` for `apps/web`, `blender-*` for models and clips,
  `lowpoly-humanoid` for a low-poly body without Blender
  (`python3 .claude/skills/lowpoly-humanoid/lpm.py --out <dir>/<name> --gioi nam --cao 1.80`, needs
  `pip install numpy scipy trimesh pillow networkx`).
- CH_Fulmine is rebuilt by `art/CH_Fulmine/build_hd/` (phases 10-18, about 2 minutes) from
  `art/CH_Fulmine/ref/`.
- Blender in a cloud chat: no binary preinstalled; Blender 4.5.3 from download.blender.org
  (377 MB; EEVEE and Workbench also need `apt-get install -y libegl1 libegl-mesa0 libgl1-mesa-dri`)
  or `pip install bpy==5.2.3` (about 6 min, 1 GB).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
