# Provenienza delle skill (copiate il 26/10/2026, licenza MIT per tutte)

Le skill stanno nel repository e non in `~/.claude/skills`, perché il contenitore di una chat cloud
si cancella a fine sessione: una skill installata con `-g` sparisce alla chat dopo.

| Cartelle | Repository | Commit |
|---|---|---|
| `threejs-*` (13) | https://github.com/CloudAI-X/threejs-skills | `0e18186` |
| `blender-image-to-3d` | https://github.com/majidmanzarpour/blender-game-skills | `f0ef293` |
| `blender-*` (22, tranne quelle con prefisso `cc-`) | https://github.com/cs68614-hash/blender-skills | `5017e60` |
| le 30 di `plugin/skills`; `cc-blender-animation` e `cc-blender-rendering` rinominate perché il nome c'era già | https://github.com/RobLe3/cc-blender-skill | `a2634b5` |
| `lowpoly-humanoid` (lo `SKILL.md` della radice con `lpm.py`, `hand.py`, `check_lpm.py`, `view_lpm.py`, `view_closeup.py`), `humanoid-rig-animation` | https://github.com/HUNGPHAM789/claude-blender-lowpoly-humanoid | `dd245b0` |

Per aggiornarne una: clonare il repository, ricopiare la cartella, cambiare il commit qui sopra.
