# Graph Report - Fifa-tenkaichi-3  (2026-10-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1785 nodes · 3791 edges · 93 communities (84 shown, 9 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 193 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c456a160`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Comandi · tastiera, joypad e opzioni (nuovo)
- Partita · matematica identica ovunque (fmath)
- Documenti · DETTAGLI, gioco vecchio
- Modelli 3D · Fulmine, corpo e vestiti
- Partita · simulazione (Match)
- Partita · tipi della simulazione
- Modelli 3D · esportazione GLB e telecronaca
- Gioco vecchio · disegno degli sprite
- Gioco vecchio · menu, HUD e joypad
- Personaggi · aspetto e modelli GLB
- Interfaccia · pagine e HUD (nuovo)
- Partita · formazioni, ruoli e skill
- Distribuzione · exe per Windows
- Personaggi · vetrina e divise
- Prove · banchi IA e Tensione (nuovo)
- Partita · ciclo della scena 3D
- Prove · parità col gioco vecchio
- Partita · funzioni di geometria
- Configurazione · dipendenze di apps/web
- Gioco vecchio · telecronaca
- Configurazione · integrazione continua
- Animazioni · forme dei pezzi del corpo
- Personaggi · vetrina 3D
- Prove · controlli di gioco (nuovo)
- Documenti · mappa del gioco
- Comandi · opzioni della scena e telecamera
- Prove · controllo di fmath
- Modelli 3D · manifesto e clip di Fulmine
- Interfaccia · cornice delle pagine
- Modelli 3D · testa e faccia di Fulmine
- Ultimate Team · carte, pacchetti e rarità
- Prove · scenari e confronto
- Gioco vecchio · audio
- Gioco vecchio · impostazioni e prova joypad
- Prove · banco 3D e foto
- Distribuzione · sito GitHub Pages
- IA · squadra (nuovo)
- Animazioni · scheletro e pezzi del corpo
- Configurazione · dipendenze di apps/realtime
- Gioco vecchio · carriera
- Configurazione · radice del progetto
- Interfaccia · scena della partita
- Documenti · studio dei personaggi
- Modelli 3D · strumenti Blender comuni
- Modelli 3D · capelli di Fulmine
- Prove · banco IA (vecchio)
- Prove · controlli di gioco (vecchio)
- Online · server realtime e pagina di stato
- Animazioni · calciatore a pezzi e facce
- Documenti · fase 0 fondamenta
- Documenti · piano 3D e online
- Stadio · arena e materiali
- Configurazione · TypeScript comune
- Gioco vecchio · IA
- Animazioni · scheletro e pesi di Fulmine (Blender)
- Configurazione · pacchetto sim
- Modelli 3D · scarpe, calzettoni e resa a fumetto
- Configurazione · TypeScript di apps/web
- Gioco vecchio · Ultimate Team
- Prove · banco Tensione (vecchio)
- Documenti · README
- Documenti · CLAUDE.md
- Online · Docker nelle chat cloud
- Gioco vecchio · modalità e sfide
- Documenti · fase 2 motore 3D
- Online · compose, ordine dei servizi
- Online · compose, servizio web
- Online · compose, Postgres
- Configurazione · TypeScript di sim
- Prove · foto delle skill (vecchio)
- Gioco vecchio · dati e rose
- Gioco vecchio · partita
- Documenti · skill 3D
- Configurazione · TypeScript di shared
- Configurazione · TypeScript dei banchi sim
- Distribuzione · copertina e logo
- Configurazione · TypeScript di realtime
- Documenti · Golden Striker
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
- Distribuzione · zip per itch.io
- Distribuzione · modulo Go del launcher

## God Nodes (most connected - your core abstractions)
1. `Match` - 93 edges
2. `Player` - 39 edges
3. `Strike Legends nel browser — scelte e misure fino al 21/10/2026` - 27 edges
4. `co()` - 23 edges
5. `Driver` - 21 edges
6. `gy()` - 20 edges
7. `three` - 20 edges
8. `rng` - 19 edges
9. `clubById()` - 19 edges
10. `glove()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Ultimate Team` --references--> `record()`  [INFERRED]
  docs/DETTAGLI.md → web/js/ut.js
- `Cosa c'è` --references--> `hypot()`  [INFERRED]
  docs/DETTAGLI.md → packages/sim/src/fmath.ts
- `Cosa c'è` --references--> `drawBoards()`  [INFERRED]
  docs/DETTAGLI.md → web/js/render.js
- `Distribuzione (19/10/2026)` --references--> `push()`  [INFERRED]
  docs/DETTAGLI.md → art/CH_Fulmine/build_hd/hd.py
- `Scelte di struttura` --references--> `timed()`  [INFERRED]
  docs/DETTAGLI.md → packages/shared/src/status.ts

## Import Cycles
- None detected.

## Communities (93 total, 9 thin omitted)

### Community 0 - "Comandi · tastiera, joypad e opzioni (nuovo)"
Cohesion: 0.18
Nodes (8): SideColours, Snapshot, createInput(), Input, KEYS, PAD, PRACTICE_PLAYER, C

### Community 1 - "Partita · matematica identica ovunque (fmath)"
Cohesion: 0.05
Nodes (43): AT, ATANHI, ATANLO, C1, C2, C3, C4, C5 (+35 more)

### Community 2 - "Documenti · DETTAGLI, gioco vecchio"
Cohesion: 0.10
Nodes (19): Carriera, Come si gioca in locale, Cosa c'è, Distribuzione (19/10/2026), Gioco nuovo · fase 3a, prototipi dei personaggi (22/10/2026), Gioco nuovo · personaggi da modelli GLB (25/10/2026), Impostazioni, Passaggi (19/10/2026) (+11 more)

### Community 3 - "Modelli 3D · Fulmine, corpo e vestiti"
Cohesion: 0.13
Nodes (23): elements(), sculpt(), collar(), cuffs(), emblem(), shirt(), shorts(), surface_ring() (+15 more)

### Community 4 - "Partita · simulazione (Match)"
Cohesion: 0.10
Nodes (11): Cosa cambia rispetto a `web/js/`, attackSign(), clamp(), Match, shoulderRoot(), shoulderTimeAt(), stopped(), skill() (+3 more)

### Community 5 - "Partita · tipi della simulazione"
Cohesion: 0.10
Nodes (25): formationOf(), cardEffect(), AiPhase, interceptTime(), len(), LOOKS, makePlayer(), PassHow (+17 more)

### Community 6 - "Modelli 3D · esportazione GLB e telecronaca"
Cohesion: 0.12
Nodes (9): copy_of(), cut_hidden_skin(), decimate(), main(), merge_fixed(), parts(), lin(), mat() (+1 more)

### Community 7 - "Gioco vecchio · disegno degli sprite"
Cohesion: 0.10
Nodes (54): Campi, Il titolo sul campo (19/10/2026), arrow(), ball(), begin(), buildGround(), canvas2d(), crowdColour() (+46 more)

### Community 8 - "Gioco vecchio · menu, HUD e joypad"
Cohesion: 0.08
Nodes (49): Joypad, Joypad PS4, ufficiali e non (20/10/2026), Joypad PS5 (19/10/2026), Menu col joypad (19/10/2026), customProfile(), hatDirs(), labels(), layout() (+41 more)

### Community 9 - "Personaggi · aspetto e modelli GLB"
Cohesion: 0.10
Nodes (20): designs, BrowStyle, CHARACTER_HAIR, designFor(), draws(), Ears, EYE_COLOURS, EyeStyle (+12 more)

### Community 10 - "Interfaccia · pagine e HUD (nuovo)"
Cohesion: 0.21
Nodes (13): Bench(), metadata, metadata, Partita(), metadata, Prova(), stageOptions, Hud (+5 more)

### Community 11 - "Partita · formazioni, ruoli e skill"
Cohesion: 0.11
Nodes (26): cardRoles(), defaultRole(), ROLES, rolesFor(), skillOf(), CLIP_DURATION, DT, Formation (+18 more)

### Community 12 - "Distribuzione · exe per Windows"
Cohesion: 0.07
Nodes (15): handler(), main(), ours(), TestHandler(), TestUpdate(), waitForClose(), fail(), openWindow() (+7 more)

### Community 13 - "Personaggi · vetrina e divise"
Cohesion: 0.11
Nodes (27): Appearance, createAppearance(), newFrame(), PlayerFrame, PlayerMotion, kit, Copy, modelAppearance() (+19 more)

### Community 14 - "Prove · banchi IA e Tensione (nuovo)"
Cohesion: 0.13
Nodes (19): all, args, asJson, mins, oldPass, play(), res, shotD (+11 more)

### Community 15 - "Partita · ciclo della scena 3D"
Cohesion: 0.15
Nodes (6): Driver, park(), practiceDriver(), FrameInfo, FrameStats, Window

### Community 16 - "Prove · parità col gioco vecchio"
Cohesion: 0.22
Nodes (17): Matematica uguale in ogni motore, loadOldGame(), BUTTONS, commandScript(), PRESS, SWEEPS, atan(), atan2() (+9 more)

### Community 17 - "Partita · funzioni di geometria"
Cohesion: 0.29
Nodes (7): Cosa c'è, Cosa non è provato, Gioco nuovo · fase 1, simulazione condivisa (21/10/2026), Il banco dell'IA e il compagno scelto, Misure, Partite simultanee per core, Versioni e perché

### Community 18 - "Configurazione · dipendenze di apps/web"
Cohesion: 0.06
Nodes (40): dependencies, @ft3/shared@workspace:*, @ft3/sim@workspace:*, next@16.4.2, pg@8.23.1, postprocessing@6.39.5, react@19.3.1, react-dom@19.3.1 (+32 more)

### Community 19 - "Gioco vecchio · telecronaca"
Cohesion: 0.43
Nodes (6): clip(), events(), italianVoice(), load(), say(), start()

### Community 20 - "Configurazione · integrazione continua"
Cohesion: 0.06
Nodes (41): name, runs-on, steps, name, runs-on, steps, concurrency, cancel-in-progress (+33 more)

### Community 21 - "Animazioni · forme dei pezzi del corpo"
Cohesion: 0.19
Nodes (28): Add, buildParts(), facial(), foot(), gear(), hair(), hairline(), latheXY() (+20 more)

### Community 22 - "Personaggi · vetrina 3D"
Cohesion: 0.16
Nodes (11): metadata, Personaggi(), Look, EXPRESSIONS, ShowroomLoop, ShowroomStage(), Window, WithModel() (+3 more)

### Community 23 - "Prove · controlli di gioco (nuovo)"
Cohesion: 0.17
Nodes (13): cmd(), FOLLOW, freeze(), holder(), PassOpts, passTrials(), results, run() (+5 more)

### Community 24 - "Documenti · mappa del gioco"
Cohesion: 0.14
Nodes (13): Audio e telecronaca, Comandi e joypad, IA, Interfaccia e menu, Mappa del gioco, Online e account, Partita, Personaggi e animazioni (+5 more)

### Community 25 - "Comandi · opzioni della scena e telecamera"
Cohesion: 0.28
Nodes (7): DEFAULT_STAGE, Params, CAMERA, DAY, KEEPER_COLOURS, LOOK_COLOURS, STYLE

### Community 26 - "Prove · controllo di fmath"
Cohesion: 0.29
Nodes (7): cases, r, special, u(), len(), hypot(), len()

### Community 27 - "Modelli 3D · manifesto e clip di Fulmine"
Cohesion: 0.05
Nodes (36): animation_contract, asset, blender, bounds_m, max, min, size, colliders (+28 more)

### Community 30 - "Modelli 3D · testa e faccia di Fulmine"
Cohesion: 0.17
Nodes (14): bpy_flip(), brow(), ear(), eye(), face(), main(), quad_sphere(), skull() (+6 more)

### Community 32 - "Ultimate Team · carte, pacchetti e rarità"
Cohesion: 0.07
Nodes (33): awayKit(), BODIES, BY_ID, cardById(), CHARS, Entry, entryKey(), extraCards (+25 more)

### Community 36 - "Prove · scenari e confronto"
Cohesion: 0.24
Nodes (13): OldGame, repoRoot, Game, one, Scenario, RoleDef, SkillDef, Card (+5 more)

### Community 42 - "Gioco vecchio · audio"
Cohesion: 0.17
Nodes (21): Sfide, apply(), burst(), card(), env(), goal(), hit(), kick() (+13 more)

### Community 44 - "Gioco vecchio · impostazioni e prova joypad"
Cohesion: 0.29
Nodes (5): controls(), formationSvg(), framed(), open(), padTest()

### Community 45 - "Prove · banco 3D e foto"
Cohesion: 0.06
Nodes (21): config, args, photos, root, seconds, args, root, Show (+13 more)

### Community 47 - "Distribuzione · sito GitHub Pages"
Cohesion: 0.07
Nodes (30): runs-on, steps, concurrency, cancel-in-progress, group, environment, needs, runs-on (+22 more)

### Community 48 - "IA · squadra (nuovo)"
Cohesion: 0.18
Nodes (27): AiSkill, anchor(), ballAt(), carrierThink(), clamp(), control(), defend(), FAM_MARK (+19 more)

### Community 49 - "Animazioni · scheletro e pezzi del corpo"
Cohesion: 0.07
Nodes (41): pieceAppearance(), ANKLE, arm, BONE, BoneName, bonePosition(), BONES_PER_PLAYER, clamp() (+33 more)

### Community 54 - "Configurazione · dipendenze di apps/realtime"
Cohesion: 0.10
Nodes (25): dependencies, @ft3/shared@workspace:*, redis@6.3.0, ws@8.22.0, devDependencies, esbuild@0.28.2, @types/node@24.19.2, @types/ws@8.18.2 (+17 more)

### Community 57 - "Gioco vecchio · carriera"
Cohesion: 0.20
Nodes (27): addResult(), copyCard(), endSeason(), fillStarters(), growth(), hubScreen(), marketList(), marketScreen() (+19 more)

### Community 67 - "Configurazione · radice del progetto"
Cohesion: 0.09
Nodes (28): devDependencies, eslint@10.13.0, @eslint/js@10.0.1, eslint-plugin-react-hooks@7.1.1, globals@17.13.0, @next/eslint-plugin-next@16.4.2, typescript@6.0.3, typescript-eslint@8.72.0 (+20 more)

### Community 68 - "Interfaccia · scena della partita"
Cohesion: 0.20
Nodes (11): MODELS, modelUrl(), useModel(), StageLoop, Stage(), WithModel(), World(), WorldProps (+3 more)

### Community 78 - "Documenti · studio dei personaggi"
Cohesion: 0.05
Nodes (40): 10. Attaccante, 10. Strumenti provati in questa chat (22/10/2026), 12.1 Prompt per 10 giocatori: Celestini contro rivali (26/10/2026), 12. Prompt per l'immagine di riferimento (facoltativo: per chi genera i modelli da un'immagine), 1. Cosa mostrano i riferimenti, 1. Portiere, 2. Difensore, 2. Il vincolo della telecamera (+32 more)

### Community 84 - "Modelli 3D · strumenti Blender comuni"
Cohesion: 0.10
Nodes (20): under_clothes(), proxy_of(), bezier(), capsule_between(), col(), cutter_cylinder(), edges(), ellipsoid_along() (+12 more)

### Community 85 - "Modelli 3D · capelli di Fulmine"
Cohesion: 0.16
Nodes (16): cap(), crest(), crest_centre(), crest_depth(), inside(), main(), on_cap(), outline_points() (+8 more)

### Community 96 - "Prove · banco IA (vecchio)"
Cohesion: 0.11
Nodes (15): all, args, asJson, ctx, fs, mins, PAIRS, path (+7 more)

### Community 97 - "Prove · controlli di gioco (vecchio)"
Cohesion: 0.12
Nodes (13): ctx, FOLLOW, freeze(), fs, NONE, passTrials(), path, results (+5 more)

### Community 98 - "Online · server realtime e pagina di stato"
Cohesion: 0.05
Nodes (49): port, redis, onMessage(), rawText(), RealtimeOptions, RealtimeServer, send(), startRealtime() (+41 more)

### Community 99 - "Animazioni · calciatore a pezzi e facce"
Cohesion: 0.14
Nodes (17): Body, Build, Cast, castMaterial(), col, MAX_PLAYERS, top, Atlases (+9 more)

### Community 101 - "Documenti · fase 0 fondamenta"
Cohesion: 0.25
Nodes (8): Cosa c'è, Cosa non è provato, Docker nelle chat cloud, Gioco nuovo · fase 0, fondamenta (21/10/2026), Misure, Scelte di struttura, Sul PC di Tancredi, Versioni e perché

### Community 103 - "Documenti · piano 3D e online"
Cohesion: 0.12
Nodes (16): 1. Decisioni di Tancredi (21/10/2026), 2. Da dove si parte (misure del 19-21/10/2026), 3. Architettura, 4.1 Interfaccia e joypad, 4.2 Carte di Ultimate Team, 4.3 Animazioni dell'interfaccia, 4.4 Pausa e comandi, 4.5 Economia di Ultimate Team (+8 more)

### Community 105 - "Stadio · arena e materiali"
Cohesion: 0.22
Nodes (16): APRON, Arena, box(), buildArena(), canvas(), fanGeometry(), fenceTexture(), merged() (+8 more)

### Community 108 - "Configurazione · TypeScript comune"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+9 more)

### Community 109 - "Gioco vecchio · IA"
Cohesion: 0.27
Nodes (17): anchor(), ballAt(), cardRoles(), carrierThink(), control(), defaultRole(), defend(), keeper() (+9 more)

### Community 114 - "Animazioni · scheletro e pesi di Fulmine (Blender)"
Cohesion: 0.16
Nodes (16): CH_Fulmine — scheda (fase 0), Versione dettagliata (build_hd/, 26/10/2026), main(), main(), main(), main(), copy_weights(), main() (+8 more)

### Community 117 - "Configurazione · pacchetto sim"
Cohesion: 0.15
Nodes (16): devDependencies, esbuild@0.28.2, playwright@1.56.1, @types/node@24.19.2, typescript@6.0.3, exports, esbuild, playwright (+8 more)

### Community 128 - "Modelli 3D · scarpe, calzettoni e resa a fumetto"
Cohesion: 0.16
Nodes (9): socks(), boot(), ring(), stations(), loft(), args(), main(), outline_material() (+1 more)

### Community 134 - "Configurazione · TypeScript di apps/web"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, incremental, jsx, lib, paths, plugins, types (+4 more)

### Community 135 - "Gioco vecchio · Ultimate Team"
Cohesion: 0.21
Nodes (25): collectionScreen(), count(), cupAfter(), cupScreen(), divisionMatch(), formationRoles(), frameUT(), hub() (+17 more)

### Community 140 - "Prove · banco Tensione (vecchio)"
Cohesion: 0.15
Nodes (9): ctx, f(), fs, PAIRS, path, sheets, t, vm (+1 more)

### Community 149 - "Documenti · README"
Cohesion: 0.20
Nodes (9): Comandi, Come funziona, Crediti e licenze, Distribuzione, Fifa Tenkaichi 3 — Strike Legends, Gioco nuovo (in costruzione), Prove e misure, Stato e cose aperte (+1 more)

### Community 150 - "Documenti · CLAUDE.md"
Cohesion: 0.25
Nodes (7): Fifa Tenkaichi 3 (Strike Legends) — project facts, graphify, Players and animations, Running and checking, Technical conventions, The game, Where things are

### Community 159 - "Online · Docker nelle chat cloud"
Cohesion: 0.22
Nodes (9): secrets, file, build, secrets, ca_bundle, services, realtime, web (+1 more)

### Community 173 - "Gioco vecchio · modalità e sfide"
Cohesion: 0.44
Nodes (8): challenges(), lore(), loreReward(), myClub(), playChallenge(), quick(), sideOf(), training()

### Community 177 - "Documenti · fase 2 motore 3D"
Cohesion: 0.22
Nodes (9): Cosa non è provato, Errori trovati nel lavoro, Gioco nuovo · fase 2, motore 3D (22/10/2026), Il calciatore, Il riferimento: Mario Strikers: Battle League, Misure, Stadio, Telecamera: le prove (+1 more)

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

### Community 196 - "Prove · foto delle skill (vecchio)"
Cohesion: 0.25
Nodes (5): { chromium }, FIGURES, fs, path, [url, out, figs, only]

### Community 197 - "Gioco vecchio · dati e rose"
Cohesion: 0.25
Nodes (5): BY_ID, FIRST, LAST, LEGENDS, TILT

### Community 198 - "Gioco vecchio · partita"
Cohesion: 0.32
Nodes (4): makePlayer(), Match(), shoulderRoot(), shoulderTimeAt()

### Community 210 - "Documenti · skill 3D"
Cohesion: 0.29
Nodes (6): Animazioni: Meshy, Mixamo facoltativo, Come provare a creare un giocatore, Il primo giocatore: CH_Fulmine (26/10/2026), Provato in questa chat, Quando usarle, Skill per il gioco 3D: three.js e Blender (26/10/2026)

### Community 211 - "Configurazione · TypeScript di shared"
Cohesion: 0.29
Nodes (6): compilerOptions, lib, types, extends, include, ../../tsconfig.base.json

### Community 212 - "Configurazione · TypeScript dei banchi sim"
Cohesion: 0.29
Nodes (6): compilerOptions, lib, types, extends, include, ../../tsconfig.base.json

### Community 213 - "Distribuzione · copertina e logo"
Cohesion: 0.29
Nodes (4): { execSync }, JOBS, path, ROOT

### Community 214 - "Configurazione · TypeScript di realtime"
Cohesion: 0.33
Nodes (5): compilerOptions, types, extends, include, ../../tsconfig.base.json

### Community 218 - "Documenti · Golden Striker"
Cohesion: 0.40
Nodes (5): Cosa non è provato, Gioco nuovo · Golden Striker da Meshy e partita di prova (26/10/2026), Il file di partenza, Il gioco, Lo script (`art/CH_GoldenStriker/build/rig.py`)

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
- **6 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 698 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Strike Legends nel browser — scelte e misure fino al 21/10/2026` connect `Documenti · DETTAGLI, gioco vecchio` to `Documenti · Fulmine nel gioco`, `Documenti · fase 0 fondamenta`, `Gioco vecchio · disegno degli sprite`, `Gioco vecchio · menu, HUD e joypad`, `Gioco vecchio · audio`, `Documenti · fase 2 motore 3D`, `Partita · funzioni di geometria`, `Documenti · registro delle misure`, `Documenti · Golden Striker`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Partita · matematica identica ovunque (fmath)` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Why does `Distribuzione (19/10/2026)` connect `Documenti · DETTAGLI, gioco vecchio` to `Modelli 3D · strumenti Blender comuni`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Should `Documenti · DETTAGLI, gioco vecchio` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `push()` connect `Modelli 3D · strumenti Blender comuni` to `Documenti · DETTAGLI, gioco vecchio`, `Modelli 3D · Fulmine, corpo e vestiti`, `Modelli 3D · testa e faccia di Fulmine`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Should `Modelli 3D · Fulmine, corpo e vestiti` be split into smaller, more focused modules?**
  _Cohesion score 0.12762762762762764 - nodes in this community are weakly interconnected._