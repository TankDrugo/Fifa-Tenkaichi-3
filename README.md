# Fifa Tenkaichi 3 — Strike Legends

Calcio arcade 4 contro 4 nel browser: un portiere e quattro giocatori per parte su un campo chiuso
di 28 × 16 m, niente falli né rimesse, la palla si ruba di spallata o in scivolata. Si gioca con la
tastiera o con un joypad (Xbox, PS4 e PS5, ufficiali e non), da soli contro l'IA o in due sulla stessa
macchina. A schermo si chiama «Fifa Tenkaichi 3»; nel codice e nei salvataggi resta
`strikelegends`.

- **Da giocare subito:** https://tankdrugo.github.io/Fifa-Tenkaichi-3/ , il sito che GitHub Pages
  ricostruisce a ogni modifica di `web/` su `main` (`.github/workflows/pages.yml`). Copia di lavoro delle
  chat: https://claude.ai/artifact/P8PppHnpvqoj76uJorB6rE (privato).
- **Su Windows:** `StrikeLegendsWeb.exe` si aggiorna da solo a ogni apertura (sezione
  «Distribuzione»).
- **In locale:** `cd web && python3 -m http.server 8000`, poi http://localhost:8000.
- **Da dare in giro:** `bash tools/build_web_dist.sh` prepara lo zip per itch.io e l'exe per
  Windows (sezione «Distribuzione»).

Le scelte, le fonti e le misure di ogni parte stanno in `docs/DETTAGLI.md`; qui c'è quello che
serve per orientarsi e per continuare. `CLAUDE.md` raccoglie i fatti tecnici per le chat,
la cronologia delle sessioni fino al 29/10/2026 è `DIARIO.md` nella storia git
(`git show f96f8c3:DIARIO.md`).

Il motore è three.js (Next.js con `@react-three/fiber`, in `apps/web`); il gioco vecchio in `web/`
disegna in WebGL senza librerie. La versione Godot è abbandonata e non fa parte del repository.

## Struttura

| Percorso | Cosa |
|---|---|
| `web/index.html` | la pagina: stili, schermate, ordine degli script |
| `web/js/data.js` | club, squadre leggendarie, carte, pacchetti, salvataggio (`localStorage`, chiave `strikelegends.save.v2`) |
| `web/js/input.js` | tastiera e joypad: profili standard, Xbox su Linux, PlayStation (PS4 e PS5) non riconosciuto, PlayStation su Linux, tabelle registrate a mano; bordi per i menu |
| `web/js/audio.js`, `web/js/voice.js` | effetti sonori; telecronaca (frasi in `web/assets/voice/lines.json`) |
| `web/js/render.js` | disegno WebGL: fogli degli sprite a palette, 12 campi a tema (`THEMES`) |
| `web/js/match.js` | la partita a 60 Hz: movimento, palla, passaggi, tiri, spallate, portiere, Tensione e Cometa |
| `web/js/ai.js` | l'IA delle squadre e i 15 ruoli (`ROLES`) |
| `web/js/skills.js` | le 9 skill: gesti della levetta destra, tasti 1-9, stelle, pose |
| `web/js/ui.js` | schermate, cursore dei menu, HUD, pausa, risultati, ciclo principale |
| `web/js/modes.js`, `ut.js`, `career.js`, `settings.js` | amichevole, sfide, squadre leggendarie, allenamento; Ultimate Team; carriera; impostazioni e Prova joypad |
| `web/assets/` | fogli degli sprite (`sprites/` figura base e portiere, `bodies/` 10 corpi, `chars/` 11 personaggi) con l'indice `sprites/sheets.json` e la palette `sprites/palette.json`; frasi della telecronaca; `logo/` il titolo dipinto sul campo |
| `tools/web_checks.js` | situazioni di gioco senza browser, ognuna col numero che deve dare (11 prove) |
| `tools/ai_bench.js`, `tools/tension_bench.js` | partite fra IA senza browser: ritmo, possesso, passaggi; barra della Tensione |
| `tools/skill_frames.js` | foto di ogni skill dentro una partita, un fotogramma ogni 1/30 s |
| `tools/cover/` | copertina per itch.io (`cover.jpg`) e logo del campo (`web/assets/logo/`), da un solo disegno SVG: `node tools/cover/render_cover.js` |
| `tools/build_web_dist.sh`, `tools/web_launcher/` | zip per itch.io ed exe per Windows (Go): `update.go` scarica l'ultima versione dal sito |
| `.github/workflows/pages.yml` | a ogni push su `main` che cambia `web/` o questo file: il sito, lo zip per itch.io e `version.json` su GitHub Pages |
| `tools/make_commentary.py` | registra la telecronaca con Chatterbox (serve il dominio `us.aws.cdn.hf.co`) |
| `docs/MAPPA.md` | mappa delle 12 parti del gioco (partita, IA, skill, Tensione, personaggi e animazioni, stadio, Ultimate Team, interfaccia, comandi, audio, online, prove): file nel gioco nuovo e nel vecchio, stato, gruppi del grafo; in versione da guardare su https://claude.ai/artifact/Q9NV9YFRAeAf37SnTJQM47 |
| `docs/DETTAGLI.md` | scelte, fonti e misure, sezione per sezione |
| `docs/PIANO-3D-ONLINE.md` | piano e prompt del rifacimento in Next.js, 3D e online: decisioni, fasi, prove |
| `package.json`, `pnpm-workspace.yaml` | workspace pnpm del gioco nuovo; `web/` ne resta fuori |
| `apps/web` | gioco nuovo, Next.js: pagine, API, pagina di stato `/status`; `/partita` e `/bench`, la partita in 3D (`apps/web/game/`: `core/` ciclo, comandi, opzioni; `animation/` aspetto dei giocatori, scheletro, modelli GLB e clip; `render/` stadio, pezzi, facce, materiali; `ui/` viste React); `/prova`, un calciatore solo con la palla per provare un modello |
| `apps/realtime` | gioco nuovo, server delle partite: `/health` e WebSocket `/ws` |
| `packages/shared` | gioco nuovo, schemi condivisi fra navigatore e server |
| `packages/sim` | gioco nuovo, la simulazione in TypeScript (partita, IA, skill, carte), la stessa nel navigatore e sul server; `bench/` ha le prove e i banchi di `tools/` portati |
| `infra/` | gioco nuovo, `docker-compose.yml` (Postgres, Redis, web, realtime), `check-status.mjs`; `docker-compose.cloud.yml` solo per le chat cloud |
| `.github/workflows/ci.yml` | gioco nuovo, a ogni pull request: tipi, lint, prove, simulazione in Node e in Chromium, immagini amd64 e arm64, compose |

## Comandi

| Azione | Tastiera | Joypad (Classico) |
|---|---|---|
| muoversi · scatto | WASD o frecce · Shift | levetta sinistra o croce · RT / R2 |
| passaggio (tieni per la potenza in Semi e Manuale) · alto | J · U+J | A / ✕ · LB+A |
| tiro (tieni per caricare) · pallonetto · senza palla spallata | K · U+K · K | X / □ · LB+X · X / □ |
| finta · senza palla scivolata | L | B / ○ |
| cambia giocatore · chiedi il passaggio | Q · J | RB / R1 · A / ✕ |
| Tensione: 1 tacca tiro caricato, 3 tacche Colpo della Cometa | Spazio | Y / △ |
| skill | 1-9 | levetta destra |
| pausa · schede dei menu | Esc · Q/E | Menu, OPTIONS · LB/RB |

Disposizione «Stile FC» in Impostazioni → Comandi: tiro su B / ○, finta su X / □, cambio su LB / L1.
Il secondo giocatore senza joypad usa frecce e tastierino.

## Come funziona

- **Ritmo.** Corsa 4,6 m/s, scatto ×1,35; il campo si attraversa in circa 6 s. Su 12 partite fra
  IA: circa 10,6 cambi di possesso al minuto e 4,1 s di palla al piede.
- **Passaggi** (Impostazioni → Comandi → Passaggi): Assistito, Semi (predefinito), Manuale, come in
  EA FC. Il compagno a cui passi corre da solo incontro alla palla. Passaggi di una persona al
  compagno scelto contro l'IA: 89,5% Assistito, 83,5% Semi.
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
- **Ruoli.** 15 ruoli presi da FC IQ (per esempio Torre, Rapinatore, Falso nueve, Regista,
  Stopper, Portiere libero), con familiarità + e ++ dalle statistiche della carta; si scelgono in
  Ultimate Team → Rosa.
- **IA.** Forma che segue il pallone, punti di appoggio, spazio come tempo, minaccia della
  posizione, difesa a ruoli, tre difficoltà dal tempo di reazione; fonti in `docs/DETTAGLI.md`,
  «IA».
- **Modalità.** Amichevole rapida (contro l'IA, uno contro uno, due contro l'IA); Ultimate Team
  (club a 7 schede: Gioca con divisioni e Coppa Strike, Rosa, Mercato, Pacchetti, Obiettivi,
  Collezione, Stadio); carriera da allenatore o da giocatore; 18 sfide; 6 squadre leggendarie;
  allenamento.
- **Joypad.** Prova joypad (Impostazioni → Comandi) mostra cosa vede il browser e cosa arriva ai
  menu; «Assegna i tasti» registra un joypad non riconosciuto: tasti, croce, levette.
- **Telecronaca.** 53 frasi in italiano lette dalla voce del browser; con Chatterbox diventano clip
  registrate (`tools/make_commentary.py`).

## Prove e misure

| Comando | Cosa dà oggi |
|---|---|
| `node tools/web_checks.js` | 11 prove su 11 (portiere, passaggi, gesti delle skill, duello delle skill, ruoli) |
| `node tools/ai_bench.js 12 4 1` | 12 partite da 4 minuti a difficoltà normale: 6,00 gol, 10,6 cambi al minuto, 4,11 s di palla al piede, 92% di passaggi riusciti. Su 12 partite i gol oscillano di ±1 fra due sorteggi: le differenze piccole si misurano su 48 o 96 |
| `node tools/tension_bench.js 48` | Comete 0,60 a partita, tiri caricati 1,60, prima barra piena al minuto 3,19 |
| `node tools/skill_frames.js <url> <cartella>` | foto delle skill da guardare prima di cambiare una posa |

Le prove nel browser usano Chromium senza schermo con Playwright e un joypad finto che sostituisce
`navigator.getGamepads`; nel browser senza schermo i fotogrammi sono 20-25 al secondo, quindi le
pressioni finte durano 250-400 ms.

## Distribuzione

`bash tools/build_web_dist.sh [cartella]` (servono `zip` e Go 1.24):

- `strikelegends-web.zip`: `index.html` alla radice (col `<!doctype html>` davanti), `js/`,
  `assets/`; il formato che itch.io chiede per un gioco HTML.
- `StrikeLegendsWeb.exe`: a ogni apertura legge `version.json` dal sito; se la versione è cambiata
  scarica `strikelegends-web.zip` (lo stesso che va su itch.io), lo controlla (`index.html` alla
  radice, nessun file fuori dalla cartella) e lo tiene in `%LOCALAPPDATA%\StrikeLegends`; poi serve
  il gioco su 127.0.0.1:47820 e lo apre in una finestra di Edge o Chrome senza barre. Senza rete usa
  l'ultima copia scaricata, o quella che ha dentro. L'indirizzo resta lo stesso a ogni versione,
  quindi i salvataggi restano. Chiusa la finestra, si chiude da solo dopo circa 20 s. Non firmato:
  al primo avvio Windows chiede «Ulteriori informazioni» → «Esegui comunque». L'exe va rifatto solo
  se cambia il launcher, non per una versione nuova del gioco.
- Il giro: una modifica arriva su `main` → il flusso `Sito del gioco` ricostruisce il sito in circa
  un minuto → al prossimo avvio l'exe la scarica, e itch.io la riceve quando si ricarica lo zip
  (`https://tankdrugo.github.io/Fifa-Tenkaichi-3/strikelegends-web.zip`).
- Prova del 20/10/2026 (versione Linux dello stesso programma, sito finto in locale): primo avvio →
  scarica la versione A e la serve; nuova versione B sul sito → la scarica; sito spento → serve la
  B già scaricata; nel browser il gioco parte dalla copia scaricata. Test Go: zip che scriverebbe
  fuori dalla cartella o senza `index.html` rifiutati, la copia di prima resta.

Su itch.io il gioco è https://goleador0702.itch.io/fifa-tenkaichi-3 (progetto 5190226, canale
`html5`; prima build 2162777 del 19/10/2026, versione `8a9596e`). Una versione nuova, da una chat:
`bash tools/build_web_dist.sh`, poi
`butler push strikelegends-web.zip goleador0702/fifa-tenkaichi-3:html5 --userversion <commit>`.
butler si compila dai sorgenti e la chiave la mette il proxy: i passi sono in `docs/DETTAGLI.md`,
sezione «Distribuzione». Un file caricato a mano dal sito resta accanto al canale `html5` e non lo
sostituisce. La copertina è `tools/cover/cover.jpg` e si carica a mano (Edit game → «Cover
image»), perché l'API di itch.io non ha una chiamata per farlo.

## Gioco nuovo (in costruzione)

Piano e fasi in `docs/PIANO-3D-ONLINE.md`, scelte e misure in `docs/DETTAGLI.md`, «Gioco nuovo».
Sul PC, con Docker Desktop avviato:

    cd infra
    docker compose up --build

poi http://localhost:3000/status mostra web, realtime, Postgres e Redis collegati. `Ctrl+C` ferma
tutto; `docker compose down --volumes` cancella anche i dati di prova.

La simulazione (`packages/sim`) si prova senza Docker, dalla radice del repository:

| Comando | Cosa dà (21/10/2026) |
|---|---|
| `node packages/sim/bench/checks.ts` | le 11 prove di `tools/web_checks.js`, stesse righe |
| `node packages/sim/bench/ai_bench.ts 48 4 1` | partite fra IA con i passaggi al compagno scelto dall'IA: 5,63 gol, 10,4 cambi al minuto, 92% di passaggi riusciti; con `--old-pass` gli stessi numeri di `tools/ai_bench.js` |
| `node packages/sim/bench/tension_bench.ts 48` | gli stessi numeri di `tools/tension_bench.js` |
| `node packages/sim/bench/parity.ts` | gioco vecchio e simulazione nuova, 22 partite uguali in ogni fotogramma |
| `node packages/sim/bench/browser.ts` | le stesse 22 partite in Node e in Chromium, stessa impronta |
| `node packages/sim/bench/speed.ts 3` | partite a 60 Hz che un core regge: circa 2.000 nella chat cloud |

La partita in 3D: con il gioco nuovo avviato (`docker compose up` qui sopra, oppure
`pnpm --filter @ft3/web dev`), http://localhost:3000/partita mostra due squadre dell'IA e
http://localhost:3000/bench gli stessi numeri del motore: fotogrammi al secondo, tempo per
fotogramma, l'1% dei fotogrammi più lenti, chiamate di disegno e triangoli.
`node apps/web/scripts/bench3d.ts http://localhost:3000` controlla il budget di disegno e che la
pagina mostri la partita della simulazione; con `--photos` rifà le foto di `docs/fase2/`.

Joypad: il gioco nuovo legge il controller Xbox (e gli altri) con la Gamepad API del browser
(`navigator.getGamepads`, `apps/web/game/core/input.ts`), come il gioco vecchio (`web/js/input.js`).

Personaggi e animazioni: i giocatori sono pezzi costruiti nel codice (`apps/web/game/render/parts.ts`)
oppure modelli GLB in `apps/web/public/models/`, scelti con `?modello=<id>` (`apps/web/game/animation/models.ts`).
Il gioco suona le clip di un GLB per nome: `idle`, `run`, `kick` (`apps/web/game/animation/modelAppearance.ts`);
non legge i nomi delle ossa. Le animazioni nuove si fanno con Meshy; Mixamo si può usare ma non è
obbligatorio, e il codice nuovo non presume uno scheletro Mixamo. I due modelli di oggi hanno ossa
con i nomi di Mixamo (`mixamorig:Hips` …) date dagli script `art/CH_Fulmine/build_hd/16_rig.py` e
`art/CH_GoldenStriker/build/rig.py`, e restano così. Obiettivo futuro: accettare le clip di Meshy
con i loro nomi, senza la nomenclatura Mixamo.

## Crediti e licenze

- **player01**, la figura base, il portiere e i 10 corpi che ne derivano: fatto da Tancredi in VRoid
  Studio.
- **11 personaggi** (Shibu, Ombra, Bibi, Vita, Vicky, Matricola, Recluta, Coda, Ciuffo, Fumiriya,
  Shino): modelli di esempio del VRoid Project, da https://opengameart.org/content/vroid-studio-cc0-models;
  sei dichiarano CC0, cinque la licenza VRoid Hub che consente ogni uso, anche commerciale, la
  modifica e la ridistribuzione, senza obbligo di credito.
- **Animazioni:** clip Mixamo (Adobe), scaricate con l'account di Tancredi e trasformate in fogli di
  sprite.
- **Caratteri:** Saira Extra Condensed e Barlow da Google Fonts (SIL Open Font License), caricati
  dalla rete.
- **Contenuti originali:** club, giocatori, leggende, stemmi e squadre leggendarie sono inventati;
  nessun nome di club o calciatore reale.
- **fdlibm** (Sun Microsystems, 1993): seno, coseno, esponenziale e arcotangente della simulazione
  del gioco nuovo (`packages/sim/src/fmath.ts`), con l'avviso di copyright che la licenza chiede
  di conservare, copiato nel file.

## Stato e cose aperte

- Rifacimento in Next.js, 3D e online (`docs/PIANO-3D-ONLINE.md`): fasi 0 e 1 chiuse; fase 2 chiusa
  nel codice, manca la misura sul portatile (http://localhost:3000/bench a schermo intero per 30 s:
  obiettivo 60 fotogrammi al secondo di media, l'1% più lento sotto 25 ms); fase 3 in corso.
- Fase 3: CH_Fulmine e Golden Striker giocano con `idle`, `run`, `kick`; restano il sì su corsa e
  tiro, la prova con un pad vero, le clip per scivolata, colpo preso, spallata, palla in mano,
  esultanza e tiro caricato, il budget di disegno con i modelli (8,9 volte i triangoli, 152
  chiamate su 150), la resa a fumetto, il cuneo bianco sul fianco e gli orli a dente di sega del
  Golden Striker (`docs/DETTAGLI.md`).
- Movimenti fatti a metà (memoria dei passi, cinematica inversa): fermi nella storia al commit
  `ac0cd0d`, fuori da `main`.
- itch.io: la copertina `tools/cover/cover.jpg` da caricare a mano (Edit game → «Cover image»).
- Il sito su GitHub Pages va acceso una volta: Settings → Pages → Source «GitHub Actions».
- Telecronaca registrata: manca il dominio `us.aws.cdn.hf.co` per i pesi di Chatterbox.
- Tunnel e colpo di tacco usano ancora la corsa: i fotogrammi del tiro, provati, sembravano un tiro
  intero.
