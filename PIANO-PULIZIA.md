# Piano di pulizia — Fifa Tenkaichi 3 (29/10/2026)

> File di lavoro: si elimina alla fine (Fase 6.5). Fino alla conferma di Tancredi nessun file del
> progetto è stato modificato, spostato o eliminato; l'unico file scritto è questo.

## Decisioni di Tancredi (29/10/2026) ed esecuzione

«tutto ciò che trovi di regole è obsoleto, fidati del gioco fatto nuovo; togliamo tutte queste
regole …; godot lo abbiamo abbandonato, tutto ciò dove c'è godot non serve più».

| Punto del piano | Decisione | Fatto |
|---|---|---|
| 7.4 regole (RIMUOVERE e DA DECIDERE) | tutte tolte | `CLAUDE.md` riscritto con soli fatti tecnici; §6 e §8 di `docs/PIANO-3D-ONLINE.md` e §8, §13 di `docs/STUDIO-PERSONAGGI.md` tolti; `README.md` senza «si misura prima e dopo» |
| controllo di stile (hook `Stop`/`PostToolUse`) | tolto con le regole | **non fatto**: la modifica di `.claude/settings.json` è negata alla chat (protezione della propria configurazione); `tools/style_guard/` resta finché Tancredi non toglie i due hook |
| D1, D2, D3, 7.2 (Godot e archivio) | non servono | niente tag `godot-finale` nella repo, nessuna sezione copiata; tolti i rimandi all'archivio da `README.md`, `docs/DETTAGLI.md`, commenti di `packages/sim`. `web/js/*.js` conserva 15 commenti «archive»: è il gioco vecchio pubblicato, non toccato |
| D9 spec | vale il gioco nuovo | 4 + portiere, Tensione a 3 tacche, scritto in `CLAUDE.md` |
| 7.3 Meshy, Gamepad API | fatto | `README.md`, `CLAUDE.md`, `docs/SKILL-3D.md`, `docs/STUDIO-PERSONAGGI.md` §11 |
| 2 (`zod`), 8 (cartelle), D8 (`graphify-out/`), `DIARIO.md`, `docs/PROMPT-CELESTINI.md` | non ancora decisi | in attesa |

Prove dopo le modifiche: `pnpm install --frozen-lockfile`, `typecheck`, `lint` senza errori; `pnpm test`
39 su 39; `pnpm build` riuscito; `node packages/sim/bench/checks.ts` 11 `ok`;
`node packages/sim/bench/parity.ts` 22 partite su 22 uguali in ogni fotogramma.

## 0. Premessa: due repository, un solo progetto alla fine

| Osservazione | Appiglio | Conseguenza |
|---|---|---|
| Il prompt descrive un progetto su Windows con Vite, Godot da ripulire, HUD F3, tasti R/Invio, log di fine partita, 7 contro 7 e `piano-operativo-sviluppo.md` | questa chat lavora in un contenitore Linux nel cloud; `list_computer_folders` restituisce zero computer collegati | la cartella sul PC non è raggiungibile: il piano lavora sui due repository GitHub, come deciso da Tancredi il 29/10/2026 («lavora sia qui che su Fifa-tenkaichi-3-archivio») |
| `TankDrugo/Fifa-Tenkaichi-3` ha 679 file tracciati e **0** file Godot (`.gd`, `.tscn`, `.tres`, `.import`, `.uid`, `project.godot`) | `git ls-files` filtrato per estensione | qui non c'è nessun residuo Godot da eliminare |
| La versione Godot sta in `TankDrugo/Fifa-tenkaichi-3-archivio`, ramo `claude/awesome-clarke-clkknm`, commit `a8d9511` (19/10/2026, 1.144 file); `master` è fermo a `3114c2d` (26/09/2026, 652 file) | `README.md:198-204`, `DIARIO.md:7-8`, `git ls-tree` dei due rami | il «vecchio progetto Godot» da proteggere è `a8d9511`, non `master` |
| Il progetto non usa Vite né npm: monorepo **pnpm** (`package.json:4`, `pnpm-workspace.yaml`), Next.js 16.4.2 in `apps/web`, gioco vecchio statico in `web/` | `apps/web/package.json:8-11`, `web/index.html:308-320` | ogni «`npm install`» del prompt diventa `pnpm install --frozen-lockfile`; l'equivalente di `public/assets` è `apps/web/public/` |
| Il codice attuale cita 11 volte i documenti dell'archivio (`archive GDD.md §4.4`, `§8.4`, `PRODUCTION.md §3`, `§6.0`, `ART-BIBLE.md §4.2`, `game/systems/*.gd`, `tools/*.json`) | `packages/sim/src/constants.ts:1-4`, `packages/sim/src/match.ts:20,396,668,795,884`, `web/js/match.js:2-3`, `web/js/data.js:19-20,99,109`, `web/js/render.js:1-4` | per avere «tutto in un'unica repo» quelle sezioni vanno copiate in `docs/DETTAGLI.md` (sezione 7.2) e i commenti aggiornati, altrimenti puntano a un repository che si vuole dismettere |

**Proposta d'insieme:** l'unica repo finale è `TankDrugo/Fifa-Tenkaichi-3`, perché da `main` partono
GitHub Pages (`.github/workflows/pages.yml`) e l'exe di Windows (`tools/web_launcher/update.go`).
Dall'archivio entrano solo: il tag `godot-finale` (sezione 0.1), le informazioni citate dal codice
(sezione 7.2). Il resto dell'archivio non si copia: resta leggibile dal tag.

### 0.1 Fase 0 eseguita — punto di ripristino

| Passo | Esito | Appiglio |
|---|---|---|
| `git --version` | `git version 2.43.0` | — |
| Progetto sotto git | sì, entrambi; albero di lavoro senza modifiche, `HEAD` = `origin/main` = `f96f8c3` | `git status --short` vuoto, `git rev-parse` |
| Commit «snapshot pre-pulizia» | non creato: non c'era nulla da committare | `git status --short` vuoto |
| Branch `pulizia-progetto` | **non creato**: contraddice `CLAUDE.md:123` (vedi 7.4, contraddizione C1); si lavora su `claude/friendly-goldberg-z5nqgv` | `CLAUDE.md:123-127` |
| Tag | creati in locale: `godot-finale` su `a8d9511` (archivio), `pre-pulizia` su `f96f8c3` (questo repository) | `git tag` |
| Push dei tag | **rifiutato**: `HTTP 403` dal proxy della chat, per entrambi | uscita di `git push origin refs/tags/pre-pulizia` |
| `git status --ignored` | vuoto in entrambi i cloni (cloni nuovi, nessun `node_modules/`) | — |

Conseguenza: i punti di ripristino che esistono **su GitHub** oggi sono i rami `main` @ `f96f8c3` e
`claude/awesome-clarke-clkknm` @ `a8d9511` dell'archivio. I tag locali spariscono con il contenitore.
I file ignorati sul PC di Tancredi non sono visibili da qui: vanno controllati lì con
`git status --ignored`.

**Comandi da lanciare sul PC (Windows, percorsi tra virgolette)** per rendere i tag permanenti.
Opzione consigliata, tag `godot-finale` **dentro l'unica repo** (la storia dell'archivio entra solo
come tag, `main` non cambia):

```bash
cd "C:\percorso\Fifa-Tenkaichi-3"
git fetch https://github.com/TankDrugo/Fifa-tenkaichi-3-archivio claude/awesome-clarke-clkknm
git tag -a godot-finale FETCH_HEAD -m "Last commit with the Godot game (archive a8d9511)"
git tag -a pre-pulizia f96f8c3 -m "Snapshot before the project cleanup"
git push origin godot-finale pre-pulizia
```

Costo misurato: la storia dell'archivio pesa 169 MB (`DIARIO.md:8`). Un `git clone` completo scarica
anche i tag, quindi cresce di circa 169 MB; Pages e CI usano `actions/checkout` con profondità 1 e
non scaricano tag. Alternativa senza costo: tag solo nell'archivio (`git tag godot-finale a8d9511`
dentro il clone dell'archivio), che però lascia due repository.

## 1. File da eliminare

### 1.1 Repository principale

| Percorso | Motivo |
|---|---|
| — codice | 0 moduli irraggiungibili: 74 file `.ts/.tsx/.mjs` di `apps/` e `packages/`, tutti raggiunti dai 31 punti d'ingresso (pagine `app/**/page.tsx`, `apps/realtime/src/main.ts`, prove, `bench/`, `scripts/`); script di analisi in sola lettura `reach.mjs` |
| — asset `web/` | 0 non referenziati: 191 PNG su 191 elencati in `web/assets/sprites/sheets.json` (caricati da `web/js/render.js:146`), 2 loghi da `web/js/render.js:140`, `voice/lines.json` da `web/js/voice.js:17` |
| — asset `apps/web/public` | 0: `fulmine.glb` e `golden.glb` da `apps/web/game/models.ts:6,8` |
| — log, backup, `*_old`, `*.bak` | nessun file trovato (`git ls-files` filtrato) |
| — output di build | nessuno tracciato: `dist-web/`, `.next/`, `apps/*/dist/` sono in `.gitignore:2-6` |
| `docs/PROMPT-CELESTINI.md` e `DIARIO.md` | vedi sezione 7 (file Markdown) |

Spazio recuperabile nel repository principale: 39 KB (i due `.md`), dopo aver spostato le loro
informazioni.

### 1.2 Residui Godot (archivio, ramo `claude/awesome-clarke-clkknm` @ `a8d9511`)

Non si eliminano dall'archivio, che resta il punto di ripristino: **non entrano nell'unica repo**.

| Tipo | File | Spazio |
|---|---|---|
| `.gd` (script) | 59 | 532 KB |
| `.uid` | 59 | 1,1 KB |
| `.tres` (risorse: `game/tuning/default.tres` + 21 metadati di clip in `proofs/`) | 22 | 4,8 KB |
| `.tscn` (scene) | 8 | 1,3 KB |
| `project.godot` (`game/`, `ai_topdown/`, `proofs/sprites/godot/`) | 3 | 2,5 KB |
| `.gdshader` | 1 | 1,5 KB |
| `.import`, `.godot/`, `export_presets.cfg`, `addons/`, `.gdignore` | 0 | — |
| Cartelle intere: `game/` 145 file 2,04 MB · `ai_topdown/` 32 file 0,11 MB · `tools/launcher/` (avvio di Godot, `StrikeLegends.exe` 8,8 MB) | 183 | 10,9 MB |

### 1.3 Altro dell'archivio che non entra nell'unica repo

| Percorso | File | Spazio | Motivo |
|---|---|---|---|
| `tools/web_launcher/StrikeLegendsWeb.exe`, `strikelegends-web.zip` | 2 | 20,5 MB | output di build: li rifà `tools/build_web_dist.sh` (già nel repository principale) |
| `web/` dell'archivio | 403 | 7,8 MB | copia del gioco vecchio; 195 JSON (2,0 MB) sono uscite del render che il gioco non legge (`DIARIO.md:10-12`) |
| `diary/*.md`, `HANDOFF.md`, `ORCHESTRATION.md`, `PROMPT-*.md`, `REVIEW-PROMPT.md`, `DOSSIER.md` | 11 | 0,6 MB | note di sessione e prompt (sezione 7.1) |
| `assets_raw/`, `proofs/`, `benchmarks/` | 480 | circa 100 MB | sorgenti della catena degli sprite: vedi DUBBIO D3 |

## 2. Dipendenze da rimuovere

`npx depcheck@1.4.7` sui cinque `package.json`, poi ricerca del nome in codice, config, script e HTML.

| Pacchetto | Dove è dichiarato | Ricerca | Proposta |
|---|---|---|---|
| `zod` 4.6.7 | `apps/web/package.json:21`, `apps/realtime/package.json:15` | importato solo in `packages/shared/src/status.ts` e `packages/shared/src/realtime.ts`; nessun import in `apps/`, `infra/`, `tools/`, config, HTML | **rimuovere** dalle due app. Risparmio su disco 0 byte: `packages/shared` lo dichiara e lo installa (`packages/shared/package.json`). Verifica: `pnpm install`, `pnpm typecheck`, `pnpm build`, e la build delle due immagini Docker (`apps/*/Dockerfile` installano con `--filter "@ft3/<app>..."`, che include `packages/shared`) |
| `typescript` (radice) | `package.json:20` | peer di `typescript-eslint` usato da `eslint.config.mjs` | tenere |
| `react-dom`, `@types/react-dom` | `apps/web/package.json` | peer di `next` 16.4.2 | tenere |
| `esbuild` | `apps/realtime/package.json` | script `build` della stessa app | tenere |
| (mancanti per depcheck) `vitest`, `playwright` | — | `vitest` è in radice (`vitest.config.mts`); `playwright` è usato da `tools/skill_frames.js` e dichiarato in `apps/web` e `packages/sim` | nessuna azione |

`three`, `@react-three/fiber`, `postprocessing`, `next`, `pg`, `redis`, `ws` hanno import diretti: restano.

## 3. Animazioni

| File | Clip | Ossa reali | Origine | Usata | Caricata da |
|---|---|---|---|---|---|
| `apps/web/public/models/fulmine.glb` (5,07 MB) | `idle`, `run`, `kick` | 22, `mixamorig:Hips` … `mixamorig:RightToeBase` | Mixamo per nome delle ossa; nei fatti scheletro e clip fatti dagli script (`art/CH_Fulmine/build_hd/16_rig.py:37`, clip `art/CH_Fulmine/build/08_anim.py`) | sì, con `?modello=fulmine` | `apps/web/game/models.ts:6` → `useModel.ts:13` (`GLTFLoader`); clip per nome in `modelAppearance.ts:55-56,100` |
| `apps/web/public/models/golden.glb` (0,61 MB) | `idle`, `run`, `kick` | 22, `mixamorig:*` | mesh **Meshy** (`art/CH_GoldenStriker/ref/meshy_golden_striker.glb`); scheletro con nomi Mixamo e clip da `art/CH_GoldenStriker/build/rig.py:9-19,39` | sì, con `?modello=golden` | `models.ts:8`, come sopra |
| `art/CH_Fulmine/exports/CH_Fulmine_HD.glb` (27,9 MB) | `idle`, `kick`, `run` | 22, `mixamorig:*` | come `fulmine.glb` | no (sorgente) | `art/CH_Fulmine/exports/asset-manifest.json` |
| `art/CH_Fulmine/exports/CH_Fulmine_mixamo.fbx` (2,7 MB) | nessuna | nessuna: mesh senza scheletro da caricare su Mixamo | Mixamo (ingresso) | no | `art/CH_Fulmine/build_hd/18_mixamo.py:1-6`, `docs/SKILL-3D.md:64` |
| `art/CH_GoldenStriker/ref/meshy_golden_striker.glb` (0,28 MB) | nessuna | nessuna (0 skin) | Meshy | no (sorgente) | `art/CH_GoldenStriker/build/rig.py:5` |
| `web/assets/**/*.png` (191 fogli) | 22 clip: `celebrate`, `hit_react`, `idle`, `idle_stand`, `keeper_hold`, `keeper_roll`, `pass`, `run`, `shot`, 8 `shoulder_*`, `sprint`, `standing_tackle`, `stop`, `walk` | immagini (ossa non presenti) | rese da clip su scheletro VRoid; sorgenti Mixamo per locomozione, esultanza, colpito, passaggio, tiro, portiere (archivio `ASSETS.md:73-74,83`); spallate e contrasto in piedi costruiti da zero (archivio `ASSETS.md:80`, `PRODUCTION.md:266`) | sì | `web/js/ui.js:143`, `web/js/render.js:146` |
| archivio `assets_raw/mixamo/*.fbx` (72) | una clip per file (`Dribble`, `Sprint`, `kick soccerball`, …) | `mixamorig:Hips`, `mixamorig:Head`, … (`strings` su `Body Block.fbx`) | Mixamo | no (sorgente) | archivio `tools/retarget_mixamo.py` |
| archivio `proofs/clips/*_clip.glb` (16), `proofs/foot_slide/*_clip.glb` (5), `proofs/tackle/standing_tackle_clip.glb` | una clip (`Shot`, `StandingTackle`, …) | 95-96, `Root`, `J_Bip_C_Hips`, … (VRoid) | ritarget delle clip Mixamo o costruite da zero, come i fogli | no (ingresso del render) | archivio `tools/render_sprites.py:52` |
| archivio `assets_raw/kaykit/**/Rig_Medium_*.glb/.fbx` | `Death_A`, `Hit_A`, `Idle_A`, `PickUp`, `Throw`, … (15 in `General`) | 23, `root`, `hips`, `upperleg.l`, … | KayKit (CC0) | no | nessuno |
| archivio `assets_raw/cmu_mocap/*.bvh` (4) | una cattura per file | formato BVH | CMU | no | archivio `proofs/clip_health/` |
| archivio `assets_raw/characters/player01*.vrm`, `vroid_sample/masc_vroid.glb` | nessuna | 59, `J_Bip_*` | VRoid | no (render) | archivio `tools/render_sprites.py:52` |

Animazioni Mixamo usate oggi dal gioco: solo attraverso i 191 fogli di `web/`. Da sostituire con Meshy
in futuro: nessuna urgenza, `web/` è congelato (`CLAUDE.md:160`).

## 4. Punti legati a Mixamo

| Dove | Cosa fa | Conseguenza per clip Meshy |
|---|---|---|
| `art/CH_Fulmine/build_hd/16_rig.py:37` | `P = "mixamorig:"`: dà i nomi Mixamo alle 23 ossa | uno scheletro Meshy con altri nomi non passa da questo script |
| `art/CH_GoldenStriker/build/rig.py:39` | stesso prefisso per il Golden Striker | come sopra |
| `art/CH_Fulmine/build_hd/18_mixamo.py:1-6` | esporta l'FBX per il rig automatico di Mixamo | resta come opzione (la politica consente Mixamo) |
| `apps/web/game/modelAppearance.ts:55-56,100` | cerca le clip **per nome esatto** `idle`, `run`, `kick` | non è Mixamo, ma è un contratto di nomi: una clip Meshy con un altro nome non parte. I nomi che Meshy dà alle clip non sono verificati in questo repository |
| `docs/SKILL-3D.md:57-68` | «Animazioni: Mixamo prima di Meshy» | contraddice la politica (sezione 7.4, C6) |
| `docs/SKILL-3D.md:82`, `docs/STUDIO-PERSONAGGI.md:484` | chiedono «ossa con i nomi di Mixamo» nei GLB | regola di documento, non di codice: il codice dei modelli non legge nessun nome di osso (nessuna occorrenza di `mixamorig` in `apps/` e `packages/`) |

Assenti in `apps/` e `packages/`: retarget con `SkeletonUtils` (c'è solo `clone`, `useModel.ts:9`,
`modelAppearance.ts:12`, per copiare un modello con scheletro), `animations[0]`, clip `mixamo.com`,
scala fissa 0,01 (l'altezza viene dagli extras o dal riquadro, `modelAppearance.ts:36-41`),
rimozione di tracce delle anche. Non si riscrive nulla ora.

## 5. Stato del porting Godot → three.js

### 5.1 Traguardi del piano Godot (archivio `PRODUCTION.md`, stato in `HANDOFF.md` al 27/09/2026)

| Traguardo | Stato nel piano | Nel codice three.js (`packages/sim`, `apps/web`) |
|---|---|---|
| 1 — un giocatore, una palla, un difensore | ✅ (2.10 da togliere) | portato con valori diversi: movimento, palla, spallata in `packages/sim/src/match.ts` (tabella 5.2) |
| 2 — gli sprite | ✅ 26/09 | non portato, per scelta: il gioco nuovo disegna in 3D (`apps/web/game/parts.ts`, GLB); gli sprite vivono in `web/` |
| 3 — la squadra vista dall'alto | ✅ 23/09 | portato con un modello diverso: ruoli e posizioni da `web/js/ai.js` (`packages/sim/src/ai.ts:1-13`), non le classi `game/ai/*.gd` |
| 4 — una partita | parziale (5.4 e altri al proprietario) | portato: 4 minuti (`match.ts:140`), gol d'oro (`match.ts:100,713,923`) |
| 5 — le mosse speciali | parziale (6.2 f, 6.3 b, 6.4 al proprietario) | portato con valori diversi: Cometa e barra della Tensione a 3 tacche (`constants.ts`, `tension.notch: 100 / 3`) al posto del mana continuo (`mana_scale` 0,45) |
| 6 — il roster e lo stadio | parziale (7.3, 7.5, 7.7 al proprietario) | portato: stadio con folla in `InstancedMesh` (`apps/web/game/arena.ts:1-2`), 22 figure (`packages/sim/src/data.ts:93-105`) |

Fasi del piano three.js (`docs/PIANO-3D-ONLINE.md:221-236`), stato da `DIARIO.md`: 0 chiusa
(`DIARIO.md:166`), 1 chiusa, 2 in attesa della misura di Tancredi sul portatile, 3 in corso
(Fulmine e Golden Striker). **Non corrispondenza da segnalare:** `README.md:208` dice «fase 0 da
cominciare». Non la correggo ora.

### 5.2 File Godot con logica o dati

| File Godot | Esito | Appiglio |
|---|---|---|
| `game/tuning/tuning_config.gd` + `default.tres` | portato con valori diversi | velocità 7,0 → 4,6 m/s; accelerazione 0,15 → 0,22 s; arresto 0,23 → 0,3; spallata 9,45 m/s 0,23 s → 7,2 m/s 0,28 s; recupero 0,4 → 0,5; spinta 1,0 → 0,9; IA distanza colpo 1,5 → 1,3, attesa 5 → 11; cono passaggio 25° → 30°; parata 30 → 34, ricarica 3,0 → 0,7; scossa 0,015 → 0,012; telecamera 46°/30° → 29°/18° (`apps/web/game/style.ts:15`). Uguali: corsa ×1,35, palla (gravità 14, rimbalzo 0,65, attrito 0,55, raggio 0,11), passaggio 12, tiro 28 e 0,9 s, campo 28 × 16, porta 4,5 × 2,2, scivolata e finta, riserva 100, piano di parata 1,5 (`packages/sim/src/constants.ts:8-31`) |
| `game/systems/special_move.gd` | portato, cursore uguale | `charge_time` 0,5, `sweep_time` 0,75, bersagli 0,8 e 0,2, finestra 0,05, rallentatore 0,4 = `constants.ts:31` |
| `game/systems/ball.gd`, `juice.gd` | portato | fermo-immagine 6 fotogrammi (`match.ts:440`) |
| `game/systems/tackle.gd` (furto al tocco) | non portato | era spento anche in Godot: `touch_steal_on` 0,0 (`tuning_config.gd`; `HANDOFF.md`, «Le regole in vigore») |
| `game/ai/*.gd`, `ai_topdown/` | non portato (sostituito) | `packages/sim/src/ai.ts:1-13` |
| `game/systems/sprite_sheets.gd` (`TEAM_PRIMARY`, `LOOKS`) | portato | `packages/sim/src/data.ts:7` |
| `game/systems/game_input.gd:62` (`dev_reset`, tasto R) | non portato | nessun tasto R in `apps/web/game/input.ts` |
| `game/match.gd:1014` (scrive `match_frame_time.txt`) | non portato | nessuna scrittura di file nel gioco nuovo |
| `game/ui/tuning_panel.gd` (pannello Tab) | non portato | — |
| `game/systems/sprite_body.gd`, `bodies.gd`, `reset_rig.gd`, `palette_sprite.gdshader` | non applicabile | disegno a sprite, sostituito dal 3D |

### 5.3 Strumenti di test del prompt

| Strumento richiesto | Dove esiste | Conseguenza |
|---|---|---|
| HUD di debug F3 | in nessuno dei due repository (`grep` di `F3` / `KEY_F3`) | niente da proteggere; se serve è lavoro nuovo |
| R / Invio | solo Godot, `game_input.gd:62` (R) | come sopra |
| log di fine partita su file | solo Godot, `match.gd:1014` (tempi dei fotogrammi) | come sopra |
| strumenti esistenti da mantenere | `SL.debug` (`web/js/ui.js:454`), `tools/web_checks.js`, `ai_bench.js`, `tension_bench.js`, `skill_frames.js`, `packages/sim/bench/*`, `apps/web/scripts/bench3d.ts`, `/bench`, `/status` | restano tutti |

## 6. DUBBI (decide Tancredi)

| # | Cosa | Perché è un dubbio | Proposta |
|---|---|---|---|
| D1 | Tag `godot-finale` dentro l'unica repo (+169 MB di storia) oppure solo nell'archivio | sezione 0.1 | dentro l'unica repo: è l'unico modo per dismettere l'archivio e tenere il Godot recuperabile |
| D2 | Il repository archivio dopo il tag | eliminare un repository è fuori da questo repository (`CLAUDE.md:128`) e non posso farlo | Tancredi lo mette in sola lettura (GitHub, Settings → Archive) o lo elimina, dopo aver verificato il tag |
| D3 | Sorgenti della catena degli sprite nell'archivio: `assets_raw/` (332 file), `tools/render_sprites.py`, `retarget_mixamo.py`, `bodies.json`, `characters.json` | servono a rifare i fogli di `web/`, citati da `web/js/data.js:99,109`, `web/js/render.js:4` | non copiarli: `web/` non si rifà (`CLAUDE.md:131-132`, no a nuovi render del 20/10/2026); restano nel tag `godot-finale` |
| D4 | `art/CH_Fulmine/exports/CH_Fulmine_HD.glb` (27,9 MB) | sorgente HD, il gioco carica `fulmine.glb` da 5 MB | tenere: `asset-manifest.json` lo descrive e la fase 17 lo produce |
| D5 | `art/CH_Fulmine/exports/CH_Fulmine_mixamo.fbx` (2,7 MB) | ingresso per Mixamo, che diventa facoltativo | tenere: si rifà in pochi secondi, ma la politica consente Mixamo |
| D6 | `tools/cover/cover.html` | pagina HTML aggiuntiva | tenere: è il disegno da cui `tools/cover/render_cover.js` fa copertina e loghi |
| D7 | `art/CH_Fulmine/build/` (fasi 02-09) accanto a `build_hd/` (10-18) | sembrano due versioni | non sono alternative: `build_hd/16_rig.py:34` importa `bt` da `build/`, `rig.py` del Golden Striker usa `build/08_anim.py` |
| D8 | `graphify-out/` (15 MB, non tracciato) | `CLAUDE.md` dice che `graph.json` si committa; oggi non c'è | committare `graph.json` e `GRAPH_REPORT.md`, ignorare `graphify-out/cache/` (6,8 MB) e `graph.html` (4,1 MB) |
| D9 | Spec del gioco nel prompt contro il codice | prompt: 7 contro 7, mana a 5 livelli, leghe; codice: 4 + portiere (`README.md:3`, 5 posti per formazione `constants.ts:43-44`), Tensione a 3 tacche, nessuna lega in `packages/sim/src/data.ts` | non cambio nulla; Tancredi dice quale delle due vale |

## 7. File Markdown

### 7.1 Elenco e proposta

Repository principale (esclusi `.claude/`, `graphify-out/`, `node_modules/`):

| File | Righe | Riassunto | Proposta |
|---|---|---|---|
| `CLAUDE.md` | 206 | regole per le chat | FONDAMENTALE, da riscrivere (7.3) |
| `README.md` | 213 | struttura, comandi, distribuzione, crediti | FONDAMENTALE, da aggiornare (7.3) |
| `docs/PIANO-3D-ONLINE.md` | 279 | piano del gioco nuovo, fasi 0-7: è il piano operativo | FONDAMENTALE |
| `docs/DETTAGLI.md` | 1.331 | scelte e misure di ogni sistema | FONDAMENTALE, riceve le informazioni dell'archivio |
| `docs/STUDIO-PERSONAGGI.md` | 583 | design dei personaggi, contratto dei GLB (§11) | FONDAMENTALE, una riga da cambiare (`:484`) |
| `docs/SKILL-3D.md` | 89 | come usare le 68 skill | FONDAMENTALE, sezione Mixamo da riscrivere |
| `art/CH_Fulmine/asset-brief.md` | 63 | scheda del modello CH_Fulmine | FONDAMENTALE (specifica non presente altrove) |
| `apps/web/AGENTS.md` | 9 | blocco che `next dev` riscrive | FONDAMENTALE: cancellato, `next dev` lo ricrea (`AGENTS.md:4`) |
| `docs/PROMPT-CELESTINI.md` | 163 | prompt per le immagini di 10 giocatori | DA ELIMINARE dopo averlo spostato in `STUDIO-PERSONAGGI.md` §12 (dove sta il prompt di Fulmine); nessun file lo cita |
| `DIARIO.md` | 464 | note di sessione | DA ELIMINARE dopo l'estrazione (7.2); contraddizione C3 |

Archivio (nessuno entra come file; da qui si estrae solo quello che dice 7.2): `GDD.md`, `ART-BIBLE.md`,
`PRODUCTION.md` (design e valori), `TDD.md` (architettura Godot), `RESEARCH.md` (valori ricavati dai
giochi di riferimento), `ASSETS.md`, `LIBRARY.md`, `assets_raw/SOURCES.md` (provenienze e licenze),
`DOSSIER.md`, `HANDOFF.md`, `ORCHESTRATION.md`, `PROMPT-FINE-GIOCO.md`, `REVIEW-PROMPT.md`,
`benchmarks/*.md` (4), `proofs/**/*.md` (3), `diary/*.md` (5), `web/PROMPT-WEB*.md` (2),
`web/README.md` (già copiato come `docs/DETTAGLI.md`, `DETTAGLI.md:3`), `CLAUDE.md` (regole Godot e
dei cinque ruoli).

### 7.2 Informazioni da spostare

| Da | Cosa | Dove |
|---|---|---|
| archivio `GDD.md` §2 (righe 23-41), §4.4 (173-269), §8.4 (373-409) | regole del campo chiuso, risoluzione del contrasto senza dadi, riserva di parata | `docs/DETTAGLI.md`, sezione nuova «Regole del gioco (dal GDD Godot)»; i commenti `archive GDD.md §…` in `packages/sim/src/*.ts` e `web/js/*.js` puntano lì |
| archivio `PRODUCTION.md` §3 SP2-SP5, §6.0 (907-959) | traiettoria delle anche nelle spallate, mossa speciale | `docs/DETTAGLI.md`, stessa sezione |
| archivio `ART-BIBLE.md` §4.2 (125-142) | divise: seconda maglia sotto i 90° di tinta | `docs/DETTAGLI.md`, stessa sezione |
| archivio `HANDOFF.md`, «Le regole in vigore» | decisioni del proprietario (IA senza colpi, furto al tocco spento, rallentamento 60% per 1,0 s) | stessa sezione, con data 27/09/2026 |
| `DIARIO.md` | stato delle fasi, «resta» di ogni voce (es. `DIARIO.md:262`, `:422`, `:462`), commit dove sta lavoro non arrivato su `main` (`CLAUDE.md:126-127`) | `README.md`, sezione «Stato e cose aperte» al posto di «Cose aperte» |
| `docs/PROMPT-CELESTINI.md` | blocchi dei prompt | `docs/STUDIO-PERSONAGGI.md` §12 |

Non si salvano: cronologia delle sessioni, istruzioni Godot (`TDD.md`, `tools/cloud_setup.sh`),
procedure che obbligano a Mixamo (`docs/SKILL-3D.md:57-68` si riscrive, non si sposta).

### 7.3 Aggiornamenti tecnici da fare nei fondamentali

- `README.md` e `CLAUDE.md`: motore three.js (Next.js + `@react-three/fiber`); Godot e GDScript
  solo come storia; nota «il vecchio progetto Godot è recuperabile dal tag git `godot-finale`».
- Controller Xbox tramite la Gamepad API del browser (`navigator.getGamepads`, `web/js/input.js`,
  `apps/web/game/input.ts`).
- Politica animazioni: nuove animazioni con Meshy; Mixamo consentito, non obbligatorio; nessun
  codice nuovo presume uno scheletro Mixamo; le clip Mixamo già usate restano; obiettivo futuro
  (non ora): clip Meshy accettate senza i nomi Mixamo. Si applica a `docs/SKILL-3D.md:57-68,82` e
  `docs/STUDIO-PERSONAGGI.md:484` («scheletro facoltativo; nomi delle ossa liberi; clip chiamate
  `idle`, `run`, `kick`», che è quello che il codice legge davvero).
- Struttura delle cartelle aggiornata (sezione 8).
- Le fasi di `docs/PIANO-3D-ONLINE.md` restano identiche: obiettivi, ordine e stato non si toccano.

### 7.4 Regole per l'agente

**RIMUOVERE** (limitano come o quanto si lavora):

| Testo | Dove | Motivo |
|---|---|---|
| «**One task per session**, closed and pushed before the next» | `CLAUDE.md:105` | una cosa alla volta |
| «Una fase per chat» | `docs/PIANO-3D-ONLINE.md:223` | una milestone alla volta; le fasi restano come roadmap |
| «fai la successiva, solo quella» | `docs/PIANO-3D-ONLINE.md:274-275` | come sopra |
| «**Session economy.** … read slices …, never a whole document …» | `CLAUDE.md:193-195` | limite su quanto leggere |
| «Remind Tancredi of them when a task fits» | `CLAUDE.md:140` | istruzione di comportamento; l'elenco delle skill resta come fatto |
| «Closing a session: Append an entry to the end of `DIARIO.md`» | `CLAUDE.md:186` | note di sessione (C3) |

**MANTENERE** (specifiche del gioco e fatti tecnici):

| Testo | Dove |
|---|---|
| «**Interface text** is Italian» | `CLAUDE.md:177` |
| «Every explanation addressed to Tancredi: **Italian**» | `CLAUDE.md:12` |
| «**TypeScript**: relative imports carry the `.ts` extension and `erasableSyntaxOnly` is on» | `CLAUDE.md:175-176` |
| «**Frames per second** are measured by Tancredi on his laptop» | `CLAUDE.md:180-181` |
| «**Running the stack**» (Docker, `check-status.mjs`, certificato) | `CLAUDE.md:165-171` |
| «**Where**: `apps/web` …, `apps/realtime` …, `packages/shared` …» | `CLAUDE.md:158-160` |
| sezione «Skills for 3D work» come elenco di fatti (dove stanno, CH_Fulmine, Blender nel cloud) | `CLAUDE.md:134-155` |
| sezione graphify | `CLAUDE.md:197-206` e `.claude/CLAUDE.md` (intatta) |
| specifiche di gioco da aggiungere, oggi assenti da `CLAUDE.md`: club e giocatori inventati, nessun giocatore reale (`README.md:192-193`), carte e rarità (`packages/sim/src/data.ts:113`), priorità alla fisica fluida (partita a 60 Hz, `README.md:31`), formato a squadre e barra speciale secondo la risposta a D9 | — |

**DA DECIDERE** (limitano il lavoro ma proteggono, o sono convenzioni con un motivo):

| Testo | Dove | Cosa protegge |
|---|---|---|
| «**Ask before** deleting files, creating repositories or anything outside this repository» | `CLAUDE.md:128-130`; doppione in `PIANO-3D-ONLINE.md:252` (servizi a pagamento) | perdite di file e spese |
| «**Measure before and after** every change …» | `CLAUDE.md:106-110` | regressioni del bilanciamento (12 partite oscillano di un gol) |
| «**Try it in a browser** before publishing» | `CLAUDE.md:111-113` | rotture visibili solo nel navigatore |
| «**Ship only what works**»; doppione «Si spediscono solo cose provate» | `CLAUDE.md:114-115`; `PIANO-3D-ONLINE.md:246` | come sopra |
| «**Checks before every push**: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`» | `CLAUDE.md:161-164` | CI rossa (`.github/workflows/ci.yml`) |
| «**Versions** are exact … A new library comes with its reason …» | `CLAUDE.md:172-174` | build ripetibili |
| «An image tag must list both `amd64` and `arm64`» | `CLAUDE.md:173-174` | immagini che non partono sul server arm64 |
| «Never `git add -A`. If a push is rejected, stop and say so instead of forcing it.» | `CLAUDE.md:190-191` | commit di file estranei, storia riscritta |
| «`web/` is the old game and is never edited for the new one»; doppione «`web/` non si modifica» | `CLAUDE.md:160`; `PIANO-3D-ONLINE.md:245` | il gioco che gli amici usano oggi (Pages + exe) |
| «**Publish** in two places …» (PR su `main`, artifact) | `CLAUDE.md:116-122`, `:178-179` | Pages e exe leggono da `main` |
| «Code, comments, identifiers, commit messages: **English**» | `CLAUDE.md:8-9` | convenzione con motivo (API in inglese) |
| «**Analysis output format** observation -> anchor -> consequence» e il controllo di stile | `CLAUDE.md:14-101` | legata a due hook in `.claude/settings.json` e a `tools/style_guard/`: togliere la regola dal testo non spegne gli hook, che restano (`.claude/` non si tocca) |
| «**Animations** come from the sheets that exist … no to new Blender renders» | `CLAUDE.md:131-132` | vale per `web/`; vedi C5 |

**Contraddizioni** (le due versioni e la proposta):

| # | Versione A | Versione B | Proposta |
|---|---|---|---|
| C1 | prompt, Fase 0: «crea il branch `pulizia-progetto`» | `CLAUDE.md:123`: «only `main` and the branch of the chat at work exist» | B: il lavoro resta su `claude/friendly-goldberg-z5nqgv`; un ramo in più va poi cancellato da GitHub, perché `git push --delete` dà 403 (`CLAUDE.md:125-126`) |
| C2 | prompt, Fase 6.5: «Non fare il merge del branch» | `CLAUDE.md:116-118,178`: la pull request si fonde su `main` | A per questo lavoro: apro la pull request senza fonderla |
| C3 | prompt, Fase 3: note di sessione da eliminare | `CLAUDE.md:186`: ogni sessione aggiunge una voce a `DIARIO.md` | A, con lo stato spostato in `README.md` (7.2); `PIANO-3D-ONLINE.md:4,223,273,277` cambiano da «cerca in `DIARIO.md`» a «leggi `README.md`, Stato» |
| C4 | prompt, Fase 0.2: `git add -A` | `CLAUDE.md:190-191`: «Never `git add -A`» | nessun conflitto reale: la Fase 0.2 vale solo per un progetto senza git |
| C5 | politica: nuove animazioni con Meshy | `CLAUDE.md:131-132`: animazioni solo dai fogli esistenti | entrambe, con ambiti diversi: B vale per `web/`, A per il gioco nuovo; la frase si riscrive dicendolo |
| C6 | politica: Meshy per le nuove, Mixamo facoltativo | `docs/SKILL-3D.md:57,67-68`: «provare prima Mixamo» | A |

## 8. Nuova struttura delle cartelle

La struttura di partenza del prompt (`src/core`, `src/gameplay`, …) è pensata per un progetto Vite a
pacchetto unico. Qui logica e IA stanno già in un pacchetto separato (`packages/sim`, 11 file, girato
anche da server e banchi), quindi la proposta si limita alla cartella piatta `apps/web/game/` (33 file,
3.119 righe), divisa secondo i gruppi del grafo degli import.

| Vecchio percorso | Nuovo percorso |
|---|---|
| `apps/web/game/{loop,driver,options,input,practice,practice.test,stats}.ts` | `apps/web/game/core/` |
| `apps/web/game/{rig,rig.test,appearance,appearance.test,modelAppearance,pieceAppearance,models,useModel}.ts` | `apps/web/game/animation/` |
| `apps/web/game/{arena,materials,parts,shapes,faces,looks,style,body,character,players,showroom}.ts` | `apps/web/game/render/` |
| `apps/web/game/{MatchView,ShowroomView,Stage,ShowroomStage}.tsx` | `apps/web/game/ui/` |
| `packages/sim/src/*` (gameplay + IA) | invariato |
| `apps/web/public/models/` | invariato (2 file; spostarlo in `public/assets/models` cambia gli URL in `models.ts:6,8` senza altro effetto) |
| `web/`, `tools/`, `art/`, `infra/`, `docs/` | invariati: `web/` e `tools/` sono citati da Pages, exe e CI con percorsi fissi (`.github/workflows/pages.yml`, `tools/web_launcher/update.go`) |
| `DIARIO.md`, `docs/PROMPT-CELESTINI.md` | eliminati dopo 7.2 |

Costo stimato: circa 60 righe di import da aggiornare (`apps/web/game/*` e 6 pagine con `@/game/…`).
Le prove restano trovate: `vitest.config.mts:6` include `apps/web/game/**/*.test.ts`. Raccomandazione:
farla, perché divide 33 file in quattro gruppi che il grafo degli import già separa (i 4 `.tsx` sono
importati solo dalle pagine).

Nota per graphify: salta le cartelle di nome `build` (`_SKIP_DIRS` di `graphify.detect`), quindi
`art/CH_Fulmine/build/` e `art/CH_GoldenStriker/build/` non entrano nel grafo; e 278 dei 379 file
analizzati oggi stanno in `.claude/skills/`. Un file `.graphifyignore` (sintassi gitignore, letto da
`graphify.detect`) con `.claude/skills/` terrebbe il grafo sul gioco: è un file nuovo, quindi aspetta
la conferma.

## 9. Ordine di esecuzione (Fase 5, solo le parti confermate)

1. Sul PC di Tancredi: i comandi di 0.1 (tag `godot-finale` e `pre-pulizia` su GitHub).
2. **a) Godot:** nessun file da togliere nel repository principale; il passo si riduce alla verifica
   che il tag esista (`git ls-remote --tags origin`). Commit: nessuno.
3. **b) Codice e asset inutilizzati:** nessuno trovato. Commit: nessuno.
4. **c) Dipendenze:** `zod` fuori da `apps/web` e `apps/realtime`, `pnpm install`, poi le cinque
   prove di `CLAUDE.md:161-164`. Commit dedicato.
5. **d) Markdown:** sezioni dell'archivio in `docs/DETTAGLI.md`; commenti `archive …` nel codice
   aggiornati; stato in `README.md`; prompt in `STUDIO-PERSONAGGI.md`; eliminazione di `DIARIO.md` e
   `docs/PROMPT-CELESTINI.md`; riscrittura di `CLAUDE.md`, `README.md`, `docs/SKILL-3D.md`,
   `docs/PIANO-3D-ONLINE.md:4,223,273-277` secondo le risposte di 7.4; `.gitignore` con
   `graphify-out/cache/` e `graphify-out/graph.html` (D8). Commit dedicato.
6. **e) Cartelle:** `git mv` di 8; aggiornamento degli import; `grep -ri` dei vecchi percorsi a zero
   risultati; `pnpm typecheck`, `lint`, `test`, `build`. Commit dedicato.
7. `graphify update .` (sintassi verificata: `graphify update <path>`, solo AST, senza LLM) e
   controllo dei moduli orfani con lo script di raggiungibilità.
8. Fase 6: `pnpm build`; `next start` e richiesta HTTP di ogni asset vivo (pagine, `/models/*.glb`,
   `web/` con un server statico); Playwright su `/partita`, `/prova?modello=golden` e `web/` con un pad
   finto (`navigator.getGamepads` sostituito); WebGL qui è software (`CLAUDE.md:180-181`).
9. Eliminazione di questo file, commit «progetto snellito – solo Three.js», push, pull request
   **senza** merge (C2).
