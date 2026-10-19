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
