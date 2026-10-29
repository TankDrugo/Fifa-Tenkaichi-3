# Fifa Tenkaichi 3 — Strike Legends

Calcio arcade 4 contro 4 nel browser, in 3D: un portiere e quattro giocatori per parte su un campo
chiuso di 28 × 16 m, niente falli né rimesse, la palla si ruba di spallata o in scivolata. Si gioca
con la tastiera o con un joypad (Xbox e PlayStation) letto con la Gamepad API del browser. Il gioco
è in costruzione secondo `docs/PIANO-3D-ONLINE.md`; nel codice il nome resta `strikelegends`.

- **In locale:** `pnpm install`, poi `pnpm --filter @ft3/web dev` e http://localhost:3000.
- **Con tutti i servizi** (Docker Desktop avviato): `cd infra && docker compose up --build`, poi
  http://localhost:3000/status mostra web, realtime, Postgres e Redis collegati. `Ctrl+C` ferma
  tutto; `docker compose down --volumes` cancella anche i dati di prova.

`docs/MAPPA.md` dice dove sta ogni parte del gioco e a che punto è (in versione da guardare su
https://claude.ai/artifact/Q9NV9YFRAeAf37SnTJQM47); `docs/DETTAGLI.md` le scelte, le fonti e le
misure; `CLAUDE.md` i fatti tecnici per le chat. La cronologia delle sessioni fino al 29/10/2026 è
`DIARIO.md` nella storia git (`git show f96f8c3:DIARIO.md`).

Il motore è three.js con `@react-three/fiber`, in Next.js. Il gioco vecchio (sprite in WebGL, in
`web/`) e la versione Godot sono stati tolti il 29/10/2026: il gioco vecchio resta nella storia git
al commit `53f3868`.

## Struttura

| Percorso | Cosa |
|---|---|
| `apps/web` | Next.js: pagine e API. `/partita` due squadre dell'IA in 3D, `/prova` un calciatore solo con la palla, `/personaggi` la vetrina, `/bench` i numeri del motore, `/status` i servizi |
| `apps/web/game/` | la partita in 3D: `core/` ciclo, comandi, opzioni; `animation/` aspetto dei giocatori, scheletro, modelli GLB e clip; `render/` stadio, pezzi, facce, materiali; `ui/` viste React |
| `apps/web/public/models/` | i modelli GLB dei giocatori, scelti con `?modello=<id>` |
| `apps/realtime` | server delle partite: `/health` e WebSocket `/ws` |
| `packages/sim` | la simulazione in TypeScript (partita, IA, skill, carte), la stessa nel navigatore e sul server; `bench/` le prove e i banchi |
| `packages/shared` | schemi condivisi fra navigatore e server |
| `infra/` | `docker-compose.yml` (Postgres, Redis, web, realtime), `check-status.mjs`; `docker-compose.cloud.yml` solo per le chat cloud |
| `art/` | sorgenti Blender dei giocatori (CH_Fulmine, Golden Striker) |
| `docs/` | mappa, piano, scelte e misure, studio dei personaggi, skill 3D |
| `.github/workflows/ci.yml` | a ogni pull request: tipi, lint, prove, simulazione in Node e in Chromium, scena 3D, immagini amd64 e arm64, compose |

## Comandi

| Azione | Tastiera | Joypad |
|---|---|---|
| muoversi · scatto | WASD o frecce · Shift | levetta sinistra o croce · RT |
| passaggio | J | A |
| tiro (tieni per caricare) · senza palla spallata | K | X |
| finta · senza palla scivolata | L | B |
| modificatore (passaggio alto, pallonetto) | U | LB |
| cambia giocatore | Q | RB |
| Tensione: 1 tacca tiro caricato, 3 tacche Colpo della Cometa | Spazio | Y |
| skill | — | levetta destra |

## Come funziona la partita

- **Ritmo.** Corsa 4,6 m/s, scatto ×1,35; il campo si attraversa in circa 6 s.
- **Passaggi.** Assistito, Semi (predefinito), Manuale, come in EA FC; il compagno a cui passi corre
  da solo incontro alla palla.
- **Spallata e scivolata.** La spallata va a 7,2 m/s per 0,28 s; chi ha appena preso palla è
  protetto 0,8 s; il portiere non si colpisce mai.
- **Portiere.** Ha una riserva di parata (100): ogni tiro parato la consuma secondo la velocità (34
  a 28 m/s), si ricarica quando la palla è nell'altra metà.
- **Tensione.** Barra di squadra a 3 tacche: si carica battendo l'avversario (dal 3° passaggio di
  fila, intercetti, spallate e scivolate vinte, parate, gol subiti). 1 tacca: tiro caricato, che
  costa al portiere il doppio della riserva. 3 tacche, nella metà avversaria: Colpo della Cometa, due
  finestre a tempo, vale 2 gol con 2 su 2; una spallata lo ferma mentre si carica. Piena, la barra
  resta piena 20 s, poi scende a 2 tacche.
- **Skill.** 9 skill con le stelle di EA FC 25 (tunnel, trascinamento, finta di corpo, doppio
  passo, rullata, colpo di tacco, roulette, sombrero, elastico); le stelle dei giocatori stanno
  sulle carte. Un difensore dell'IA abbocca con probabilità 0,35 + 0,1 × stelle.
- **Ruoli e IA.** 15 ruoli presi da FC IQ, con familiarità dalle statistiche della carta; forma che
  segue il pallone, punti di appoggio, spazio come tempo, minaccia della posizione, difesa a ruoli,
  tre difficoltà dal tempo di reazione; fonti in `docs/DETTAGLI.md`, «IA».
- **Carte.** 150 carte in 6 rarità e 4 versioni, 5 pacchetti, 14 club e 6 squadre leggendarie
  (`packages/sim/src/data.ts`); le schermate di Ultimate Team arrivano con la fase 4.

## Personaggi e animazioni

I giocatori sono pezzi costruiti nel codice (`apps/web/game/render/parts.ts`) oppure modelli GLB in
`apps/web/public/models/`, scelti con `?modello=<id>` (`apps/web/game/animation/models.ts`). Il gioco
lega le clip di ogni GLB agli stati del gioco con una tabella per modello (fermo, camminata, corsa,
tiro, passaggio, in `models.ts`) e non legge i nomi delle ossa. Tutte le animazioni si fanno con
Meshy, sul rig di Meshy del personaggio, dalla sua libreria di animazioni: i 10 personaggi, i passi
e gli script sono in `docs/PERSONAGGI.md`. I due modelli più vecchi (CH_Fulmine e Golden Striker)
hanno ossa con i nomi di Mixamo e clip fatte nel codice, e restano così.

## Prove e misure

Dalla radice del repository, gli stessi passi della CI: `pnpm install --frozen-lockfile`,
`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Poi:

| Comando | Cosa dà |
|---|---|
| `node packages/sim/bench/checks.ts` | 11 situazioni di gioco, ognuna col numero che deve dare (portiere, passaggi, gesti delle skill, duello delle skill, ruoli) |
| `node packages/sim/bench/ai_bench.ts 48 4 1` | partite fra IA: 5,63 gol, 10,4 cambi al minuto, 92% di passaggi riusciti (21/10/2026); su 12 partite i gol oscillano di ±1, le differenze piccole si misurano su 48 o 96 |
| `node packages/sim/bench/tension_bench.ts 48` | Comete 0,60 a partita, tiri caricati 1,60, prima barra piena al minuto 3,19 |
| `node packages/sim/bench/browser.ts` | 22 partite in Node e in Chromium, stessa impronta |
| `node packages/sim/bench/speed.ts 3` | partite a 60 Hz che un core regge: circa 2.000 nella chat cloud |
| `node apps/web/scripts/bench3d.ts http://localhost:3000` | budget di disegno della scena e partita della simulazione a schermo; con `--photos` rifà le foto di `docs/fase2/` |

http://localhost:3000/bench mostra fotogrammi al secondo, tempo per fotogramma, l'1% dei fotogrammi
più lenti, chiamate di disegno e triangoli. Le prove nel browser usano Chromium senza schermo con
Playwright e un joypad finto che sostituisce `navigator.getGamepads`.

## Crediti e licenze

- **Contenuti originali:** club, giocatori, leggende, stemmi e squadre leggendarie sono inventati;
  nessun nome di club o calciatore reale.
- **Golden Striker:** modello fatto da Tancredi con Meshy (`art/CH_GoldenStriker/ref/`).
- **I 10 personaggi** (`art/CH_Portiere1` … `art/CH_Giocatore10`): immagini di Tancredi; il modello
  di `portiere1` fatto da Tancredi con Meshy, rig e clip dall'API di Meshy (`docs/PERSONAGGI.md`).
- **fdlibm** (Sun Microsystems, 1993): seno, coseno, esponenziale e arcotangente della simulazione
  (`packages/sim/src/fmath.ts`), con l'avviso di copyright che la licenza chiede di conservare,
  copiato nel file.

## Stato e cose aperte

- Piano (`docs/PIANO-3D-ONLINE.md`): fasi 0 e 1 chiuse; fase 2 chiusa nel codice, manca la misura
  sul portatile (http://localhost:3000/bench a schermo intero per 30 s: obiettivo 60 fotogrammi al
  secondo di media, l'1% più lento sotto 25 ms); fase 3 in corso.
- Fase 3: CH_Fulmine e Golden Striker giocano con `idle`, `run`, `kick`; restano il sì su corsa e
  tiro, la prova con un pad vero, le clip per scivolata, colpo preso, spallata, palla in mano,
  esultanza e tiro caricato, il budget di disegno con i modelli (8,9 volte i triangoli, 152
  chiamate su 150), la resa a fumetto, il cuneo bianco sul fianco e gli orli a dente di sega del
  Golden Striker (`docs/DETTAGLI.md`).
- Movimenti fatti a metà (memoria dei passi, cinematica inversa): fermi nella storia al commit
  `ac0cd0d`, fuori da `main`.
