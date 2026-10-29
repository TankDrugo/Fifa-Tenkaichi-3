# Mappa del gioco

Dove sta ogni parte del gioco (Next.js e three.js, `apps/` e `packages/`) e a che punto è. Le fasi sono quelle di
`docs/PIANO-3D-ONLINE.md`, sezione 5. Il gruppo graphify è il nome con cui la parte compare in
`graphify-out/GRAPH_REPORT.md`: per esempio `graphify query "Ultimate Team carte"`.
Aggiornata al 29/10/2026 (personaggi: chat 1 dei 10).

| Parte | Dove | Stato |
|---|---|---|
| Partita | `packages/sim/src/match.ts` | fatta (fase 1) |
| IA | `packages/sim/src/ai.ts` | fatta (fase 1) |
| Skill | `packages/sim/src/skills.ts` | fatta nella simulazione, pose 3D in fase 3 |
| Tensione e Cometa | `packages/sim/src/match.ts`, `constants.ts` | fatta nella simulazione |
| Personaggi e animazioni | `apps/web/game/animation/`, `apps/web/game/render/`, `docs/PERSONAGGI.md` | in corso (fase 3): 1 dei 10 personaggi fatto |
| Stadio e grafica | `apps/web/game/render/arena.ts`, `apps/web/game/core/loop.ts` | stadio fatto (fase 2), 12 campi a tema da fare |
| Ultimate Team e carte | `packages/sim/src/data.ts` | dati fatti, schermate in fase 4, server in fase 5 |
| Interfaccia e menu | `apps/web/app/`, `apps/web/game/ui/` | pagine di prova; menu in fase 4 |
| Comandi e joypad | `apps/web/game/core/input.ts` | base fatta, profili in fase 4 |
| Audio e telecronaca | nessun file | da fare |
| Online e account | `apps/realtime/`, `packages/shared/`, `infra/` | fondamenta fatte (fase 0); fasi 5-7 da fare |
| Prove | `packages/sim/bench/`, `apps/web/scripts/`, `.github/workflows/ci.yml` | attive |

## Partita

La simulazione a 60 Hz: movimento, palla, passaggi, tiri, spallate, scivolate, portiere, gol d'oro.
È la stessa nel navigatore e sul server.

- **File:** `packages/sim/src/match.ts` (972 righe), `constants.ts` (i numeri), `types.ts`,
  `fmath.ts` (seno, coseno ed esponenziale identici su ogni macchina), `rng.ts`;
  `apps/web/game/core/driver.ts` la collega alla scena 3D.
- **Numeri:** campo 28 × 16 m, 4 giocatori più il portiere, 4 minuti, corsa 4,6 m/s, scatto ×1,35,
  spallata 7,2 m/s per 0,28 s, riserva del portiere 100 (una parata a 28 m/s costa 34).
- **Stato:** fatta. `node packages/sim/bench/browser.ts` gioca 22 partite uguali in ogni
  fotogramma in Node e in Chromium.
- **Gruppi graphify:** «Partita · simulazione (Match)», «Partita · tipi, skill e formazioni»,
  «Partita · matematica identica ovunque (fmath)», «Partita · comandi della simulazione».

## IA

Le squadre comandate dal computer: forma che segue la palla, punti di appoggio, difesa a ruoli,
tre difficoltà.

- **File:** `packages/sim/src/ai.ts` (465 righe); formazioni in `constants.ts`.
- **Numeri:** 15 ruoli presi da FC IQ, 5 formazioni (Rombo, Quadrato, Piramide, Difensivo,
  Offensivo); `node packages/sim/bench/ai_bench.ts 48 4 1` dà 5,63 gol e il 92% di passaggi riusciti.
- **Stato:** fatta.
- **Gruppi graphify:** «IA · squadra», «Partita · tipi, skill e formazioni».

## Skill

Le 9 mosse con la levetta destra: tunnel, trascinamento, finta di corpo, doppio passo, rullata,
colpo di tacco, roulette, sombrero, elastico.

- **File:** `packages/sim/src/skills.ts` (228 righe): gesti, stelle, effetto sul difensore.
- **Stato:** fatte nella simulazione; il calciatore 3D non le mostra ancora (movimenti della fase 3).
- **Gruppi graphify:** «Partita · tipi, skill e formazioni».

## Tensione e Cometa

La barra di squadra a 3 tacche: 1 tacca per il tiro caricato, 3 per il Colpo della Cometa.

- **File:** `packages/sim/src/match.ts` (la mossa speciale e i punti della barra),
  `constants.ts` (`tension`).
- **Numeri:** `node packages/sim/bench/tension_bench.ts 48` dà 0,60 Comete e 1,60 tiri caricati a partita, prima
  barra piena al minuto 3,19.
- **Stato:** fatta nella simulazione; l'effetto 3D della Cometa non c'è ancora.
- **Gruppi graphify:** «Partita · simulazione (Match)», «Prove · banchi IA e Tensione».

## Personaggi e animazioni

Come si disegna un calciatore e come si muove. I 10 personaggi di Tancredi, il loro stato e il
procedimento con Meshy stanno in `docs/PERSONAGGI.md`.

- **File:**
  - `apps/web/game/animation/`: `appearance.ts` sceglie fra pezzi e modello GLB; `rig.ts` è lo
    scheletro dei calciatori a pezzi con la corsa; `modelAppearance.ts` muove un GLB con le sue clip;
    `models.ts` elenca i GLB, ognuno con la sua tabella delle clip; `useModel.ts` li carica.
  - `apps/web/game/render/`: `parts.ts` (i pezzi del corpo), `body.ts`, `character.ts`, `faces.ts`
    (facce disegnate), `looks.ts` (stili), `players.ts` (divise; tiro o passaggio dalla simulazione).
  - Modelli: `apps/web/public/models/fulmine.glb`, `golden.glb` e `portiere1.glb`, con
    `?modello=fulmine`, `?modello=golden` o `?modello=portiere1`. Sorgenti Blender in `art/`; immagini
    dei 10 personaggi in `art/CH_Portiere1/ref/` … `art/CH_Giocatore10/ref/`.
  - Script: `apps/web/scripts/meshy.ts` (immagine, rig, clip della libreria e Text to Motion di
    Meshy), `glb.ts` (unisce le clip in un GLB, riduce texture e triangoli), `clipsheet.ts` (fogli
    di foto delle clip), `video.ts` (video di una pagina).
- **Animazioni:** tutte con Meshy, sul rig di Meshy del personaggio, dalla sua libreria (decisione di
  Tancredi, 29/10/2026); se manca una clip si chiede a Tancredi. La tabella del modello lega le clip
  agli stati fermo, camminata, corsa, tiro e passaggio; senza tabella il gioco cerca `idle`, `run`,
  `kick`.
- **Stato:** in corso (fase 3). `portiere1` ha le 5 animazioni base di Meshy e gioca su
  `/partita?modello=portiere1`; mancano gli altri 9 personaggi, i colori di squadra sui modelli con
  la divisa nella texture, e le clip di scivolata, colpo preso, spallata, palla in mano, esultanza e
  tiro caricato; 22 figure a pezzi.
- **Gruppi graphify:** «Animazioni · scheletro e pezzi del corpo», «Animazioni · calciatore a pezzi e
  facce», «Personaggi · stili e modelli GLB», «Personaggi · vetrina 3D»,
  «Modelli 3D · …» (gli script Blender di Fulmine), «Animazioni · GLB e tabella delle clip»,
  «Animazioni · API di Meshy», «Animazioni · GLB di Meshy: clip unite, texture e triangoli»,
  «Documenti · i 10 personaggi».

## Stadio e grafica

Campo, recinto elettrico, porte, tribune con la folla, luci, telecamera.

- **File:** `apps/web/game/render/arena.ts` (275 righe), `materials.ts`, `style.ts`
  (colori e telecamera); `apps/web/game/core/loop.ts` (ciclo della scena).
- **Numeri:** budget di 150 chiamate di disegno a fotogramma (piano, sezione 4.6).
- **Stato:** stadio fatto (fase 2), manca la misura sul portatile; i 12 campi a tema sono in fase 3.
- **Gruppi graphify:** «Stadio · arena e materiali», «Partita · ciclo della scena 3D».

## Ultimate Team e carte

Carte dei giocatori, rarità, pacchetti, club, collezione.

- **File:** `packages/sim/src/data.ts` (312 righe): 6 rarità (Bronzo, Argento, Oro,
  Campione, Leggenda, Mito), 4 versioni (Base, Olografica, Numerata, Oro unica), 5 pacchetti,
  150 carte, 14 club e 6 squadre leggendarie; `openPack` apre un pacchetto.
- **Stato:** dati fatti; schermate (rosa, mercato, pacchetti, obiettivi, collezione, divisioni e
  coppa) in fase 4; account, economia e mercato sul server in fase 5.
- **Gruppi graphify:** «Ultimate Team · carte, pacchetti e rarità».

## Interfaccia e menu

- **File:** pagine in `apps/web/app/`: `/partita` (due squadre dell'IA), `/prova` (un
  calciatore con la palla), `/personaggi` (vetrina), `/bench` (numeri del motore), `/status`
  (servizi). Viste React in `apps/web/game/ui/`.
- **Stato:** il menu React con navigazione da joypad è la fase 4.
- **Gruppi graphify:** «Interfaccia · pagine, HUD e impronta».

## Comandi e joypad

Tastiera e controller (Xbox, PlayStation) con la Gamepad API del browser.

- **File:** `apps/web/game/core/input.ts` (73 righe), `options.ts`.
- **Stato:** base fatta; comandi modificabili con profili in fase 4.
- **Gruppi graphify:** «Comandi · tastiera, joypad e opzioni».

## Audio e telecronaca

- **File:** nessun file; la simulazione segnala già i suoni (`Sound` in
  `packages/sim/src/types.ts`).
- **Stato:** da fare.

## Online e account

- **File:** `apps/realtime/src/server.ts` (partite su WebSocket), `packages/shared/` (messaggi
  fra navigatore e server), `apps/web/app/api/` e `apps/web/lib/checks.ts` (stato dei servizi),
  `infra/` (Docker: Postgres, Redis, web, realtime).
- **Stato:** fondamenta fatte (fase 0); account e dati fase 5, partite online fase 6, messa online
  fase 7.
- **Gruppi graphify:** «Online · …».

## Prove

- `packages/sim/bench/`: situazioni di gioco (`checks.ts`), IA, Tensione, Chromium, velocità.
- `apps/web/scripts/bench3d.ts`: budget della scena 3D (`--modello <id>` con un GLB); `clipsheet.ts` e
  `video.ts`: fogli di foto delle clip e video di una pagina; `pnpm test`: le prove dei pacchetti.
- CI in `.github/workflows/ci.yml`, a ogni pull request.
- **Gruppi graphify:** «Prove · …» (anche «Prove · fogli di foto delle clip» e «Prove · video di una
  pagina»), «Configurazione · …».
