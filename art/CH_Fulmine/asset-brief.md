# CH_Fulmine — scheda (fase 0)

```text
ASSET      CH_Fulmine
CATEGORY   character, biped (calciatore, stile fumetto)
VIEWS      ref/concept_front.webp, 1024 x 1536: concept di fronte, in prospettiva, posa accovacciata
           (ginocchia piegate, busto in avanti, braccia lunghe davanti alle ginocchia); camera
           circa azimut 0, elevazione 8, lente 35 (le scarpe, più vicine, sono larghe 290 px contro
           i 180 px della testa); il soggetto va da y 19 (punta della cresta) a y 1491 (suole),
           96 % dell'altezza; terra a y 1491. Unica vista: niente lato né schiena.
SCALE      cranio a 1,78 m (scelta: calciatore adulto 1,75-1,85); il gioco riporta il riquadro a
           CHARACTER_HEIGHT = 0,85 (apps/web/game/style.ts:8)
PROPORTIONS misurate sulla maschera dell'immagine (px) e usate come rapporti, non come metri,
           perché la vista è in prospettiva e accovacciata:
           1 testa (capelli-mento) 265 px; cresta 180 px = 0,68 teste, piegata verso la sua sinistra
           2 larghezza testa alle tempie con orecchie 195 px = 0,74 della sua altezza
           3 spalle con maniche 490 px = 2,5 larghezze di testa
           4 guanto 200 px di larghezza = 1,0 larghezza di testa (guanti grandi)
           5 scarpa 290 px = 1,5 larghezze di testa (con la prospettiva)
           6 manica: si allarga a campana, larga 1,6 volte il braccio
           7 pantaloncini larghi, orlo sopra il ginocchio
           8 calzettoni fin sotto il ginocchio, due righe chiare in alto
           9 braccia lunghe: in piedi il polso arriva a metà coscia o più giù (scelta: 0,46 dell'altezza)
           10 corpo magro: vita 0,8 della larghezza del torace
PARTS      corpo (un pezzo, pelle e vestiti dipinti per zona) -> maniche a campana (maglia) con
           polsini (maglia2) -> colletto (maglia2) -> orlo della maglia -> pantaloncini a campana
           -> calzettoni con 2 righe (maglia2) -> scarpe (scarpe, inserti maglia, tacchetti) ->
           guanti (fissi, chiusi a pugno) -> testa con orecchie -> capelli a punte + cresta a
           fulmine -> occhi, sopracciglia, bocca con denti -> stemma a fulmine sul petto (maglia2).
           Rigidi: guanti (mano), scarpe (piede), capelli e faccia (testa). Il resto si deforma.
SILHOUETTE cresta a fulmine alta sopra la testa; maniche a campana; guanti grandi; scarpe grandi;
           gambe lunghe e magre con i pantaloncini larghi.
MATERIALS  maglia rosso #d93a26; maglia2 crema #f0e6c8 (colletto, polsini, righe, stemma);
           pantaloncini crema #efe4c4; calzettoni rosso #d93a26; scarpe nero #1c1c22 con inserti
           rossi (materiale maglia); fissi (colore per vertice): pelle #e8a27a, capelli nero
           #15131c con riflesso blu-viola #3a2f8a, guanti bianco #f2efe6, occhi, bocca, denti.
           Opachi, ruvidità 0,6-0,8, nessuna luce dipinta.
ARTICULATION scheletro umano con i nomi di Mixamo (mixamorig:Hips ... mixamorig:RightToeBase), 22
           ossa; clip in place: idle, run; posa del riferimento come azione per il confronto.
INFERRED   schiena, fianchi, suole, pianta dei guanti, nuca e retro della cresta: dalla simmetria e
           da un calciatore qualsiasi; altezza 1,78 m; lunghezze di braccia e gambe in piedi (la vista
           è accovacciata); la cresta in profondità (spessore 4 cm).
TARGET     three.js 0.186.1 (GLTFLoader), GLB; in piedi, piedi sull'origine, sguardo verso +Z nel
           GLB (-Y in Blender); 6 materiali al massimo; triangoli: riferimento 5.736 a giocatore
           (DIARIO.md in git, 22/10/2026), tetto 12.000; camera di gioco: pitch 29, fov 18, campo largo
           19,8 m (style.ts:15) -> 0,85 m alti circa 55 px su 1280; vetrina /personaggi da vicino.
```

## Versione dettagliata (build_hd/, 26/10/2026)

Cambi alle proporzioni della scheda, misurati nei confronti con l'immagine (`docs/DETTAGLI.md`,
«CH_Fulmine dal riferimento»):

- testa: mento a 1,505 m, cranio 0,196 × 0,236 × 0,27 m (in `build/` era scalata di 1,22 a mano);
- guanti: pugno largo 0,16 m, come la testa con le orecchie;
- gambe: +10 cm fra caviglia e anca (`dims.py`, `stretch_z`): cranio a 1,90 m, punta della cresta
  a 2,14 m; il gioco riporta l'altezza da `extras.height` = 1,90;
- posa del confronto `ref_crouch`: piedi a ±0,34 m girati in fuori di 40°, ginocchia in fuori sopra
  i piedi, anche 13 cm più in basso, pugni fuori dalle ginocchia.

Consegna: `exports/CH_Fulmine_HD.glb` (864.991 triangoli, 17 materiali, 22 ossa, clip idle, run,
kick), `apps/web/public/models/fulmine.glb` (135.803 triangoli, 6 materiali),
`exports/CH_Fulmine_mixamo.fbx` (mesh senza scheletro, per Mixamo).
