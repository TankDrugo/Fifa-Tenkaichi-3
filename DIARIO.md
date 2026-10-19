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
