# Graph Report - Fifa-tenkaichi-3  (2026-10-29)

## Corpus Check
- 120 files · ~115,720 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 5, .glb 5, .css 1)

## Summary
- 1442 nodes · 3080 edges · 89 communities (81 shown, 8 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c7b8777b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Comandi · tastiera, joypad e opzioni
- Partita · matematica identica ovunque (fmath)
- Documenti · DETTAGLI, scelte e misure
- Modelli 3D · Fulmine, corpo e vestiti
- Partita · simulazione (Match)
- Partita · squadre, lati e formazioni
- Modelli 3D · esportazione GLB e telecronaca
- Personaggi · aspetto e vetrina
- Documenti · joypad
- Personaggi · stili e modelli GLB
- Interfaccia · pagine, HUD e impronta
- Partita · tipi, skill e formazioni
- Animazioni · GLB e tabella delle clip
- Personaggi · vetrina e divise
- Prove · banchi IA e Tensione
- Partita · ciclo della scena 3D
- Partita · seno e coseno (fmath)
- Gioco nuovo · fase 1, simulazione condivisa (21/10/2026)
- Configurazione · dipendenze di apps/web
- Modelli 3D · scarpe di Fulmine
- Configurazione · integrazione continua
- Animazioni · forme dei pezzi del corpo
- Personaggi · vetrina 3D
- Prove · controlli di gioco
- Documenti · mappa del gioco
- Configurazione · dipendenze di produzione di apps/web
- Prove · controllo di fmath
- Modelli 3D · manifesto e clip di Fulmine
- Partita · comandi della simulazione
- Animazioni · GLB di Meshy: clip unite, texture e triangoli
- Modelli 3D · testa e faccia di Fulmine
- Ultimate Team · carte, pacchetti e rarità
- Prove · video di una pagina
- Prove · fogli di foto delle clip
- Interfaccia · opzioni della scena e colori
- Prove · scenari e partite registrate
- Documenti · i 10 personaggi
- Prove · banco 3D e foto
- Prove · foto delle squadre
- Prove · stessa partita in Node e Chromium
- Personaggi · strato aspetto del giocatore
- Animazioni · API di Meshy
- Documenti · skill 3D
- Configurazione · comandi di apps/web
- Prove · velocità della simulazione
- Configurazione · Next.js
- Configurazione · gltf-transform
- IA · squadra
- Animazioni · scheletro e pezzi del corpo
- Configurazione · sharp
- Configurazione · dipendenze di apps/realtime
- Configurazione · radice del progetto
- Documenti · studio dei personaggi
- Modelli 3D · strumenti Blender comuni
- Modelli 3D · capelli di Fulmine
- Online · server realtime e pagina di stato
- Animazioni · calciatore a pezzi e facce
- Documenti · fase 0 fondamenta
- Documenti · piano 3D e online
- Stadio · arena e materiali
- Configurazione · TypeScript comune
- Animazioni · scheletro e pesi di Fulmine (Blender)
- Configurazione · pacchetto sim
- Modelli 3D · misure e resa a fumetto
- Configurazione · TypeScript di apps/web
- Documenti · README
- Documenti · CLAUDE.md
- Online · Docker nelle chat cloud
- Documenti · fase 2 motore 3D
- Online · compose, ordine dei servizi
- Online · compose, servizio web
- Online · compose, Postgres
- Configurazione · TypeScript di sim
- Documenti · Golden Striker e i 10 personaggi
- Configurazione · TypeScript di shared
- Configurazione · TypeScript dei banchi sim
- Configurazione · TypeScript di realtime
- Online · compose, volumi
- Online · compose, realtime
- Online · compose, controlli di salute
- Documenti · Fulmine nel gioco
- Online · compose, Redis
- Documenti · registro delle misure
- Online · compose, build delle immagini
- Online · /api/health
- Configurazione · workspace pnpm
- Documenti · AGENTS di Next.js
- Documenti · .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `Match` - 91 edges
2. `Player` - 39 edges
3. `Strike Legends nel browser — scelte e misure fino al 21/10/2026` - 28 edges
4. `co()` - 23 edges
5. `Driver` - 21 edges
6. `three` - 20 edges
7. `main()` - 19 edges
8. `glove()` - 19 edges
9. `carrierThink()` - 19 edges
10. `clubById()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Da dove si parte` --references--> `locomotion()`  [INFERRED]
  docs/STUDIO-PERSONAGGI.md → apps/web/game/animation/rig.ts
- `Punti da implementare nella chat nuova` --references--> `locomotion()`  [INFERRED]
  docs/STUDIO-PERSONAGGI.md → apps/web/game/animation/rig.ts
- `Distribuzione (19/10/2026)` --references--> `push()`  [INFERRED]
  docs/DETTAGLI.md → art/CH_Fulmine/build_hd/hd.py
- `Players and animations` --references--> `run()`  [INFERRED]
  CLAUDE.md → packages/sim/bench/checks.ts
- `Il gioco` --references--> `run()`  [INFERRED]
  docs/DETTAGLI.md → packages/sim/bench/checks.ts

## Import Cycles
- None detected.

## Communities (89 total, 8 thin omitted)

### Community 0 - "Comandi · tastiera, joypad e opzioni"
Cohesion: 0.16
Nodes (10): createInput(), Input, KEYS, PAD, park(), PRACTICE_PLAYER, practiceDriver(), crowdTime (+2 more)

### Community 1 - "Partita · matematica identica ovunque (fmath)"
Cohesion: 0.05
Nodes (43): AT, ATANHI, ATANLO, C1, C2, C3, C4, C5 (+35 more)

### Community 2 - "Documenti · DETTAGLI, scelte e misure"
Cohesion: 0.10
Nodes (19): Campi, Carriera, Come si gioca in locale, Cosa c'è, Distribuzione (19/10/2026), Gioco nuovo · fase 3a, prototipi dei personaggi (22/10/2026), Il titolo sul campo (19/10/2026), Impostazioni (+11 more)

### Community 3 - "Modelli 3D · Fulmine, corpo e vestiti"
Cohesion: 0.15
Nodes (23): elements(), collar(), cuffs(), emblem(), shirt(), shorts(), socks(), surface_ring() (+15 more)

### Community 4 - "Partita · simulazione (Match)"
Cohesion: 0.13
Nodes (5): clamp(), interceptTime(), Match, stopped(), Player

### Community 5 - "Partita · squadre, lati e formazioni"
Cohesion: 0.19
Nodes (6): play(), side(), formationOf(), attackSign(), makePlayer(), Human

### Community 6 - "Modelli 3D · esportazione GLB e telecronaca"
Cohesion: 0.16
Nodes (8): copy_of(), cut_hidden_skin(), decimate(), main(), merge_fixed(), parts(), lin(), mat()

### Community 7 - "Personaggi · aspetto e vetrina"
Cohesion: 0.13
Nodes (13): metadata, modelEntry, useModel(), Look, ShowroomLoop, ShowroomStage(), Window, WithModel() (+5 more)

### Community 8 - "Documenti · joypad"
Cohesion: 0.50
Nodes (4): Joypad, Joypad PS4, ufficiali e non (20/10/2026), Joypad PS5 (19/10/2026), Menu col joypad (19/10/2026)

### Community 9 - "Personaggi · stili e modelli GLB"
Cohesion: 0.10
Nodes (21): Build, CLASSIC, CLASSIC_HEIGHT, FIGURE_BUILD, makeBody(), total(), BrowStyle, CHARACTER_HAIR (+13 more)

### Community 10 - "Interfaccia · pagine, HUD e impronta"
Cohesion: 0.21
Nodes (13): Bench(), metadata, metadata, Partita(), metadata, Prova(), stageOptions, Hud (+5 more)

### Community 11 - "Partita · tipi, skill e formazioni"
Cohesion: 0.08
Nodes (35): AiSkill, FAM_MARK, len(), RoleDef, SKILL, skillOf(), CLIP_DURATION, DT (+27 more)

### Community 12 - "Animazioni · GLB e tabella delle clip"
Cohesion: 0.13
Nodes (20): designs, kit, Copy, modelAppearance(), modelHeight(), Played, start(), STATES (+12 more)

### Community 13 - "Personaggi · vetrina e divise"
Cohesion: 0.21
Nodes (13): createAppearance(), newFrame(), createLook(), Style, standardMaterial(), BALL_TEXTURE(), buildActors(), PlayerKit (+5 more)

### Community 14 - "Prove · banchi IA e Tensione"
Cohesion: 0.17
Nodes (8): all, args, asJson, mins, oldPass, res, shotD, Tally

### Community 15 - "Partita · ciclo della scena 3D"
Cohesion: 0.14
Nodes (9): Driver, StageLoop, FrameInfo, FrameStats, Window, Stage(), WithModel(), World() (+1 more)

### Community 16 - "Partita · seno e coseno (fmath)"
Cohesion: 0.25
Nodes (14): Matematica uguale in ogni motore, BUTTONS, commandScript(), PRESS, SWEEPS, cos(), high(), kernelCos() (+6 more)

### Community 17 - "Gioco nuovo · fase 1, simulazione condivisa (21/10/2026)"
Cohesion: 0.29
Nodes (7): Cosa c'è, Cosa non è provato, Gioco nuovo · fase 1, simulazione condivisa (21/10/2026), Il banco dell'IA e il compagno scelto, Misure, Partite simultanee per core, Versioni e perché

### Community 18 - "Configurazione · dipendenze di apps/web"
Cohesion: 0.13
Nodes (21): devDependencies, meshoptimizer@1.3.0, playwright@1.56.1, @types/node@24.19.2, @types/pg@8.23.1, @types/react@19.3.0, @types/react-dom@19.3.0, @types/three@0.186.0 (+13 more)

### Community 19 - "Modelli 3D · scarpe di Fulmine"
Cohesion: 0.20
Nodes (6): boot(), ring(), stations(), _frames(), loft(), tube()

### Community 20 - "Configurazione · integrazione continua"
Cohesion: 0.06
Nodes (41): name, runs-on, steps, name, runs-on, steps, concurrency, cancel-in-progress (+33 more)

### Community 21 - "Animazioni · forme dei pezzi del corpo"
Cohesion: 0.19
Nodes (28): Add, buildParts(), facial(), foot(), gear(), hair(), hairline(), latheXY() (+20 more)

### Community 22 - "Personaggi · vetrina 3D"
Cohesion: 0.43
Nodes (6): metadata, Personaggi(), modelUrl(), ShowroomStage, ShowroomView(), clubById()

### Community 23 - "Prove · controlli di gioco"
Cohesion: 0.18
Nodes (12): cmd(), FOLLOW, freeze(), holder(), PassOpts, passTrials(), results, setup() (+4 more)

### Community 24 - "Documenti · mappa del gioco"
Cohesion: 0.17
Nodes (11): Audio e telecronaca, Comandi e joypad, IA, Interfaccia e menu, Mappa del gioco, Online e account, Partita, Prove (+3 more)

### Community 25 - "Configurazione · dipendenze di produzione di apps/web"
Cohesion: 0.13
Nodes (15): dependencies, @ft3/shared@workspace:*, @ft3/sim@workspace:*, next@16.4.2, pg@8.23.1, postprocessing@6.39.5, react-dom@19.3.1, redis@6.3.0 (+7 more)

### Community 26 - "Prove · controllo di fmath"
Cohesion: 0.29
Nodes (7): cases, r, special, u(), atan(), atan2(), low()

### Community 27 - "Modelli 3D · manifesto e clip di Fulmine"
Cohesion: 0.05
Nodes (36): animation_contract, asset, blender, bounds_m, max, min, size, colliders (+28 more)

### Community 28 - "Partita · comandi della simulazione"
Cohesion: 0.11
Nodes (23): Cosa cambia rispetto a `web/js/`, AiPhase, LOOKS, SHOULDER_PATH, shoulderRoot(), shoulderTimeAt(), skill(), Ball (+15 more)

### Community 29 - "Animazioni · GLB di Meshy: clip unite, texture e triangoli"
Cohesion: 0.17
Nodes (13): @gltf-transform/core@4.5.1, @gltf-transform/functions@4.5.1, f(), args, build(), info(), io, moveClips() (+5 more)

### Community 30 - "Modelli 3D · testa e faccia di Fulmine"
Cohesion: 0.17
Nodes (13): bpy_flip(), brow(), ear(), eye(), face(), main(), quad_sphere(), skull() (+5 more)

### Community 32 - "Ultimate Team · carte, pacchetti e rarità"
Cohesion: 0.07
Nodes (35): Ultimate Team e carte, awayKit(), BODIES, BY_ID, cardById(), cardEffect(), CHARS, Entry (+27 more)

### Community 33 - "Prove · video di una pagina"
Cohesion: 0.15
Nodes (8): args, dir, ffmpeg, fps, height, n, seconds, width

### Community 34 - "Prove · fogli di foto delle clip"
Cohesion: 0.18
Nodes (8): args, feet, frames, from, only, server, three, to

### Community 35 - "Interfaccia · opzioni della scena e colori"
Cohesion: 0.24
Nodes (8): DEFAULT_STAGE, Params, CAMERA, CHARACTER_HEIGHT, DAY, KEEPER_COLOURS, LOOK_COLOURS, STYLE

### Community 36 - "Prove · scenari e partite registrate"
Cohesion: 0.18
Nodes (15): SideColours, Snapshot, Game, one, PAIRS, Scenario, side(), t (+7 more)

### Community 37 - "Documenti · i 10 personaggi"
Cohesion: 0.20
Nodes (9): Cosa resta, I 10 personaggi (29/10/2026), I dieci, I numeri di `portiere1`, Il procedimento Meshy, passo per passo, La tabella delle clip, Le animazioni base, `portiere1`, l'esempio (+1 more)

### Community 38 - "Prove · banco 3D e foto"
Cohesion: 0.22
Nodes (5): args, model, photos, root, seconds

### Community 39 - "Prove · foto delle squadre"
Cohesion: 0.22
Nodes (5): args, root, Show, teams, CLUBS

### Community 40 - "Prove · stessa partita in Node e Chromium"
Cohesion: 0.25
Nodes (4): inNode, t0, t1, RunResult

### Community 41 - "Personaggi · strato aspetto del giocatore"
Cohesion: 0.33
Nodes (4): Appearance, Actors, Gioco nuovo · personaggi da modelli GLB (25/10/2026), Punto 1 · strato «aspetto del giocatore»

### Community 42 - "Animazioni · API di Meshy"
Cohesion: 0.33
Nodes (4): call(), [cmd, ...a], headers, wait()

### Community 43 - "Documenti · skill 3D"
Cohesion: 0.29
Nodes (6): Animazioni: Meshy, Mixamo facoltativo, Come provare a creare un giocatore, Il primo giocatore: CH_Fulmine (26/10/2026), Provato in questa chat, Quando usarle, Skill per il gioco 3D: three.js e Blender (26/10/2026)

### Community 44 - "Configurazione · comandi di apps/web"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, typecheck

### Community 45 - "Prove · velocità della simulazione"
Cohesion: 0.23
Nodes (5): runScenarios(), play(), SCENARIOS, groups, RECORDED

### Community 48 - "IA · squadra"
Cohesion: 0.18
Nodes (27): roleRun(), anchor(), ballAt(), cardRoles(), carrierThink(), clamp(), control(), defaultRole() (+19 more)

### Community 49 - "Animazioni · scheletro e pezzi del corpo"
Cohesion: 0.09
Nodes (29): pieceAppearance(), ANKLE, arm, BONE, BoneName, bonePosition(), clamp(), ea (+21 more)

### Community 54 - "Configurazione · dipendenze di apps/realtime"
Cohesion: 0.10
Nodes (25): dependencies, @ft3/shared@workspace:*, redis@6.3.0, ws@8.22.0, devDependencies, esbuild@0.28.2, @types/node@24.19.2, @types/ws@8.18.2 (+17 more)

### Community 67 - "Configurazione · radice del progetto"
Cohesion: 0.09
Nodes (28): devDependencies, eslint@10.13.0, @eslint/js@10.0.1, eslint-plugin-react-hooks@7.1.1, globals@17.13.0, @next/eslint-plugin-next@16.4.2, typescript@6.0.3, typescript-eslint@8.72.0 (+20 more)

### Community 78 - "Documenti · studio dei personaggi"
Cohesion: 0.04
Nodes (45): 10. Attaccante, 10. Strumenti provati in questa chat (22/10/2026), 11. Piano del 25/10/2026: architettura dei personaggi e modelli GLB, 12.1 Prompt per 10 giocatori: Celestini contro rivali (26/10/2026), 12. Prompt per l'immagine di riferimento (facoltativo: per chi genera i modelli da un'immagine), 1. Cosa mostrano i riferimenti, 1. Portiere, 2. Difensore (+37 more)

### Community 84 - "Modelli 3D · strumenti Blender comuni"
Cohesion: 0.11
Nodes (20): sculpt(), under_clothes(), proxy_of(), bezier(), capsule_between(), col(), cutter_cylinder(), edges() (+12 more)

### Community 85 - "Modelli 3D · capelli di Fulmine"
Cohesion: 0.16
Nodes (16): cap(), crest(), crest_centre(), crest_depth(), inside(), main(), on_cap(), outline_points() (+8 more)

### Community 98 - "Online · server realtime e pagina di stato"
Cohesion: 0.05
Nodes (50): port, redis, onMessage(), rawText(), RealtimeOptions, RealtimeServer, send(), startRealtime() (+42 more)

### Community 99 - "Animazioni · calciatore a pezzi e facce"
Cohesion: 0.13
Nodes (23): PlayerFrame, PlayerMotion, BONES_PER_PLAYER, Body, buildCast(), Cast, castMaterial(), col (+15 more)

### Community 101 - "Documenti · fase 0 fondamenta"
Cohesion: 0.29
Nodes (7): Cosa c'è, Cosa non è provato, Docker nelle chat cloud, Gioco nuovo · fase 0, fondamenta (21/10/2026), Misure, Sul PC di Tancredi, Versioni e perché

### Community 103 - "Documenti · piano 3D e online"
Cohesion: 0.12
Nodes (16): 1. Decisioni di Tancredi (21/10/2026), 2. Da dove si parte (misure del 19-21/10/2026), 3. Architettura, 4.1 Interfaccia e joypad, 4.2 Carte di Ultimate Team, 4.3 Animazioni dell'interfaccia, 4.4 Pausa e comandi, 4.5 Economia di Ultimate Team (+8 more)

### Community 105 - "Stadio · arena e materiali"
Cohesion: 0.24
Nodes (15): APRON, Arena, box(), buildArena(), canvas(), fanGeometry(), fenceTexture(), merged() (+7 more)

### Community 108 - "Configurazione · TypeScript comune"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+9 more)

### Community 114 - "Animazioni · scheletro e pesi di Fulmine (Blender)"
Cohesion: 0.24
Nodes (13): main(), main(), main(), main(), copy_weights(), main(), rigid_bone(), args() (+5 more)

### Community 117 - "Configurazione · pacchetto sim"
Cohesion: 0.15
Nodes (16): devDependencies, esbuild@0.28.2, playwright@1.56.1, @types/node@24.19.2, typescript@6.0.3, exports, esbuild, playwright (+8 more)

### Community 128 - "Modelli 3D · misure e resa a fumetto"
Cohesion: 0.16
Nodes (7): CH_Fulmine — scheda (fase 0), Versione dettagliata (build_hd/, 26/10/2026), stretch_z(), args(), main(), outline_material(), toon()

### Community 134 - "Configurazione · TypeScript di apps/web"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, incremental, jsx, lib, paths, plugins, types (+4 more)

### Community 149 - "Documenti · README"
Cohesion: 0.22
Nodes (8): Comandi, Come funziona la partita, Crediti e licenze, Fifa Tenkaichi 3 — Strike Legends, Personaggi e animazioni, Prove e misure, Stato e cose aperte, Struttura

### Community 150 - "Documenti · CLAUDE.md"
Cohesion: 0.25
Nodes (7): Fifa Tenkaichi 3 (Strike Legends) — project facts, graphify, Players and animations, Running and checking, Technical conventions, The game, Where things are

### Community 159 - "Online · Docker nelle chat cloud"
Cohesion: 0.22
Nodes (9): secrets, file, build, secrets, ca_bundle, services, realtime, web (+1 more)

### Community 177 - "Documenti · fase 2 motore 3D"
Cohesion: 0.25
Nodes (8): Cosa non è provato, Errori trovati nel lavoro, Gioco nuovo · fase 2, motore 3D (22/10/2026), Il riferimento: Mario Strikers: Battle League, Misure, Stadio, Telecamera: le prove, Versioni e perché

### Community 192 - "Online · compose, ordine dei servizi"
Cohesion: 0.25
Nodes (8): postgres, realtime, redis, condition, condition, depends_on, condition, depends_on

### Community 193 - "Online · compose, servizio web"
Cohesion: 0.25
Nodes (8): DATABASE_URL, REALTIME_INTERNAL_URL, REALTIME_PUBLIC_URL, web, environment, image, ports, restart

### Community 194 - "Online · compose, Postgres"
Cohesion: 0.25
Nodes (8): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, environment, image, restart, volumes, postgres

### Community 195 - "Configurazione · TypeScript di sim"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, types, exclude, extends, include, ../../tsconfig.base.json

### Community 210 - "Documenti · Golden Striker e i 10 personaggi"
Cohesion: 0.18
Nodes (12): Cosa non è provato, Cosa è cambiato nel codice, Errori trovati nel lavoro, Gioco nuovo · Golden Striker da Meshy e partita di prova (26/10/2026), Gioco nuovo · i 10 personaggi, `portiere1` con le clip di Meshy (29/10/2026), Il file di partenza, Il gioco, Lo script (`art/CH_GoldenStriker/build/rig.py`) (+4 more)

### Community 211 - "Configurazione · TypeScript di shared"
Cohesion: 0.29
Nodes (6): compilerOptions, lib, types, extends, include, ../../tsconfig.base.json

### Community 212 - "Configurazione · TypeScript dei banchi sim"
Cohesion: 0.29
Nodes (6): compilerOptions, lib, types, extends, include, ../../tsconfig.base.json

### Community 214 - "Configurazione · TypeScript di realtime"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../tsconfig.base.json

### Community 224 - "Online · compose, volumi"
Cohesion: 0.33
Nodes (5): name, services, volumes, pgdata, redisdata

### Community 225 - "Online · compose, realtime"
Cohesion: 0.33
Nodes (6): REDIS_URL, environment, image, ports, restart, realtime

### Community 226 - "Online · compose, controlli di salute"
Cohesion: 0.53
Nodes (6): interval, retries, test, timeout, healthcheck, healthcheck

### Community 227 - "Documenti · Fulmine nel gioco"
Cohesion: 0.50
Nodes (4): Ambiente della chat, Gioco nuovo · CH_Fulmine dal riferimento, registro dei modelli, clip (26/10/2026), Il gioco, Il modello

### Community 235 - "Online · compose, Redis"
Cohesion: 0.40
Nodes (5): command, image, restart, volumes, redis

### Community 241 - "Documenti · registro delle misure"
Cohesion: 0.50
Nodes (4): Da dove viene ogni parte, IA, Misura prima e dopo, Registro delle modifiche misurate (sessione del 19/10/2026)

### Community 242 - "Online · compose, build delle immagini"
Cohesion: 0.67
Nodes (4): context, dockerfile, build, build

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 606 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Strike Legends nel browser — scelte e misure fino al 21/10/2026` connect `Documenti · DETTAGLI, scelte e misure` to `Documenti · Fulmine nel gioco`, `Documenti · fase 0 fondamenta`, `Documenti · joypad`, `Personaggi · strato aspetto del giocatore`, `Documenti · fase 2 motore 3D`, `Gioco nuovo · fase 1, simulazione condivisa (21/10/2026)`, `Documenti · Golden Striker e i 10 personaggi`, `Documenti · registro delle misure`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Partita · matematica identica ovunque (fmath)` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Why does `Distribuzione (19/10/2026)` connect `Documenti · DETTAGLI, scelte e misure` to `Modelli 3D · strumenti Blender comuni`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Should `Documenti · DETTAGLI, scelte e misure` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `push()` connect `Modelli 3D · strumenti Blender comuni` to `Documenti · DETTAGLI, scelte e misure`, `Modelli 3D · testa e faccia di Fulmine`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Should `Partita · simulazione (Match)` be split into smaller, more focused modules?**
  _Cohesion score 0.13176470588235295 - nodes in this community are weakly interconnected._