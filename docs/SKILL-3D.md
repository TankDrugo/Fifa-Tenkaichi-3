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
- Blender: lo scaricamento del binario 4.2 da download.blender.org è stato bloccato dal controllo
  dei permessi della chat. La strada già misurata è `pip install bpy==5.2.3` (5 min 45 s, 1 GB,
  `docs/STUDIO-PERSONAGGI.md:432`); le skill chiamano `blender --background --python`, quindi con
  il modulo `bpy` gli script vanno lanciati con `python3` e gli argomenti dopo `--` vanno
  controllati script per script. Non provato.

## Come provare a creare un giocatore

Sul PC di Tancredi (Blender installato, Claude Code aperto nella cartella del repository):

1. Mettere l'immagine nel repository o allegarla in chat, per esempio `ref/attaccante.png`.
2. Scrivere: `/blender-image-to-3d ref/attaccante.png calciatore 1,80 m, riggato, clip idle/run/kick/pass, GLB per three.js`.
   La skill procede a fasi (silhouette, forme, dettagli, rig, clip, export) e a ogni fase mostra un
   confronto tra la resa e l'immagine dalla stessa telecamera.
3. Per aggiungere clip a un GLB che c'è già:
   `usa blender-character-rigging e blender-animation: rig Rigify su <file>.glb, clip run, kick, pass, esporta GLB`.
4. Da aggiungere alla richiesta, perché il gioco lo legge così (`docs/STUDIO-PERSONAGGI.md:480-485`):
   piedi sull'origine, sguardo verso +Z; materiali chiamati `maglia`, `maglia2`, `pantaloncini`,
   `calzettoni`, `scarpe` per i colori di squadra; ossa con i nomi di Mixamo; texture dentro il
   file, lato massimo 2048. Riferimento per i triangoli: 5.736 a giocatore, mediana dei prototipi.

In una chat cloud: prima `pip install bpy==5.2.3`, poi la stessa richiesta del punto 2; il tempo di
installazione si paga a ogni chat nuova.

Prova senza Blender, in qualunque chat: `crea un calciatore low-poly alto 1,80 con lowpoly-humanoid`
dà il corpo in GLB in pochi secondi, da guardare in three.js.
