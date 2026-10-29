# Mappa del gioco

Dove sta ogni parte del gioco, nel gioco nuovo (Next.js e three.js, `apps/` e `packages/`) e nel
gioco vecchio (`web/`, quello pubblicato oggi), e a che punto è. Le fasi sono quelle di
`docs/PIANO-3D-ONLINE.md`, sezione 5. Il gruppo graphify è il nome con cui la parte compare in
`graphify-out/GRAPH_REPORT.md`: per esempio `graphify query "Ultimate Team carte"`.
Aggiornata al 29/10/2026.

| Parte | Gioco nuovo | Stato nel gioco nuovo |
|---|---|---|
| Partita | `packages/sim/src/match.ts` | fatta (fase 1) |
| IA | `packages/sim/src/ai.ts` | fatta (fase 1) |
| Skill | `packages/sim/src/skills.ts` | fatta nella simulazione, pose 3D in fase 3 |
| Tensione e Cometa | `packages/sim/src/match.ts`, `constants.ts` | fatta nella simulazione |
| Personaggi e animazioni | `apps/web/game/animation/`, `apps/web/game/render/` | in corso (fase 3) |
| Stadio e grafica | `apps/web/game/render/arena.ts`, `apps/web/game/core/loop.ts` | stadio fatto (fase 2), 12 campi a tema da fare |
| Ultimate Team e carte | `packages/sim/src/data.ts` | dati fatti, schermate in fase 4, server in fase 5 |
| Interfaccia e menu | `apps/web/app/`, `apps/web/game/ui/` | pagine di prova; menu in fase 4 |
| Comandi e joypad | `apps/web/game/core/input.ts` | base fatta, profili in fase 4 |
| Audio e telecronaca | nessun file | da fare |
| Online e account | `apps/realtime/`, `packages/shared/`, `infra/` | fondamenta fatte (fase 0); fasi 5-7 da fare |
| Prove e distribuzione | `packages/sim/bench/`, `apps/web/scripts/`, `tools/`, `.github/workflows/` | attive |

## Partita

La simulazione a 60 Hz: movimento, palla, passaggi, tiri, spallate, scivolate, portiere, gol d'oro.
È la stessa nel navigatore e sul server.

- **Gioco nuovo:** `packages/sim/src/match.ts` (972 righe), `constants.ts` (i numeri), `types.ts`,
  `fmath.ts` (seno, coseno ed esponenziale identici su ogni macchina), `rng.ts`;
  `apps/web/game/core/driver.ts` la collega alla scena 3D.
- **Gioco vecchio:** `web/js/match.js` (1.028 righe).
- **Numeri:** campo 28 × 16 m, 4 giocatori più il portiere, 4 minuti, corsa 4,6 m/s, scatto ×1,35,
  spallata 7,2 m/s per 0,28 s, riserva del portiere 100 (una parata a 28 m/s costa 34).
- **Stato:** fatta. `node packages/sim/bench/parity.ts` gioca 22 partite uguali in ogni fotogramma
  al gioco vecchio.
- **Gruppi graphify:** «Partita · simulazione (Match)», «Partita · tipi della simulazione»,
  «Partita · matematica identica ovunque (fmath)», «Partita · giocatore umano».

## IA

Le squadre comandate dal computer: forma che segue la palla, punti di appoggio, difesa a ruoli,
tre difficoltà.

- **Gioco nuovo:** `packages/sim/src/ai.ts` (465 righe); formazioni in `constants.ts`.
- **Gioco vecchio:** `web/js/ai.js` (448 righe).
- **Numeri:** 15 ruoli presi da FC IQ, 5 formazioni (Rombo, Quadrato, Piramide, Difensivo,
  Offensivo); `node packages/sim/bench/ai_bench.ts 48 4 1` dà 5,63 gol e il 92% di passaggi riusciti.
- **Stato:** fatta.
- **Gruppi graphify:** «IA · squadra (nuovo)», «Partita · formazioni, ruoli e skill».

## Skill

Le 9 mosse con la levetta destra: tunnel, trascinamento, finta di corpo, doppio passo, rullata,
colpo di tacco, roulette, sombrero, elastico.

- **Gioco nuovo:** `packages/sim/src/skills.ts` (228 righe): gesti, stelle, effetto sul difensore.
- **Gioco vecchio:** `web/js/skills.js` (221 righe), con le pose `POSE` sui fogli degli sprite.
- **Stato:** fatte nella simulazione; il calciatore 3D non le mostra ancora (movimenti della fase 3).
- **Gruppi graphify:** «Partita · formazioni, ruoli e skill».

## Tensione e Cometa

La barra di squadra a 3 tacche: 1 tacca per il tiro caricato, 3 per il Colpo della Cometa.

- **Gioco nuovo:** `packages/sim/src/match.ts` (la mossa speciale e i punti della barra),
  `constants.ts` (`tension`).
- **Gioco vecchio:** `web/js/match.js`.
- **Numeri:** `node tools/tension_bench.js 48` dà 0,60 Comete e 1,60 tiri caricati a partita, prima
  barra piena al minuto 3,19.
- **Stato:** fatta nella simulazione; l'effetto 3D della Cometa non c'è ancora.
- **Gruppi graphify:** «Partita · simulazione (Match)», «Prove · banchi IA e Tensione (nuovo)».

## Personaggi e animazioni

Come si disegna un calciatore e come si muove.

- **Gioco nuovo:**
  - `apps/web/game/animation/`: `appearance.ts` sceglie fra pezzi e modello GLB; `rig.ts` è lo
    scheletro dei calciatori a pezzi con la corsa; `modelAppearance.ts` muove un GLB con le sue clip;
    `models.ts` elenca i GLB; `useModel.ts` li carica.
  - `apps/web/game/render/`: `parts.ts` (i pezzi del corpo), `body.ts`, `character.ts`, `faces.ts`
    (facce disegnate), `looks.ts` (stili), `players.ts` (divise).
  - Modelli: `apps/web/public/models/fulmine.glb` e `golden.glb`, con `?modello=fulmine` o
    `?modello=golden`. Sorgenti Blender in `art/`.
- **Gioco vecchio:** fogli degli sprite in `web/assets/` (191 png), disegnati da `web/js/render.js`.
- **Animazioni:** il gioco cerca le clip per nome: `idle`, `run`, `kick`. Le nuove si fanno con Meshy;
  Mixamo si può usare, non è obbligatorio. Dettagli in `docs/SKILL-3D.md` e
  `docs/STUDIO-PERSONAGGI.md`, sezione 11.
- **Stato:** in corso (fase 3). Ci sono corsa, tiro e fermo; mancano scivolata, colpo preso,
  spallata, palla in mano, esultanza e tiro caricato; 22 figure a pezzi.
- **Gruppi graphify:** «Animazioni · scheletro e pezzi del corpo», «Animazioni · calciatore a pezzi e
  facce», «Personaggi · aspetto e modelli GLB», «Personaggi · caricamento GLB e vetrina 3D»,
  «Modelli 3D · …» (gli script Blender di Fulmine).

## Stadio e grafica

Campo, recinto elettrico, porte, tribune con la folla, luci, telecamera.

- **Gioco nuovo:** `apps/web/game/render/arena.ts` (275 righe), `materials.ts`, `style.ts`
  (colori e telecamera); `apps/web/game/core/loop.ts` (ciclo della scena).
- **Gioco vecchio:** `web/js/render.js`, con i 12 campi a tema (`THEMES`).
- **Numeri:** budget di 150 chiamate di disegno a fotogramma (piano, sezione 4.6).
- **Stato:** stadio fatto (fase 2), manca la misura sul portatile; i 12 campi a tema sono in fase 3.
- **Gruppi graphify:** «Stadio · arena e materiali», «Partita · ciclo della scena 3D».

## Ultimate Team e carte

Carte dei giocatori, rarità, pacchetti, club, collezione.

- **Gioco nuovo:** `packages/sim/src/data.ts` (312 righe): 6 rarità (Bronzo, Argento, Oro,
  Campione, Leggenda, Mito), 4 versioni (Base, Olografica, Numerata, Oro unica), 5 pacchetti,
  150 carte, 14 club e 6 squadre leggendarie; `openPack` apre un pacchetto.
- **Gioco vecchio:** `web/js/ut.js` (425 righe: rosa, mercato, pacchetti, obiettivi, collezione,
  divisioni e coppa), `web/js/data.js`, `web/js/career.js` (carriera).
- **Stato:** dati fatti; schermate in fase 4; account, economia e mercato sul server in fase 5.
- **Gruppi graphify:** «Ultimate Team · carte, pacchetti e rarità», «Gioco vecchio · Ultimate Team».

## Interfaccia e menu

- **Gioco nuovo:** pagine in `apps/web/app/`: `/partita` (due squadre dell'IA), `/prova` (un
  calciatore con la palla), `/personaggi` (vetrina), `/bench` (numeri del motore), `/status`
  (servizi). Viste React in `apps/web/game/ui/`.
- **Gioco vecchio:** `web/js/ui.js` (schermate, HUD, pausa), `modes.js` (amichevole, sfide,
  leggendarie, allenamento), `settings.js` (impostazioni, prova joypad), `career.js`.
- **Stato:** il menu React con navigazione da joypad è la fase 4.
- **Gruppi graphify:** «Interfaccia · pagine e HUD (nuovo)», «Gioco vecchio · menu, HUD e joypad».

## Comandi e joypad

Tastiera e controller (Xbox, PlayStation) con la Gamepad API del browser.

- **Gioco nuovo:** `apps/web/game/core/input.ts` (73 righe), `options.ts`.
- **Gioco vecchio:** `web/js/input.js` (225 righe): profili Xbox, PS4, PS5, tasti registrati a mano.
- **Stato:** base fatta; comandi modificabili con profili in fase 4.
- **Gruppi graphify:** «Comandi · tastiera, joypad e opzioni (nuovo)».

## Audio e telecronaca

- **Gioco nuovo:** nessun file; la simulazione segnala già i suoni (`Sound` in
  `packages/sim/src/types.ts`).
- **Gioco vecchio:** `web/js/audio.js` (effetti), `web/js/voice.js` (53 frasi in italiano).
- **Stato:** da fare.
- **Gruppi graphify:** «Gioco vecchio · audio», «Gioco vecchio · telecronaca».

## Online e account

- **Gioco nuovo:** `apps/realtime/src/server.ts` (partite su WebSocket), `packages/shared/` (messaggi
  fra navigatore e server), `apps/web/app/api/` e `apps/web/lib/checks.ts` (stato dei servizi),
  `infra/` (Docker: Postgres, Redis, web, realtime).
- **Stato:** fondamenta fatte (fase 0); account e dati fase 5, partite online fase 6, messa online
  fase 7.
- **Gruppi graphify:** «Online · …».

## Prove e distribuzione

- **Prove del gioco nuovo:** `packages/sim/bench/` (parità, IA, Tensione, Chromium, velocità),
  `apps/web/scripts/bench3d.ts` (budget della scena), `pnpm test` (39 prove).
- **Prove del gioco vecchio:** `tools/web_checks.js`, `ai_bench.js`, `tension_bench.js`,
  `skill_frames.js`.
- **Distribuzione:** sito su GitHub Pages (`.github/workflows/pages.yml`), exe per Windows
  (`tools/web_launcher/`), zip per itch.io (`tools/build_web_dist.sh`); CI in
  `.github/workflows/ci.yml`.
- **Gruppi graphify:** «Prove · …», «Distribuzione · …», «Configurazione · …».
