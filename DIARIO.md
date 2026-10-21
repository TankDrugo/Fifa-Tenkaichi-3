# Diario

Una voce per sessione, in fondo: data, cosa è cambiato coi numeri, commit, cosa resta.

## 2026-10-20 — nascita di questo repository

Tancredi ha chiesto un progetto con solo il gioco e quello che serve per continuare. Il repository
di prima aveva 1.144 file e una storia git di 169 MB; resta come archivio (README.md, «Archivio»).

- **Gioco:** `web/` con `index.html`, 13 file in `js/` (5.025 righe) e i fogli degli sprite (191 png,
  l'indice `sheets.json`, la palette). Restati fuori 195 file JSON accanto agli sprite (183.000
  righe): erano uscite del render, il gioco legge solo `sheets.json`, `palette.json` e
  `voice/lines.json` (`render.js:136-137`, `voice.js:17`). Senza di loro, nel browser di prova:
  menu, partita, nessun errore, nessuna richiesta fallita.
- **Strumenti:** `web_checks.js` (11 prove su 11), `ai_bench.js` (12 partite: 6,00 gol, 10,6 cambi
  al minuto, 4,11 s di palla al piede, gli stessi numeri del repository di prima),
  `tension_bench.js`, `skill_frames.js`, `build_web_dist.sh` con `web_launcher/` (zip 5,4 MB, exe
  12 MB), `make_commentary.py`, `style_guard/` (selftest 34 casi su 34).
- **Documenti:** `README.md` nuovo, `CLAUDE.md` nuovo (una chat sola, stesse regole di lingua e di
  forma), `docs/DETTAGLI.md` (il `web/README.md` di prima, con le scelte e le misure).
- Stato del gioco: versione 18 al link, joypad PS4 compresi.

Resta: caricare su itch.io (domini e chiave), telecronaca registrata (dominio dei pesi), una posa
propria per tunnel e colpo di tacco.

## 2026-10-20 — exe che si aggiorna da solo, sito su GitHub Pages

Tancredi ha scelto il repository pubblico con GitHub Pages, perché l'exe dei suoi amici deve
scaricare l'ultima versione senza il suo login.

- `.github/workflows/pages.yml`: a ogni push su `main` pubblica il gioco, lo zip per itch.io e
  `version.json` (il commit) su https://tankdrugo.github.io/Fifa-Tenkaichi-3/ .
- `tools/web_launcher/update.go`: l'exe legge `version.json`, scarica lo zip quando la versione
  cambia, lo controlla e lo tiene in `%LOCALAPPDATA%\StrikeLegends`; senza rete usa la copia
  scaricata o quella interna. Test Go (aggiornamento, zip fuori cartella o senza `index.html`
  rifiutati, sito spento) e prova completa con un sito finto in locale: tutti passati.
- `CLAUDE.md`: il lavoro finito e provato va su `main` (pull request e merge) e al link di lavoro.

Resta da fare a mano, una volta: accendere Pages (Settings → Pages → Source «GitHub Actions»).

## 2026-10-19 — gioco su itch.io con butler

- Progetto https://goleador0702.itch.io/fifa-tenkaichi-3 (5190226, in bozza), creato da Tancredi
  col nome scelto da lui; canale `html5`, build 2162777, versione `8a9596e` (lo zip di `main`: 235
  voci, 5,4 MB; nel browser di prova `CSS1Compat`, schermata del titolo, nessun errore).
- butler: `broth.itch.ovh` (502) e `broth.itch.zone` (403) rifiutati dal proxy, quindi compilato
  dai sorgenti via `proxy.golang.org` (81 s). La chiave la mette il proxy come Bearer sulle
  richieste a itch.io; `push` in 3,4 s, build elaborata in 7 s.
- `README.md` e `docs/DETTAGLI.md` («Distribuzione»): indirizzo, comando per le versioni nuove,
  domini che passano e che no, come compilare butler.

- Tancredi ha spuntato «This file will be played in the browser» e pubblicato: la pagina risponde
  200, il gioco parte nel riquadro, che ha `allow="… gamepad …"`. Il riquadro, salvato prima a
  1080 × 720 (il gioco taglia la larghezza: la porta di destra del menu sul bordo), ora è 1280 × 720
  (letto dall'API di itch.io).

Resta: leggere la riga «Permesso della pagina» del joypad nel riquadro di itch.io.

## 2026-10-19 — joypad PS5, titolo «Fifa Tenkaichi 3»

- Joypad PS5: DualSense e DualSense Edge hanno la disposizione del DualShock 4 in ogni caso provato
  (database SDL per Windows e per `hid-playstation`), quindi i profili che c'erano li leggevano già.
  Prova con joypad finti in Chromium, 7 casi (Chrome, Edge, Windows senza disposizione con gli id
  di Chromium e di Firefox, Firefox su Linux, un clone, un DualShock 4 di controprova): 16 comandi e
  4 assi giusti, menu percorso con ✕, croce e ○. Cambiati i nomi: CREATE al posto di SHARE sul PS5,
  profili e messaggio «PlayStation» al posto di «PS4» (`js/input.js`, `js/ui.js`,
  `js/settings.js`).
- Titolo: «Fifa Tenkaichi 3» nella scheda, nella schermata d'apertura, nei menu e sui cartelloni;
  «FT3» nel cerchio di centrocampo (`index.html`, `js/ui.js`, `js/render.js`). Chiavi di
  salvataggio invariate (`strikelegends.*`).
- `node tools/web_checks.js`: 11 prove su 11 prima e dopo, numeri uguali (passaggi 95%, 89,5%, 95%,
  83,5%, 80%, 74,5%; gesti 10 su 10; skill 9 su 9; ruoli 9 su 9). `ai_bench.js` non rifatto:
  nessuna riga della simulazione è cambiata.

## 2026-10-19 — copertina da mercatino e titolo sul campo

- Copertina per itch.io, `tools/cover/cover.jpg` (1260 × 1000, 467 KB): calciatore inventato in
  rovesciata con l'aura, scritta cromata fuori registro, bollini, prezzo, pieghe. Goku no, per i
  diritti di Toei e Shueisha (Tancredi ha scelto il calciatore inventato). Sorgente SVG in
  `tools/cover/cover.html`, render con `node tools/cover/render_cover.js`: due render di fila danno
  file identici.
- Sul campo: logo della copertina nel cerchio di centrocampo (4,6 m, 62% di opacità) e scritta su
  una riga nei due pannelli del titolo, da `web/assets/logo/` (`js/render.js`). Senza le immagini
  torna «FT3»: provato bloccandole, gioco avviato senza errori. Visto su 4 campi e in una partita.
  `node tools/web_checks.js`: 11 su 11, numeri uguali a prima; joypad finti 7 casi su 7.
- Joypad nel riquadro di itch.io: «permesso concesso» (prova di Tancredi). Nuova build su itch.io
  2163299 (versione `91d8b22`) con il PS5 e il titolo.

- itch.io: build 2163481 (versione `a8ea6e8`) col logo sul campo, patch di 224,68 KiB; la pagina
  pubblica la mostra (`html/19878189-2163481`). Link di lavoro: versione 20.
- Copertina, su richiesta di Tancredi: capelli dorati a punte dritte e aura a fiamme d'oro col
  bordo arancione, al posto dei capelli neri e del bagliore. L'aura si disegna dopo le forme del
  logo, così `ft3_logo.png` e `ft3_wordmark.png` restano identici byte per byte (md5 uguale) e il
  gioco non va ripubblicato.

Resta: caricare la copertina su itch.io a mano (Edit game → «Cover image»).

## 2026-10-21 — piano del rifacimento in Next.js, 3D e online

- `docs/PIANO-3D-ONLINE.md`: prompt e piano per le chat che rifanno il gioco, con le decisioni di
  Tancredi (Next.js anche come server; personaggi e animazioni disegnati nel codice, senza Mixamo
  né archivio; account con nome utente e password; Postgres + Redis; tutto l'online insieme; gioco
  attuale invariato; 60 fps sui portatili con la grafica integrata; prima Docker Desktop, poi
  Oracle), 8 fasi con le prove di fine fase e il messaggio da incollare nella chat nuova.
- Misure di partenza: 5.052 righe in `web/js/`; 0 `Math.random` nella simulazione; i pacchetti
  rendono dal 164% al 567% del prezzo rivendendo al mercato del gioco, dal 25% al 90% con la
  vendita rapida (`ut.js:233-236`, `ut.js:257`, `data.js:230-238`).
- Ambiente cloud: Docker 29.8.2 e Compose v5.6.0 funzionano dopo `dockerd &` (immagine
  `redis:8-alpine` scaricata e avviata); nessuna scheda video.

Resta: la fase 0 del piano, in una chat nuova.

## 2026-10-21 — fase 0 del rifacimento: fondamenta

- Workspace pnpm alla radice con `apps/web` (Next.js 16.4.2, React 19.3.1), `apps/realtime`
  (`/health` e WebSocket `/ws`), `packages/shared` (schemi zod); `infra/docker-compose.yml` con
  Postgres 18.6, Redis 8.10.2, realtime e web, controlli di salute e volumi; pagina `/status` con
  i quattro servizi e un WebSocket aperto dal navigatore; `infra/check-status.mjs`;
  `.github/workflows/ci.yml` con tipi, lint, prove, build, immagini amd64 e arm64, compose. Scelte e
  versioni con il perché in `docs/DETTAGLI.md`, «Gioco nuovo · fase 0».
- Misure: su GitHub Actions `docker compose up` arriva a web sano in 17,6 s, i quattro servizi
  rispondono in 1,3-4,6 ms, WebSocket 0,44 ms di mediana su 20 ping, 183,2 MiB di memoria a riposo
  in tutto; le immagini arm64 si costruiscono su amd64 senza emulazione (standalone da 61 a 23 MB,
  0 file nativi) e sotto QEMU partono. Nella chat, senza Docker: stessi controlli verdi con Postgres
  16 e Redis 7 del contenitore, WebSocket da Chromium 0,6 ms. `node tools/web_checks.js`: 11 `ok` su
  11 prima e dopo; `web/` invariato (0 righe di differenza).
- Il primo giro di CI è fallito: `node:24.22.1-alpine3.24`, uscita alle 11:38 UTC dello stesso
  giorno, non aveva ancora immagini; si usa la 24.22.0.
- `docs/PROPOSTA-FASE-0.md`: testo da aggiungere a `CLAUDE.md` e `README.md`, più due domande (filtro
  `paths` in `pages.yml`, permesso `Bash(dockerd)` in `.claude/settings.json`). I due file non sono
  cambiati.
- Commit: `7208629` (codice), `d02a006` (immagine Node), `2a71b59` (misure, diario, proposta),
  `c772487` (la prova WebSocket di `/status` segna errore se il server chiude prima del decimo
  ping, provato con un server che saluta e chiude); pull request TankDrugo/Fifa-tenkaichi-3#8.

Resta, prima di chiudere la fase 0: `docker compose up` sul PC di Tancredi con Docker Desktop
(poi http://localhost:3000/status); il suo sì alla proposta di `docs/PROPOSTA-FASE-0.md` e alle due
domande; `docker compose up` dentro una chat cloud, bloccato finché `dockerd` non ha il permesso.
Dopo, la fase 1 in una chat nuova.

## 2026-10-21 — fase 0: proposta approvata, Docker nelle chat

- Tancredi ha approvato la proposta, il filtro `paths` e il permesso per `dockerd`. Il testo è
  copiato in `CLAUDE.md` («Working on the new game») e `README.md` (righe di «Struttura», sezione
  «Gioco nuovo (in costruzione)»); `docs/PROPOSTA-FASE-0.md` è tolto, come diceva la proposta.
- `.github/workflows/pages.yml`: il sito si ricostruisce solo per un push su `main` che cambia
  `web/**` o il file stesso. Questo merge lo cambia, quindi il sito si ricostruisce un'ultima volta;
  il merge successivo che non tocca `web/` è la prova che «Sito del gioco» non parte.
- `.claude/settings.json`: `permissions.allow` con `Bash(dockerd)`. Nella chat `dockerd` è partito
  (Docker 29.9.1).
- Docker nella chat: il primo build si è fermato su «self-signed certificate in certificate chain»
  (corepack verso `registry.npmjs.org`). I due Dockerfile leggono ora il certificato della rete da
  un secret di BuildKit, che passa `infra/docker-compose.cloud.yml`, solo nelle chat; Compose 5.6.0
  vuole anche `BUILDX_BAKE_ENTITLEMENTS_FS=0` per leggere quel file. Comando in `CLAUDE.md`: è
  un'aggiunta al testo approvato, che Tancredi ha approvato a parte lo stesso giorno.
- Misure nella chat: build delle due immagini 36,8 s, `up --wait` 17,2 s, quattro servizi in
  1,5-6,2 ms, WebSocket 0,61 ms di mediana su 20 ping, 0,8 ms da Chromium; memoria a riposo web
  89,0 MiB, realtime 52,8, Postgres 38,1, Redis 6,0; una chiave Redis e una riga Postgres restano
  dopo `docker compose down` e `up` (`docs/DETTAGLI.md`, «Docker nelle chat cloud»).

Resta della fase 0 solo `docker compose up` sul PC di Tancredi con Docker Desktop (`README.md`,
«Gioco nuovo (in costruzione)»); le altre condizioni della fase sono soddisfatte (compose nella
chat, immagini amd64 e arm64, proposta approvata). Con la sua conferma la fase 0 è chiusa e la
chat successiva fa la fase 1.

## 2026-10-21 — fase 0 chiusa

- Tancredi ha avviato `docker compose up --build` sul suo PC con Docker Desktop: su
  http://localhost:3000/status le quattro righe (web, realtime, Postgres, Redis) sono verdi.
  Scritto in `docs/DETTAGLI.md`, «Gioco nuovo · fase 0», sezione «Sul PC di Tancredi».
- Con questo le tre condizioni della fase 0 (`docs/PIANO-3D-ONLINE.md`, sezione 5) sono
  soddisfatte: compose con la pagina di stato nella chat e sul PC, immagini amd64 e arm64,
  proposta per `CLAUDE.md` e `README.md` approvata e applicata.
- Questo merge cambia solo `DIARIO.md` e `docs/DETTAGLI.md`: «Sito del gioco» non deve partire
  (filtro `paths` di `.github/workflows/pages.yml`).

Fase chiusa: 0. Resta: la fase 1 (simulazione condivisa in `packages/sim`), in una chat nuova.

## 2026-10-21 — fase 1 del rifacimento: simulazione condivisa

- `packages/sim`: `web/js/match.js`, `ai.js`, `skills.js` e `data.js` in TypeScript, senza
  disegno, suono né joypad (comandi da `Match.input`, suoni e vibrazioni da `Match.onCue`). `web/`
  invariato (0 righe di differenza). Scelte e misure in `docs/DETTAGLI.md`, «Gioco nuovo · fase 1».
- Le quattro condizioni della fase: `bench/checks.ts` dà le stesse 26 righe di
  `tools/web_checks.js` (11 `ok` su 11); `bench/ai_bench.ts 48 4 1 --json` lo stesso JSON byte per
  byte, e `tension_bench` 48 la stessa riga; `bench/browser.ts` 22 partite su 22 con la stessa
  catena di impronte in Node 22.22 e Chromium 141, 362.741 fotogrammi; `bench/speed.ts 3` passo
  medio 7,8 µs, 2.133 partite fra IA a 60 Hz per core (2.029 una contro una, 2.535 due contro due).
- `bench/parity.ts`: gioco vecchio e simulazione nuova giocano 22 partite (IA, persone con comandi a
  caso, Semi/Assistito/Manuale, due contro due, Carriera, Luna, 30-60-144 Hz) con impronte uguali
  dopo ogni fotogramma. Controprove: 1e-9 sulla riserva del portiere le separa al fotogramma 0.
- `Math.sin` e `Math.cos` differiscono nell'ultimo bit fra Node 22 e Chromium 141 (6.826 e 6.595
  casi su 200.000): `src/fmath.ts` le riscrive da fdlibm, con `exp`, `atan2` e `hypot`, ed è
  uguale bit per bit al `Math` di Node 22 su 1.000.196 argomenti per caso; il passo medio scende da
  12,8 a 7,8 µs. ESLint vieta in `packages/sim/src` le funzioni trascendenti di `Math`,
  `Math.random` e `**`. Crediti di fdlibm in `README.md`.
- Due cose trovate nel gioco vecchio e lasciate come sono, perché il porting deve dare gli stessi
  numeri: l'IA pensa ogni 8 passi (7,5 volte al secondo), non ogni 0,1 s come dice `ai.js`;
  `tools/ai_bench.js:66` non passa a `Match.pass` il compagno scelto dall'IA (su 96 partite,
  passandolo, gol 5,77 → 5,49, tiri 19,5 → 18,5).
- CI: lavoro nuovo «Simulazione in Node e in Chromium» (`fmath` contro Node 24, 22 partite contro il
  gioco vecchio, 22 partite in Chromium); `pnpm test` 21 prove su 21 (13 nuove). Playwright 1.56.1,
  la versione dei browser già presenti nelle chat.
- Commit: `fafbf00` (codice), il commit di questa voce; pull request TankDrugo/Fifa-tenkaichi-3#11.

Fase chiusa: 1. Restano due scelte per Tancredi, nessuna blocca la fase 2: il banco dell'IA con il
compagno scelto (`--real-pass`) come comportamento normale, e l'IA a 10 pensieri al secondo invece
di 7,5 (cambia la partita, quindi in una fase che cambia l'IA). Dopo, la fase 2 (motore 3D) in una
chat nuova.
