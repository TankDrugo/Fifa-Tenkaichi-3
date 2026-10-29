# Skill per il gioco 3D: three.js e Blender (26/10/2026)

68 skill in `.claude/skills/`, provenienza e commit in `.claude/skills/SOURCES.md`. Stanno nel
repository perché il contenitore di una chat cloud si cancella a fine sessione: con `-g` andrebbero
in `~/.claude/skills` e la chat successiva non le troverebbe. Ogni chat aperta su `main` le carica
da sola; si chiamano con `/nome` oppure Claude le apre quando la richiesta corrisponde alla
descrizione.

## Quando usarle

| Lavoro | Skill | Serve Blender |
|---|---|---|
| scena, telecamera, luci, ombre del gioco nuovo (`apps/web`, `@react-three/fiber`) | `threejs-fundamentals`, `threejs-react-three-fiber`, `threejs-lighting`, `threejs-performance` | no |
| caricare i GLB di Tancredi, clip di animazione, passaggi tra clip | `threejs-loaders`, `threejs-animation`, `threejs-asset-pipeline` | no |
| calciatore da un'immagine: modello, scheletro, clip, GLB | `blender-image-to-3d` | sì (4.2 o più) |
| corpo low-poly costruito in Python | `lowpoly-humanoid` | no per il corpo, sì per le viste |
| scheletro e clip (idle, walk, run) sul corpo low-poly | `humanoid-rig-animation` | sì |
| rig con Rigify, azioni, root motion, export su un modello che c'è già | `blender-character-rigging`, `blender-animation`, `blender-export-pipelines`, `blender-game-optimization` | sì |
| modello da immagini di riferimento con confronto a più viste | `reference-to-3d`, `multiview-fit-loop`, `blender-export` | sì |

La combinazione indicata da Tancredi: `blender-image-to-3d` per creare il giocatore
dall'immagine, `blender-character-rigging` e `blender-animation` per le clip da calcio.

## Provato in questa chat

- `lowpoly-humanoid`: `python3 .claude/skills/lowpoly-humanoid/lpm.py --out <cartella>/calciatore --gioi nam --cao 1.80`
  dopo `pip install numpy scipy trimesh pillow networkx` (`networkx` manca dall'elenco del
  repository: senza, `trimesh` si ferma) produce un GLB di 32.552 byte, 29 parti, 828 triangoli,
  controlli automatici tutti passati. Il corpo non ha scheletro né clip: quelli li fa
  `humanoid-rig-animation`, che chiede Blender. `--gioi nam|nu` è maschio/femmina, `--cao` l'altezza.
- Blender: il 26/10/2026, dopo il via di Tancredi, Blender 4.5.3 LTS è sceso da download.blender.org
  (377 MB) e gira senza schermo nella chat cloud; per le viste Workbench ed EEVEE servono
  `apt-get install -y libegl1 libegl-mesa0 libgl1-mesa-dri`. Una foto EEVEE 500 × 750 del modello
  dettagliato (2,4 milioni di triangoli) richiede circa 40 s.

## Il primo giocatore: CH_Fulmine (26/10/2026)

Dall'immagine di Tancredi (`art/CH_Fulmine/ref/concept_front.webp`) con `blender-image-to-3d`,
in due versioni. I numeri e il perché di ogni scelta stanno in `docs/DETTAGLI.md`, sezione
«CH_Fulmine dal riferimento».

| Versione | Dove | Triangoli | Confronto con l'immagine (IoU della sagoma nella sua posa) |
|---|---|---|---|
| prima, a pezzi semplici | `art/CH_Fulmine/build/` | 7.514 | 0,477 |
| dettagliata, scolpita | `art/CH_Fulmine/build_hd/` | 2,1 milioni nel file Blender; 864.991 nel GLB dettagliato, 135.803 in quello del gioco | 0,558 |

Rifare tutto, dalla cartella `art/CH_Fulmine`, con `B` = percorso di Blender e `M` = file .blend:

    for ph in 10_body 11_clothes 12_head 13_hair 14_gear 15_stretch 16_rig; do
      $B --background --python build_hd/$ph.py -- --master $M; done
    $B --background --python build_hd/17_export.py -- --master $M --out exports --level hd
    $B --background --python build_hd/17_export.py -- --master $M --out exports --level game

Il file .blend va prima creato con `init_master.py` della skill (80 s le fasi, 30 s ogni
esportazione). Una fase si rifà da sola: ognuna cancella e ricostruisce solo le sue parti.

## Animazioni: Meshy, Mixamo facoltativo

Il GLB ha già 3 clip fatte nel codice (`idle`, `run`, `kick`, `art/CH_Fulmine/build/08_anim.py`)
che il gioco muove con la simulazione. Mancano le clip per gli altri stati della simulazione:
scivolata, colpo preso, spallata, palla in mano, esultanza, tiro caricato
(`apps/web/game/animation/appearance.ts:22-30`).

- **Meshy** (https://docs.meshy.ai/en/api/rigging, https://docs.meshy.ai/en/api/animation) è la
  strada per le animazioni nuove: rig e clip sui modelli umanoidi con texture.
- **Mixamo** (https://www.mixamo.com) si può usare, non è obbligatorio: rig automatico e clip con un
  account Adobe; accetta FBX, OBJ o ZIP, non GLB, e per questo c'è
  `art/CH_Fulmine/exports/CH_Fulmine_mixamo.fbx` (la mesh del gioco, 135.787 triangoli, 2,7 MB, in
  posa A, senza scheletro; si rifà con `build_hd/18_mixamo.py`).
- Il codice nuovo non presume uno scheletro Mixamo: il gioco cerca le clip per nome (`idle`, `run`,
  `kick`, `apps/web/game/animation/modelAppearance.ts`) e non legge i nomi delle ossa. I due modelli di oggi
  hanno ossa con i nomi di Mixamo (`mixamorig:Hips` ...) e restano così.
- Fatto il 29/10/2026: ogni modello ha una tabella che lega le clip di Meshy, con i loro nomi, agli
  stati del gioco (`apps/web/game/animation/models.ts`). Da quel giorno, per decisione di Tancredi,
  tutte le animazioni si fanno con Meshy, sul rig di Meshy, dalla sua libreria: niente Mixamo e
  niente clip a mano. Passi e script: `docs/PERSONAGGI.md`.

## Come provare a creare un giocatore

Sul PC di Tancredi (Blender installato, Claude Code aperto nella cartella del repository):

1. Mettere l'immagine nel repository o allegarla in chat, per esempio `ref/attaccante.png`.
2. Scrivere: `/blender-image-to-3d ref/attaccante.png calciatore 1,80 m, riggato, clip idle/run/kick/pass, GLB per three.js`.
   La skill procede a fasi (silhouette, forme, dettagli, rig, clip, export) e a ogni fase mostra un
   confronto tra la resa e l'immagine dalla stessa telecamera.
3. Per aggiungere clip a un GLB che c'è già:
   `usa blender-character-rigging e blender-animation: rig Rigify su <file>.glb, clip run, kick, pass, esporta GLB`.
4. Da aggiungere alla richiesta, perché il gioco lo legge così (`docs/STUDIO-PERSONAGGI.md`,
   sezione 11, «Cosa deve avere un GLB di Tancredi»): piedi sull'origine, sguardo verso +Z;
   materiali chiamati `maglia`, `maglia2`, `pantaloncini`, `calzettoni`, `scarpe` per i colori di
   squadra; clip chiamate `idle`, `run`, `kick`; texture dentro il file, lato massimo 2048. Riferimento per i triangoli: 5.736 a giocatore, mediana dei prototipi.

In una chat cloud: prima `pip install bpy==5.2.3`, poi la stessa richiesta del punto 2; il tempo di
installazione si paga a ogni chat nuova.

Prova senza Blender, in qualunque chat: `crea un calciatore low-poly alto 1,80 con lowpoly-humanoid`
dà il corpo in GLB in pochi secondi, da guardare in three.js.
