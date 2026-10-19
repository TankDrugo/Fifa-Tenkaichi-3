# Fifa Tenkaichi 3 — Strike Legends

Calcio arcade 4 contro 4 nel browser: un portiere e quattro giocatori per parte su un campo chiuso
di 28 × 16 m, niente falli né rimesse, la palla si ruba di spallata o in scivolata. Si gioca con la
tastiera o con un joypad (Xbox, PS4 ufficiali e non), da soli contro l'IA o in due sulla stessa
macchina.

- **Da giocare subito:** https://tankdrugo.github.io/Fifa-Tenkaichi-3/ , il sito che GitHub Pages
  ricostruisce a ogni modifica su `main` (`.github/workflows/pages.yml`). Copia di lavoro delle
  chat: https://claude.ai/artifact/P8PppHnpvqoj76uJorB6rE (privato).
- **Su Windows:** `StrikeLegendsWeb.exe` si aggiorna da solo a ogni apertura (sezione
  «Distribuzione»).
- **In locale:** `cd web && python3 -m http.server 8000`, poi http://localhost:8000.
- **Da dare in giro:** `bash tools/build_web_dist.sh` prepara lo zip per itch.io e l'exe per
  Windows (sezione «Distribuzione»).

Le scelte, le fonti e le misure di ogni parte, fino al 20/10/2026, stanno in `docs/DETTAGLI.md`;
qui c'è quello che serve per orientarsi e per continuare. Le regole per le chat che ci lavorano
stanno in `CLAUDE.md`, lo stato di ogni sessione in `DIARIO.md`.

## Struttura

| Percorso | Cosa |
|---|---|
| `web/index.html` | la pagina: stili, schermate, ordine degli script |
| `web/js/data.js` | club, squadre leggendarie, carte, pacchetti, salvataggio (`localStorage`, chiave `strikelegends.save.v2`) |
| `web/js/input.js` | tastiera e joypad: profili standard, Xbox su Linux, PS4 non riconosciuto, PS4 su Linux, tabelle registrate a mano; bordi per i menu |
| `web/js/audio.js`, `web/js/voice.js` | effetti sonori; telecronaca (frasi in `web/assets/voice/lines.json`) |
| `web/js/render.js` | disegno WebGL: fogli degli sprite a palette, 12 campi a tema (`THEMES`) |
| `web/js/match.js` | la partita a 60 Hz: movimento, palla, passaggi, tiri, spallate, portiere, Tensione e Cometa |
| `web/js/ai.js` | l'IA delle squadre e i 15 ruoli (`ROLES`) |
| `web/js/skills.js` | le 9 skill: gesti della levetta destra, tasti 1-9, stelle, pose |
| `web/js/ui.js` | schermate, cursore dei menu, HUD, pausa, risultati, ciclo principale |
| `web/js/modes.js`, `ut.js`, `career.js`, `settings.js` | amichevole, sfide, squadre leggendarie, allenamento; Ultimate Team; carriera; impostazioni e Prova joypad |
| `web/assets/` | fogli degli sprite (`sprites/` figura base e portiere, `bodies/` 10 corpi, `chars/` 11 personaggi) con l'indice `sprites/sheets.json` e la palette `sprites/palette.json`; frasi della telecronaca |
| `tools/web_checks.js` | situazioni di gioco senza browser, ognuna col numero che deve dare (11 prove) |
| `tools/ai_bench.js`, `tools/tension_bench.js` | partite fra IA senza browser: ritmo, possesso, passaggi; barra della Tensione |
| `tools/skill_frames.js` | foto di ogni skill dentro una partita, un fotogramma ogni 1/30 s |
| `tools/build_web_dist.sh`, `tools/web_launcher/` | zip per itch.io ed exe per Windows (Go): `update.go` scarica l'ultima versione dal sito |
| `.github/workflows/pages.yml` | a ogni push su `main`: il sito, lo zip per itch.io e `version.json` su GitHub Pages |
| `tools/make_commentary.py` | registra la telecronaca con Chatterbox (serve il dominio `us.aws.cdn.hf.co`) |
| `tools/style_guard/`, `.claude/settings.json` | il controllo della forma delle risposte delle chat (`CLAUDE.md`) |
| `docs/DETTAGLI.md` | scelte, fonti e misure, sezione per sezione |

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

Ogni modifica che tocca il gioco si misura prima e dopo, e i numeri vanno in `docs/DETTAGLI.md`.

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
sostituisce.

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

## Archivio

Il repository di prima resta su GitHub come archivio: la versione Godot del gioco (`game/`), il
progetto IA vista dall'alto (`ai_topdown/`), i documenti di progetto (`GDD.md`, `TDD.md`,
`PRODUCTION.md`, `ART-BIBLE.md`, `RESEARCH.md`), i sorgenti dei modelli e delle animazioni
(`assets_raw/`, con le licenze in `assets_raw/SOURCES.md`), la catena di render in Blender
(`tools/render_*.py`) e i diari delle cinque chat. Il codice cita quei file come «archive».

## Cose aperte

- itch.io: sul file `html5` va spuntato a mano «This file will be played in the browser», con
  1280 × 720 e il pulsante a tutto schermo; poi la prova del joypad nel riquadro di itch.io.
- Il sito su GitHub Pages va acceso una volta: Settings → Pages → Source «GitHub Actions».
- Telecronaca registrata: manca il dominio `us.aws.cdn.hf.co` per i pesi di Chatterbox.
- Tunnel e colpo di tacco usano ancora la corsa: i fotogrammi del tiro, provati, sembravano un tiro
  intero.
