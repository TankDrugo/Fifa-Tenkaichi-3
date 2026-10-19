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
