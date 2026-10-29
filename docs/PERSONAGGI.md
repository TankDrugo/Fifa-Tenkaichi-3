# I 10 personaggi (29/10/2026)

Guida per le chat che fanno i personaggi, uno per chat: prima tutti e dieci con le animazioni
base, poi in chat separate le animazioni complesse (skill, mossa speciale, rovesciata, colpo di
testa). La chat 1 ha fatto il primo personaggio, `portiere1`, e gli strumenti che le altre
riusano. Regole del GLB nel gioco: `docs/STUDIO-PERSONAGGI.md`, sezione 11.

**Regola di Tancredi (29/10/2026):** tutte le animazioni si fanno con Meshy, sul rig di Meshy del
personaggio, con la libreria di animazioni di Meshy: niente Mixamo, niente clip fatte a mano in
Blender o nel codice. Se Meshy non ha una clip adatta, la chat si ferma e dice a Tancredi quale
manca, con le clip di Meshy più vicine che ha trovato: decide lui. Per il passaggio ha scelto Text
to Motion di Meshy (sotto, passo 4).

## I dieci

Immagini di Tancredi: il foglio con tutti e dieci è `docs/personaggi/i-dieci.png`; ogni cartella
`art/CH_<Nome>/ref/` ha il suo ritaglio (`foglio.png`) e, per i primi quattro, l'immagine intera
(`fronte.png`). I nomi sono provvisori, col ruolo e la posizione nel foglio (Tancredi, 29/10/2026):
quelli veri si mettono dopo, rinominando cartella, id e file.

| # | Nome (cartella) | Id (`?modello=`) | Squadra nel foglio | Com'è | Immagine | Stato |
|---|---|---|---|---|---|---|
| 1 | CH_Portiere1 | `portiere1` | azzurri, stella | portiera, occhiali, ricci neri lunghi, maglia gialla a maniche lunghe, guanti | `art/CH_Portiere1/ref/fronte.png` | fatto: modello, rig e 5 clip Meshy nel gioco |
| 2 | CH_Giocatore2 | `giocatore2` | azzurri | capelli neri a punte sull'occhio, felpa legata in vita | `art/CH_Giocatore2/ref/fronte.png` | da fare |
| 3 | CH_Giocatore3 | `giocatore3` | azzurri | capelli neri lunghissimi con ciocca azzurra | `art/CH_Giocatore3/ref/fronte.png` | da fare |
| 4 | CH_Giocatore4 | `giocatore4` | azzurri | codini rossi con elastici azzurri | `art/CH_Giocatore4/ref/fronte.png` | da fare |
| 5 | CH_Giocatore5 | `giocatore5` | azzurri | ciuffo arancione a punte, cerotto al ginocchio | `art/CH_Giocatore5/ref/foglio.png` | da fare |
| 6 | CH_Portiere6 | `portiere6` | verdi, corona | portiere calvo, maglia verde chiaro, guanti | `art/CH_Portiere6/ref/foglio.png` | da fare |
| 7 | CH_Giocatore7 | `giocatore7` | verdi | treccia lunga fino ai piedi, fascia bianca | `art/CH_Giocatore7/ref/foglio.png` | da fare |
| 8 | CH_Giocatore8 | `giocatore8` | verdi | afro con fascia gialla, corporatura robusta | `art/CH_Giocatore8/ref/foglio.png` | da fare |
| 9 | CH_Giocatore9 | `giocatore9` | verdi | capelli bianchi corti, cerotti sulle ginocchia | `art/CH_Giocatore9/ref/foglio.png` | da fare |
| 10 | CH_Giocatore10 | `giocatore10` | verdi | capelli blu scuro pettinati all'indietro | `art/CH_Giocatore10/ref/foglio.png` | da fare |

## Le animazioni base

| Stato del gioco | Quando | Da dove nella simulazione |
|---|---|---|
| `idle` fermo | sotto 0,3 m/s | `PlayerMotion.speed` |
| `walk` camminata | da fermo a 1,2 m/s la camminata prende tutto il peso, fino a 2,6 m/s | `speed`, `phase` (il passo) |
| `run` corsa | da 2,6 a 3,2 m/s si mescola con la camminata, sopra 3,2 m/s da sola | `speed`, `phase` |
| `shot` tiro | il calcio di un tiro | `kick` da 0 a 1, `kickKind` `"shot"` |
| `pass` passaggio | il calcio di un passaggio o del rinvio con le mani del portiere | `kick`, `kickKind` `"pass"` |

Tiro e passaggio: la simulazione aveva un solo gesto «kick»; ora `Match.kick` scrive anche
`Player.kickKind` (`pass`, `shot`, `roll`) e `Player.kickAt` (l'orologio del calcio), letti solo
dal disegno e fuori dall'impronta (`packages/sim/src/fingerprint.ts`). `apps/web/game/render/players.ts`
passa `kickKind` al disegno; `roll` è un passaggio. Un passaggio di corsa non ha clip nella
simulazione (`kickClip` `null`, la vecchia corsa a sprite lo tagliava), e sono quasi tutti: in
120 s della partita con seme 7 ci sono 37 passaggi di corsa e 2 da fermi (più 13 rinvii del portiere e 10 tiri). Il disegno lo mostra
lo stesso per 0,33 s dopo `kickAt` (`CLIP_DURATION.pass`).

Mancano ancora, per tutti: scivolata, colpo preso, spallata, palla in mano, esultanza, tiro
caricato (gli altri campi di `PlayerMotion`), che oggi solo i pezzi in codice mostrano.

## La tabella delle clip

Ogni modello ha la sua tabella in `apps/web/game/animation/models.ts`: quale clip del GLB, con il
nome che il file le dà, suona ogni stato del gioco. Il codice non legge nomi di ossa e non presume
uno scheletro: le ossa di questo rig si chiamano `Hips`, `Spine02`, `neck`, `LeftFoot` …, quelle
del GLB che Tancredi ha fatto con l'interfaccia web di Meshy `mixamorig:Hips` …; il gioco li
tratta allo stesso modo. Un modello senza tabella cerca `idle`, `run`, `kick` (i modelli fatti nel
codice, `fulmine` e `golden`).

| Campo | Cosa | Come si trova |
|---|---|---|
| `clip` | nome della clip nel GLB | `node apps/web/scripts/glb.ts info <file.glb>` |
| `offset` (camminata, corsa) | frazione della clip in cui il piede sinistro è più avanti: a fase 0 camminata e corsa partono dallo stesso piede | `node apps/web/scripts/clipsheet.ts <file.glb> <cartella> --feet LeftFoot,RightFoot` (i nomi delle ossa li legge `glb.ts info`) |
| `from`, `to` (tiro, passaggio) | i secondi della clip che il gioco suona: da poco prima del contatto alla fine dello slancio; il calcio della simulazione va da 0 a 1 su questo tratto | il contatto è quando il piede che calcia è più avanti: `--feet RightFoot,LeftFoot`; poi i fogli di foto con `--from` e `--to` |

### `portiere1`, l'esempio

| Stato | Clip nel GLB | Da Meshy | Durata | Tabella |
|---|---|---|---|---|
| fermo | `Idle_3` | libreria, 243 «Idle 3» | 9,967 s | tutta, col tempo della partita |
| camminata | `Armature\|walking_man\|baselayer` | camminata del rig (`basic_animations`) | 1,067 s | `offset` 0,281 |
| corsa | `Armature\|running\|baselayer` | corsa del rig (`basic_animations`) | 0,667 s | `offset` 0,25 |
| tiro | `Kick_a_Soccer_Ball` | libreria, 410 «Kick a Soccer Ball» | 1,633 s | `from` 0,55, `to` 1,15 (contatto a 0,633 s) |
| passaggio | `Side_Foot_Pass` (Meshy la chiama `retarget_clip`) | Text to Motion, poi applicata al rig | 1,967 s | `from` 1,05, `to` 1,6 (contatto a 1,183 s) |

Fogli di foto (di lato e di fronte, il tratto che il gioco suona): `docs/personaggi/portiere1/`
`fermo.jpg`, `camminata.jpg`, `corsa.jpg`, `tiro.jpg`, `passaggio.jpg`.

Clip della libreria guardate per il passaggio, nessuna adatta (anteprime in
`https://cdn.meshy.ai/webapp-assets/feature-demo/animation/preview/biped/<Nome>.gif`): 410 «Kick a
Soccer Ball» (è il tiro), 209 «Boxing Guard, Right Straight Kick» (guardia coi pugni alti), 206
«Spartan Kick» (calcio a spinta), 414 «Double Kick Forward.», 103 «Simple Kick» (con spada e
scudo). Per il fermo: 0 «Idle» è curvo, da combattimento; 243 «Idle 3» e 244 «Idle 4» sono in
piedi tranquilli.

## Il procedimento Meshy, passo per passo

Tutto con `apps/web/scripts/meshy.ts` (API di Meshy, https://docs.meshy.ai/en/api) e
`apps/web/scripts/glb.ts` (gltf-transform, meshoptimizer, sharp). La chiave: sul PC
`MESHY_API_KEY=msy_...`; in una chat cloud nessuna, la aggiunge il proxy dell'ambiente a ogni
chiamata verso `api.meshy.ai` (lo script manda un segnaposto). In una chat cloud Node passa dal
proxy solo con `NODE_USE_ENV_PROXY=1` davanti al comando. Si parte sempre controllando i crediti:

    NODE_USE_ENV_PROXY=1 node apps/web/scripts/meshy.ts balance

Costi (https://docs.meshy.ai/en/api/pricing, 29/10/2026): immagine→modello 20-35 crediti
(5-20 con `meshy-6-lite` e `meshy-t2*`), rig 5, ogni clip della libreria 3, Text to Motion 10
(`prime`) o 3 (`swift`), rimesh 5. Per `portiere1`: rig 5 + 2 clip 6 + Text to Motion 10 +
applicazione al rig 3 = 24 crediti; i compiti falliti si restituiscono.

1. **Immagine → modello.** `portiere1` l'ha fatto Tancredi nell'interfaccia web di Meshy (già
   con camminata e corsa). Con l'API:

        NODE_USE_ENV_PROXY=1 node apps/web/scripts/meshy.ts image art/CH_Giocatore2/ref/fronte.png <cartella>

   Manda `ai_model` `latest`, texture con PBR, `pose_mode` `t-pose`, solo GLB; un terzo argomento
   JSON cambia i campi (`{"target_polycount": 30000}`, `{"texture_resolution": "2k"}` …, elenco in
   https://docs.meshy.ai/en/api/image-to-3d). Il modello deve guardare verso +Z, se no il rig non
   trova la posa. Prova di questa chat: la chiamata con `meshy-6-lite` senza texture (5 crediti)
   sull'immagine di `giocatore2`, solo per controllare lo script (compito
   `01a1879f-1a5e-75ed-b3fb-1caa85287cc8`, 5 crediti, circa 3 minuti, GLB di 1,5 MB e 31.264
   triangoli senza materiale); il modello non è nel repository né nel gioco.
2. **Rig.** Il GLB con texture va a Meshy come data URI (fino a 100 MB; il modello di Tancredi è
   23 MB):

        NODE_USE_ENV_PROXY=1 node apps/web/scripts/meshy.ts rig <modello.glb> <cartella> 1.6

   Scarica `rigged.glb`, `walking.glb`, `running.glb` e scrive l'id del compito di rig, che serve
   ai passi 3 e 4 e resta valido 3 giorni (`expires_at`). `portiere1`: compito
   `01a1877d-f42a-7326-a79a-8477bdfb472d`, 24 ossa, 34 s. Si rifà il rig anche se il GLB ne ha già
   uno, perché le clip della libreria vogliono un rig dell'API.
3. **Clip della libreria.** Le clip si cercano per parola (gratis), con l'anteprima in GIF:

        NODE_USE_ENV_PROXY=1 node apps/web/scripts/meshy.ts library kick
        NODE_USE_ENV_PROXY=1 node apps/web/scripts/meshy.ts animate <rig> <cartella> 243 410

   Fino a 10 clip in un file, una clip per azione. Prima di scegliere si guardano le anteprime
   (`ffmpeg` le mette in fila: vedi i fogli sopra).
4. **Clip che la libreria non ha** (solo se Tancredi lo decide, come per il passaggio): Text to
   Motion, 2-10 s, poi applicata al rig:

        RIG=<rig> NODE_USE_ENV_PROXY=1 node apps/web/scripts/meshy.ts motion <cartella> 2 "A soccer player standing still makes a short, controlled side-foot pass with the right foot: a small backswing, the inside of the right foot sweeps through low along the ground to strike the ball, a short follow-through, then the foot returns and the player stands relaxed again. Arms slightly out for balance."

   Il testo qui sopra è quello del passaggio di `portiere1` (compito Text to Motion
   `01a1877e-249e-73ab-b7e4-6bfe53636006`).
5. **Un GLB solo, texture e triangoli ridotti:** il file della libreria fa da base (mesh, rig,
   clip), le altre clip vi passano per nome delle ossa; `:vecchio=nuovo` rinomina una clip.

        node apps/web/scripts/glb.ts build apps/web/public/models/portiere1.glb <cartella>/library_243_410.glb <cartella>/walking.glb <cartella>/running.glb <cartella>/motion_<id>.glb:retarget_clip=Side_Foot_Pass --texture 2048 --triangles 6000

   `--texture` porta ogni texture a 2048 di lato al massimo, in WebP (il gioco lo legge con
   `EXT_texture_webp`); `--triangles` fa scendere la mesh con meshoptimizer verso quel numero,
   fermandosi dove l'errore passa l'1% della misura del modello. `portiere1`: da 23 MB a 1,7 MB
   (texture da 4096 PNG, 15,6 + 6,2 MB, a 2048 WebP, 0,38 + 0,22 MB), da 10.417 a 7.672
   triangoli (più giù l'errore non lo lascia scendere); fra 10.417 e 7.672 le foto non mostrano
   differenze.
6. **Tabella e fogli di foto:** la riga in `apps/web/game/animation/models.ts` (sopra), poi

        node apps/web/scripts/clipsheet.ts apps/web/public/models/portiere1.glb <cartella> --frames 8 --clip Kick_a_Soccer_Ball --from 0.55 --to 1.15

   In una chat cloud Playwright 1.56.1 cerca Chromium 1194 e c'è il 1243: `PLAYWRIGHT_BROWSERS_PATH`
   su una cartella con il collegamento `chromium_headless_shell-1194/chrome-linux/headless_shell`
   → `/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
   e il file vuoto `chromium_headless_shell-1194/INSTALLATION_COMPLETE` (`docs/DETTAGLI.md`).
7. **Prova in partita:** `/partita?modello=<id>`, tutti e dieci con quel modello; il video con

        node apps/web/scripts/video.ts "http://localhost:3000/partita?modello=portiere1&seed=7&skip=1800" partita.mp4 --seconds 12

   e il budget con `node apps/web/scripts/bench3d.ts http://localhost:3000 --modello portiere1`.

## Vederla sul PC

    pnpm install
    pnpm --filter @ft3/web dev

poi http://localhost:3000/partita?modello=portiere1 (la partita, tutti questa portiera) e
http://localhost:3000/personaggi?modello=portiere1 (la vetrina); `/bench?modello=portiere1` dà
fotogrammi al secondo e chiamate di disegno.

## I numeri di `portiere1`

Misure del 29/10/2026 in questa chat: `pnpm build`, `pnpm --filter @ft3/web start`, Chromium senza
schermo con WebGL in software; chiamate e triangoli da `renderer.info`, il massimo sui fotogrammi,
ombre e post-elaborazione comprese.

| Misura | Senza modello (pezzi in codice) | `--modello portiere1` |
|---|---|---|
| `bench3d.ts`, 6 prove (1280 × 720 e 1920 × 1080, schermo × 1 e × 1,5, dopo 0, 1.800 e 7.200 passi) | 40 chiamate, 222.715 triangoli in tutte | 56-57 chiamate (budget 150), 237.529-245.201 triangoli (budget 300.000): 6 «ok» su 6 |
| impronta dopo 900 passi, pagina e Node | `f405f43f0a2aff2c` | `f405f43f0a2aff2c` (`kickKind` e `kickAt` non cambiano la partita) |
| un giocatore | — | 7.672 triangoli, 1 materiale, 24 ossa, 1 chiamata di disegno (più l'ombra) |
| GLB | — | 1,7 MB (1.652.408 byte), da 23 MB del file di Tancredi |
| `node packages/sim/bench/checks.ts` | 11 «ok» | — |
| `pnpm test` | 39 prove, 3 nuove in `apps/web/game/animation/appearance.test.ts` (la tabella delle clip con i nomi di Meshy, sfasamenti e tratti dei calci; ogni modello dell'elenco ha fermo, corsa, tiro e passaggio; un modello di Meshy legato come lo lega `GLTFLoader` è alto quanto la carta) | |
| crediti Meshy | 1.205 all'inizio | 1.176 alla fine: 24 per `portiere1`, 5 per la prova dell'immagine→modello |

Video (registrati con `scripts/video.ts`, 30 fotogrammi al secondo, solo la tela: il punteggio è
HTML e non c'è): `docs/personaggi/portiere1/partita.mp4` (12 s dal 30° secondo della partita con
seme 7, la telecamera del gioco) e `partita_vicina.mp4` (10 s, `span=11&pitch=24`). Vetrina:
`docs/personaggi/portiere1/vetrina.jpg`. I fotogrammi al secondo li misura Tancredi sul portatile:
qui il WebGL è in software e non dicono niente.

## Cosa resta

- **I colori di squadra:** il modello ha un materiale solo (`BakedMaterial`) con la divisa dipinta
  nella texture, quindi tutti e dieci hanno la maglia gialla della portiera e le due squadre non si
  distinguono. Per i colori servono materiali con i nomi di `TEAM_MATERIALS` (`maglia`,
  `pantaloncini`, …) oppure una maschera della maglia nella texture; da decidere con Tancredi.
- Gli altri 9 personaggi, una chat ciascuno, con questi passi.
- Le altre clip della simulazione (scivolata, colpo preso, spallata, palla in mano, esultanza,
  tiro caricato) e poi skill, mossa speciale, rovesciata, colpo di testa: prima si cercano nella
  libreria di Meshy, e se mancano si chiede a Tancredi.
- I fotogrammi al secondo sul portatile di Tancredi.
- I nomi veri dei personaggi.
