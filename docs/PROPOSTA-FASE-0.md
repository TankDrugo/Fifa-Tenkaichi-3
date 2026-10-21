# Proposta di modifiche a `CLAUDE.md` e `README.md` per il gioco nuovo (fase 0, 21/10/2026)

`docs/PIANO-3D-ONLINE.md`, sezione 5, fase 0, chiede una proposta di modifiche a `CLAUDE.md` e
`README.md` per il gioco nuovo, da far approvare a Tancredi. I due file non sono stati toccati:
il testo da aggiungere è qui sotto. Con il suo sì, la chat successiva lo copia nei due file e
cancella questo.

## 1. Da aggiungere a `CLAUDE.md`, dopo «Working on the game»

`CLAUDE.md` è in inglese per le chat (`CLAUDE.md`, «Language»), quindi la proposta è in inglese.

```markdown
## Working on the new game (docs/PIANO-3D-ONLINE.md)

- **Where**: `apps/web` (Next.js: pages, API, later the 3D scene), `apps/realtime` (matches over
  WebSocket), `packages/shared` (zod schemas shared by client and server), `packages/sim` from
  phase 1, `infra/` (Docker). `web/` is the old game and is never edited for the new one.
- **Checks before every push**, all from the repository root, all must pass (CI runs the same,
  `.github/workflows/ci.yml`): `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test`, `pnpm build`.
- **Running the stack**: `cd infra && docker compose up --build`, then
  `node infra/check-status.mjs` (exit 0 = the four services and the WebSocket answer) and
  http://localhost:3000/status. In a cloud chat Docker needs `dockerd` started first; when the
  session does not allow it, say so and run the services as child processes of one script
  (the container has Redis 7.0 and Postgres 16, which runs as the `postgres` user), then stop them.
- **Versions** are exact in every `package.json` and in the image tags. A new library comes with
  its reason in `docs/DETTAGLI.md`, section «Gioco nuovo». An image tag must list both `amd64` and
  `arm64` on Docker Hub before it is used: a tag published a few hours ago can have neither.
- **TypeScript**: relative imports carry the `.ts` extension and `erasableSyntaxOnly` is on, so
  plain `node` runs the sources (`node apps/realtime/src/main.ts`), the way `tools/*.js` run today.
- **Interface text** is Italian; code, identifiers and commit messages stay English.
- **Publish**: the pull request merged on `main` is the whole publication of the new game. The
  working link (artifact) is the old game: republish it only when a task changed `web/`.
- **Frames per second** are measured by Tancredi on his laptop: cloud chats render WebGL in
  software. Chats check the draw budget with `renderer.info` (plan, section 4.6).
```

## 2. Da aggiungere a `README.md`

In «Struttura», in fondo alla tabella:

```markdown
| `package.json`, `pnpm-workspace.yaml` | workspace pnpm del gioco nuovo; `web/` ne resta fuori |
| `apps/web` | gioco nuovo, Next.js: pagine, API, pagina di stato `/status` |
| `apps/realtime` | gioco nuovo, server delle partite: `/health` e WebSocket `/ws` |
| `packages/shared` | gioco nuovo, schemi condivisi fra navigatore e server |
| `infra/` | gioco nuovo, `docker-compose.yml` (Postgres, Redis, web, realtime), `check-status.mjs` |
| `.github/workflows/ci.yml` | gioco nuovo, a ogni pull request: tipi, lint, prove, immagini amd64 e arm64, compose |
```

Una sezione nuova dopo «Distribuzione»:

```markdown
## Gioco nuovo (in costruzione)

Piano e fasi in `docs/PIANO-3D-ONLINE.md`, scelte e misure in `docs/DETTAGLI.md`, «Gioco nuovo».
Sul PC, con Docker Desktop avviato:

    cd infra
    docker compose up --build

poi http://localhost:3000/status mostra web, realtime, Postgres e Redis collegati. `Ctrl+C` ferma
tutto; `docker compose down --volumes` cancella anche i dati di prova.
```

## 3. Domanda collegata: il sito del gioco vecchio a ogni merge

`.github/workflows/pages.yml:7-8` ricostruisce il sito a ogni push su `main` e scrive in
`version.json` il commit (`pages.yml:32`); l'exe scarica di nuovo lo zip quando quel valore cambia
(`tools/web_launcher/update.go:67`). Ogni merge del gioco nuovo, che non tocca `web/`, fa quindi
riscaricare a ogni exe lo stesso gioco, una volta per fase.

Le due strade:

- un filtro `paths: [web/**, .github/workflows/pages.yml]` in `pages.yml`: il sito si ricostruisce
  solo quando cambia il gioco vecchio; cambia il file che pubblica il gioco attuale, che la sezione
  1 del piano lascia com'è, quindi serve il sì di Tancredi;
- lasciare com'è: uno scaricamento in più dello stesso zip per ogni fase, 8 fasi in tutto.

Raccomandazione: il filtro, perché toglie 8 scaricamenti senza cambiare un byte del gioco
pubblicato e si prova con un merge che non tocca `web/` (l'azione «Sito del gioco» non parte).

## 4. Domanda collegata: Docker nelle chat cloud

Il 21/10/2026 il controllo dei permessi della sessione ha rifiutato due volte l'avvio di `dockerd`,
il passo che `docs/PIANO-3D-ONLINE.md` (sezione 6) prescrive. Senza Docker la chat non può
rifare `docker compose up` né le immagini: per la fase 0 quelle prove sono girate su GitHub
Actions (`.github/workflows/ci.yml`), e nella chat la pila è girata senza Docker.

Le regole di permesso di un repository stanno in `.claude/settings.json`, sotto
`permissions.allow`, e valgono per ogni chat dopo il commit. La modifica sarebbe:

```json
"permissions": {
  "allow": ["Bash(dockerd)"]
}
```

accanto agli `hooks` che ci sono già. Dà a ogni chat il permesso di avviare il servizio Docker
del proprio contenitore, e nient'altro. Raccomandazione: aggiungerla, perché senza Docker le prove con
le versioni di Postgres (18.6) e Redis (8.10.2) del compose e con le immagini passano solo da
GitHub Actions, con 60-77 s di attesa per giro (misure del 21/10/2026), mentre il contenitore delle
chat ha Postgres 16 e Redis 7; la fase 6 prova le partite online proprio contro quella pila.
